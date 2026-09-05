"""Generic forecast processing orchestration with fail-closed result semantics.

The processor owns no load/PV/energy knowledge. Every task-specific decision
comes from the injected :class:`~forecast_runtime_core.spec.ForecastTaskSpec`;
the engine only turns governed rows into a forecast result.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from itertools import pairwise
from typing import Any

from .backend import (
    ArtifactProvenance,
    EngineForecast,
    ForecastBackend,
    ForecastContext,
)
from .models import (
    FORECAST_CONTRACT,
    FORECAST_OUTPUT_SCHEMA,
    RESULT_SCHEMA,
    ArtifactProvenanceModel,
    DataProcessingRequest,
    FallbackDescriptor,
    ForecastOutput,
    ForecastPoint,
    ProcessingResult,
    ProcessorDescriptor,
    QuantileValue,
    UnavailableDescriptor,
    compute_input_digest,
    format_utc_timestamp,
    normalize_utc_timestamp,
    parse_utc_timestamp,
)
from .processor_common import (
    frame_error,
    validate_artifact_match,
    verify_deadline,
    verify_digest,
)
from .results import ResultEnvelopeBuilder, ResultModelBundle, ResultSemantics
from .spec import ForecastTaskSpec, validate_frame

UTC = timezone.utc


class ForecastProcessor:
    """Validate a frame, invoke an engine, and label outcomes."""

    def __init__(self, spec: ForecastTaskSpec, engine: ForecastBackend) -> None:
        """Store the task spec and pluggable engine."""
        self.spec = spec
        self._engine = engine
        self._results = ResultEnvelopeBuilder(
            models=ResultModelBundle(
                forecast_output_schema=FORECAST_OUTPUT_SCHEMA,
                result_schema=RESULT_SCHEMA,
                processor_contract=FORECAST_CONTRACT,
                artifact_model_type=ArtifactProvenanceModel,
                fallback_descriptor_type=FallbackDescriptor,
                forecast_output_type=ForecastOutput,
                forecast_point_type=ForecastPoint,
                processing_result_type=ProcessingResult,
                processor_descriptor_type=ProcessorDescriptor,
                quantile_value_type=QuantileValue,
                unavailable_descriptor_type=UnavailableDescriptor,
            ),
            semantics=ResultSemantics(
                target=spec.target.name,
                unit=spec.target.unit,
                sign_convention=spec.target.sign_convention,
                persistence_source_feature=spec.persistence_source_feature,
            ),
            policy=spec,
            format_utc_timestamp=format_utc_timestamp,
            normalize_utc_timestamp=normalize_utc_timestamp,
        )

    @property
    def policy(self) -> ForecastTaskSpec:
        """Compatibility alias: the task spec is the processor policy."""
        return self.spec

    def is_ready(self) -> bool:
        """Use a readiness seam when present; simple engines are ready."""
        readiness = getattr(self._engine, "is_ready", None)
        if readiness is None:
            return True
        try:
            return readiness() is True
        except Exception:
            return False

    def process(self, request: DataProcessingRequest) -> ProcessingResult:
        """Validate, invoke the engine, and label the outcome."""
        verify_digest(request, compute_input_digest)
        verify_deadline(
            request, parse_utc_timestamp, now_fn=lambda: datetime.now(UTC)
        )
        validate_frame(request, self.spec)
        history_data = self._segment_rows(
            request.frame.history.timestamps, request.frame.history.features
        )
        future = request.frame.future_covariates
        if future is None:  # validate_frame above keeps this branch defensive.
            frame_error(request, "future covariates are required")
        forecast_data = self._segment_rows(
            future.timestamps, future.features, future=True
        )
        context = ForecastContext(
            request_id=request.request_id,
            binding_id=request.binding.id,
            as_of=request.frame.as_of,
            cadence_seconds=request.frame.cadence_seconds,
            horizon_steps=request.options.horizon_steps,
            artifact_kind=request.artifact.kind if request.artifact else None,
            artifact_family=request.artifact.family
            if request.artifact
            else None,
            artifact_version=request.artifact.version
            if request.artifact
            else None,
            quantiles=tuple(request.options.quantiles or ()),
        )
        try:
            forecast = self._engine.forecast(
                history_data=history_data,
                forecast_data=forecast_data,
                context=context,
            )
            points = self._validate_engine_forecast(request, forecast)
            artifact = self._validate_artifact(request, forecast.artifact)
        except Exception:
            engine_succeeded = False
        else:
            engine_succeeded = True
        completed_at = verify_deadline(
            request,
            parse_utc_timestamp,
            now_fn=lambda: datetime.now(UTC),
        )
        if engine_succeeded:
            return self._results.produced(
                request, points, artifact, issued_at=completed_at
            )
        if self.spec.allow_persistence_fallback:
            return self._persistence_fallback(
                request, history_data, issued_at=completed_at
            )
        return self._results.unavailable(
            request,
            "MODEL_RUNTIME_UNAVAILABLE",
            retryable=True,
            issued_at=completed_at,
        )

    def _segment_rows(
        self,
        timestamps: list[str],
        features: dict[str, Any],
        *,
        future: bool = False,
    ) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for index, timestamp in enumerate(timestamps):
            row: dict[str, Any] = {"datetime": timestamp}
            for name, feature in features.items():
                row[name] = feature.values[index]
            if future:
                row[self.spec.target.name] = ""
            rows.append(row)
        return rows

    def _validate_engine_forecast(
        self,
        request: DataProcessingRequest,
        forecast: EngineForecast,
    ) -> list[ForecastPoint]:
        future = request.frame.future_covariates
        if (
            future is None
            or len(forecast.points) != request.options.horizon_steps
        ):
            raise ValueError("engine returned the wrong point count")
        points: list[ForecastPoint] = []
        expected_quantiles = tuple(request.options.quantiles or ())
        for expected_timestamp, point in zip(
            future.timestamps, forecast.points, strict=True
        ):
            if point.timestamp != expected_timestamp or not math.isfinite(
                point.value
            ):
                raise ValueError("engine returned invalid point correlation")
            probabilities = tuple(
                quantile.probability for quantile in point.quantiles
            )
            if probabilities != expected_quantiles:
                raise ValueError("engine returned the wrong quantiles")
            values = [quantile.value for quantile in point.quantiles]
            if any(not math.isfinite(value) for value in values):
                raise ValueError("engine returned a non-finite quantile")
            if any(left > right for left, right in pairwise(values)):
                raise ValueError("engine returned crossing quantiles")
            points.append(
                self._results.point(
                    timestamp=point.timestamp,
                    value=point.value,
                    quantiles=(
                        [
                            QuantileValue(
                                probability=item.probability, value=item.value
                            )
                            for item in point.quantiles
                        ]
                        or None
                    ),
                )
            )
        return points

    @staticmethod
    def _validate_artifact(
        request: DataProcessingRequest, artifact: ArtifactProvenance | None
    ) -> ArtifactProvenanceModel | None:
        return validate_artifact_match(
            request, artifact, ArtifactProvenanceModel
        )

    def _persistence_fallback(
        self,
        request: DataProcessingRequest,
        history_data: list[dict[str, Any]],
        *,
        issued_at: datetime,
    ) -> ProcessingResult:
        last_value = history_data[-1][self.spec.persistence_source_feature]
        if isinstance(last_value, bool) or not isinstance(
            last_value, (int, float)
        ):
            return self._results.unavailable(
                request,
                "INSUFFICIENT_HISTORY",
                retryable=True,
                issued_at=issued_at,
            )
        future = request.frame.future_covariates
        if future is None:
            return self._results.unavailable(
                request,
                "INSUFFICIENT_HISTORY",
                retryable=True,
                issued_at=issued_at,
            )
        points = [
            self._results.point(
                timestamp=timestamp,
                value=last_value,
                quantiles=self._results.quantiles(request, last_value),
            )
            for timestamp in future.timestamps
        ]
        return self._results.persistence_fallback(
            request,
            points,
            issued_at=issued_at,
            warnings=["MODEL_FALLBACK_USED"],
        )
