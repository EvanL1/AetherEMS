"""Declarative forecast task specification and governed frame validation.

A ``ForecastTaskSpec`` replaces the per-domain processor classes. Load, PV, or
any future forecast task is a data object describing its target, features,
units, validation ranges, calendar transforms, and policy. The generic
processor and the validator below own no domain knowledge.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from .models import parse_utc_timestamp
from .processor_common import frame_error

QUARTER_HOUR_OF_DAY = "quarter_hour_of_day_zero_based"
_CALENDAR_TRANSFORMS = {QUARTER_HOUR_OF_DAY}
_NON_CALENDAR_SOURCE_KINDS = {
    "history",
    "live",
    "history_and_live",
    "covariate",
    "constant",
}


@dataclass(frozen=True, slots=True)
class FeatureRange:
    """Validation range for a numeric feature."""

    minimum: float | None = None
    maximum: float | None = None
    maximum_exclusive: float | None = None
    integer: bool = False

    def __post_init__(self) -> None:
        """Validate the range bounds."""
        if (
            self.minimum is not None
            and self.maximum is not None
            and self.minimum > self.maximum
        ):
            raise ValueError("feature range minimum must not exceed maximum")
        if (
            self.maximum is not None
            and self.maximum_exclusive is not None
            and self.maximum_exclusive <= self.maximum
        ):
            raise ValueError(
                "exclusive maximum must be above inclusive maximum"
            )


@dataclass(frozen=True, slots=True)
class FeatureSpec:
    """Declared schema and validation rules for a feature."""

    name: str
    unit: str
    value_type: str = "number"
    value_range: FeatureRange | None = None
    calendar_transform: str | None = None
    provenance_kind: str | None = None

    def __post_init__(self) -> None:
        """Validate the feature declaration."""
        if not self.name.strip():
            raise ValueError("feature name must not be empty")
        if not self.unit.strip():
            raise ValueError("feature unit must not be empty")
        if self.value_type != "number":
            raise ValueError(
                "forecast task specs only support numeric features"
            )
        if self.calendar_transform not in (None, *sorted(_CALENDAR_TRANSFORMS)):
            raise ValueError(
                f"unsupported calendar transform: {self.calendar_transform}"
            )
        if (
            self.provenance_kind is not None
            and self.provenance_kind not in _NON_CALENDAR_SOURCE_KINDS
        ):
            raise ValueError(
                f"unsupported provenance kind: {self.provenance_kind}"
            )


@dataclass(frozen=True, slots=True)
class ForecastTargetSpec:
    """Identity and semantics of the forecast target."""

    name: str
    unit: str
    sign_convention: str
    semantic_point: str | None = None

    def __post_init__(self) -> None:
        """Validate the target declaration."""
        if not self.name.strip():
            raise ValueError("target name must not be empty")
        if not self.unit.strip():
            raise ValueError("target unit must not be empty")
        if not self.sign_convention.strip():
            raise ValueError("target sign_convention must not be empty")


@dataclass(frozen=True, slots=True)
class ForecastTaskSpec:
    """Declarative description of a commissioned forecast task."""

    task_id: str
    task_revision: int
    processor_id: str
    processor_version: str
    target: ForecastTargetSpec
    artifact_family: str
    cadence_seconds: int
    history_steps: int
    max_horizon_steps: int
    history_features: tuple[FeatureSpec, ...]
    future_features: tuple[FeatureSpec, ...]
    persistence_source_feature: str
    artifact_kind: str = "model"
    max_input_age_seconds: int = 900
    produced_ttl_seconds: int = 3600
    fallback_ttl_seconds: int = 1800
    retry_after_seconds: int = 900
    allow_persistence_fallback: bool = False
    require_future_covariates: bool = True

    def __post_init__(self) -> None:
        """Validate the task spec."""
        if not self.task_id.strip():
            raise ValueError("task_id must not be empty")
        if self.task_revision <= 0:
            raise ValueError("task_revision must be positive")
        if not self.processor_id.strip() or not self.processor_version.strip():
            raise ValueError("processor identity must not be empty")
        if not self.artifact_family.strip():
            raise ValueError("artifact_family must not be empty")
        if not self.persistence_source_feature.strip():
            raise ValueError("persistence_source_feature must not be empty")
        if any(
            value <= 0
            for value in (
                self.cadence_seconds,
                self.history_steps,
                self.max_horizon_steps,
                self.max_input_age_seconds,
                self.produced_ttl_seconds,
                self.fallback_ttl_seconds,
                self.retry_after_seconds,
            )
        ):
            raise ValueError("task spec limits must be positive")
        if not self.history_features or not self.future_features:
            raise ValueError(
                "task spec must declare history and future features"
            )
        history_names = {feature.name for feature in self.history_features}
        if self.target.name not in history_names:
            raise ValueError(
                "the forecast target must be declared as a history feature"
            )
        if any(
            feature.name == self.target.name for feature in self.future_features
        ):
            raise ValueError(
                "the forecast target must not appear as a future feature"
            )
        if self.persistence_source_feature not in history_names:
            raise ValueError(
                "persistence source feature must be a declared history feature"
            )

    @property
    def history_feature_map(self) -> dict[str, FeatureSpec]:
        """Return history features keyed by name."""
        return {feature.name: feature for feature in self.history_features}

    @property
    def future_feature_map(self) -> dict[str, FeatureSpec]:
        """Return future features keyed by name."""
        return {feature.name: feature for feature in self.future_features}


def _feature_specs_to_map(
    specs: tuple[FeatureSpec, ...],
    segment: str,
    request: Any,
) -> dict[str, FeatureSpec]:
    if len({feature.name for feature in specs}) != len(specs):
        frame_error(
            request, f"{segment} task spec declares a duplicate feature"
        )
    return {feature.name: feature for feature in specs}


def validate_frame(request: Any, spec: ForecastTaskSpec) -> None:
    """Validate a request frame against a forecast task spec (fail closed)."""
    if (
        request.task.id != spec.task_id
        or request.task.revision != spec.task_revision
    ):
        frame_error(request, "task is not supported by this processor")
    if request.frame.cadence_seconds != spec.cadence_seconds:
        frame_error(request, "frame cadence is not supported")
    if request.artifact is not None and (
        request.artifact.kind != spec.artifact_kind
        or request.artifact.family != spec.artifact_family
    ):
        frame_error(request, "artifact selector is not supported")
    if (
        request.frame.future_covariates is None
        and spec.require_future_covariates
    ):
        frame_error(request, "future covariates are required")
    if len(request.frame.history.timestamps) != spec.history_steps:
        frame_error(
            request, "history length does not match the commissioned task"
        )
    if request.options.horizon_steps > spec.max_horizon_steps:
        frame_error(request, "forecast horizon exceeds the commissioned task")
    if request.frame.static_features:
        frame_error(
            request, "static features are not declared for this task revision"
        )

    expected_history = _feature_specs_to_map(
        spec.history_features, "history", request
    )
    expected_future = _feature_specs_to_map(
        spec.future_features, "future_covariates", request
    )
    _validate_feature_segment(
        request, request.frame.history, expected_history, "history", spec
    )
    future = request.frame.future_covariates
    if future is not None:
        _validate_feature_segment(
            request, future, expected_future, "future_covariates", spec
        )
        if len(future.timestamps) != request.options.horizon_steps:
            frame_error(request, "future horizon does not match horizon_steps")

    if request.frame.quality.missing_ratio != 0.0:
        frame_error(
            request, "required model inputs must not contain missing samples"
        )
    if (
        request.frame.quality.max_gap_seconds
        > 2 * request.frame.cadence_seconds
    ):
        frame_error(request, "frame max gap exceeds the commissioned task")

    _validate_provenance(request, spec)


def _validate_feature_segment(
    request: Any,
    segment: Any,
    expected: dict[str, FeatureSpec],
    segment_name: str,
    spec: ForecastTaskSpec,
) -> None:
    features = segment.features
    if set(features) != set(expected):
        frame_error(
            request, f"{segment_name} feature set does not match the task"
        )
    for name, feature_spec in expected.items():
        feature = features[name]
        if (
            feature.value_type != feature_spec.value_type
            or feature.unit != feature_spec.unit
        ):
            frame_error(
                request, f"{segment_name}.{name} has an invalid type or unit"
            )
        if any(
            value is None or quality == "missing"
            for value, quality in zip(
                feature.values, feature.quality, strict=True
            )
        ):
            frame_error(
                request, f"{segment_name}.{name} contains a missing sample"
            )
        _validate_feature_values(
            request, segment_name, name, feature.values, feature_spec
        )
        if feature_spec.calendar_transform is not None:
            _validate_calendar_values(
                request,
                segment_name,
                name,
                segment.timestamps,
                feature.values,
                feature_spec.calendar_transform,
            )


def _validate_feature_values(
    request: Any,
    segment_name: str,
    name: str,
    values: list[Any],
    feature_spec: FeatureSpec,
) -> None:
    value_range = feature_spec.value_range
    if value_range is None:
        return
    for value in values:
        if value_range.minimum is not None and value < value_range.minimum:
            frame_error(request, f"{segment_name}.{name} is below its minimum")
        if value_range.maximum is not None and value > value_range.maximum:
            frame_error(request, f"{segment_name}.{name} is above its maximum")
        if (
            value_range.maximum_exclusive is not None
            and value >= value_range.maximum_exclusive
        ):
            frame_error(
                request,
                f"{segment_name}.{name} is outside its exclusive maximum",
            )
        if value_range.integer and not float(value).is_integer():
            frame_error(request, f"{segment_name}.{name} must be an integer")


def _validate_calendar_values(
    request: Any,
    segment_name: str,
    name: str,
    timestamps: list[str],
    values: list[Any],
    transform: str,
) -> None:
    for timestamp, value in zip(timestamps, values, strict=True):
        instant = parse_utc_timestamp(timestamp)
        if transform == QUARTER_HOUR_OF_DAY:
            expected = instant.hour * 4 + instant.minute // 15
            aligned = (
                instant.minute % 15 == 0
                and instant.second == 0
                and instant.microsecond == 0
            )
            if not aligned or value != expected:
                frame_error(
                    request,
                    f"{segment_name}.{name} does not match its UTC timestamp",
                )
        else:  # pragma: no cover - guarded by FeatureSpec.__post_init__
            frame_error(
                request,
                f"{segment_name}.{name} uses an unsupported calendar transform",
            )


def _validate_provenance(request: Any, spec: ForecastTaskSpec) -> None:
    provenance = {
        (entry.segment, entry.feature): entry
        for entry in request.frame.provenance
    }
    as_of = parse_utc_timestamp(request.frame.as_of)

    history_map = spec.history_feature_map
    future_map = spec.future_feature_map
    if any(
        entry.segment == "future_covariates"
        and entry.source_kind not in {"calendar", "constant"}
        and entry.issued_at is None
        for entry in request.frame.provenance
    ):
        frame_error(request, "future covariates require issue-time provenance")
    if any(
        as_of - parse_utc_timestamp(entry.watermark)
        > timedelta(seconds=spec.max_input_age_seconds)
        for entry in request.frame.provenance
        if entry.source_kind not in {"calendar", "constant"}
    ):
        frame_error(request, "a required input source is stale")

    for segment_name, feature_map in (
        ("history", history_map),
        ("future_covariates", future_map),
    ):
        for name, feature_spec in feature_map.items():
            entry = provenance[(segment_name, name)]
            source_kind = entry.source_kind
            if feature_spec.calendar_transform is not None:
                if source_kind != "calendar":
                    frame_error(
                        request,
                        "calendar feature provenance does not match the task",
                    )
            elif feature_spec.provenance_kind is not None:
                if source_kind != feature_spec.provenance_kind:
                    frame_error(
                        request,
                        "feature provenance does not "
                        "match the commissioned task",
                    )
            elif source_kind not in _NON_CALENDAR_SOURCE_KINDS:
                frame_error(
                    request,
                    "observed feature provenance does not match the task",
                )
