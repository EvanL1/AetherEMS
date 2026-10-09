"""Generic binding-driven composition helpers for forecast processors.

The composition layer selects a pluggable backend for a commissioned
task/binding and hands it, together with the task spec, to the generic
:class:`~forecast_runtime_core.processor.ForecastProcessor`.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from pathlib import Path

from .artifacts import CommissionedArtifactBundle
from .backend import (
    ForecastContext,
    InferenceServiceLike,
    LegacyEdgePlatformForecastBackend,
)
from .processor import ForecastProcessor
from .registry import (
    ForecastBackendRegistry,
    ForecastTaskBackendBinding,
    ForecastTaskBackendBindings,
    create_default_backend_registry,
)
from .spec import ForecastTaskSpec


def create_backend_registry(
    *,
    legacy_inference_service: InferenceServiceLike | None = None,
    legacy_forecast_type: str = "forecast",
    legacy_backend_id: str = "legacy-edge-platform",
    legacy_default_horizons: Mapping[tuple[int, int], str] | None = None,
    legacy_artifact_bundles: Mapping[
        tuple[str, str, str], CommissionedArtifactBundle
    ]
    | None = None,
    legacy_artifact_file_resolver: Callable[
        [ForecastContext], Mapping[str, str | Path]
    ]
    | None = None,
    legacy_readiness_probe: Callable[[], bool] | None = None,
) -> ForecastBackendRegistry:
    """Build a backend registry with optional legacy adapter."""
    registry = create_default_backend_registry()
    if legacy_inference_service is not None:
        registry.register_factory(
            backend_kind="legacy-edge-platform",
            description="Legacy Edge-Platform forecast backend",
            factory=lambda config: LegacyEdgePlatformForecastBackend(
                legacy_inference_service,
                forecast_type=legacy_forecast_type,
                default_horizons=legacy_default_horizons or {},
                backend_id=legacy_backend_id,
                horizon_names=config.get("horizon_names"),
                artifact_bundles=legacy_artifact_bundles,
                artifact_file_resolver=legacy_artifact_file_resolver,
                readiness_probe=legacy_readiness_probe,
            ),
        )
    return registry


def create_processor(
    *,
    spec: ForecastTaskSpec,
    binding: ForecastTaskBackendBinding,
    registry: ForecastBackendRegistry | None = None,
) -> ForecastProcessor:
    """Compose a generic processor from a spec and binding."""
    active_registry = registry or create_default_backend_registry()
    backend = active_registry.create_for_binding(binding)
    return ForecastProcessor(spec=spec, engine=backend)


def create_processor_from_bindings(
    *,
    spec: ForecastTaskSpec,
    binding_id: str,
    backend_bindings: ForecastTaskBackendBindings,
    registry: ForecastBackendRegistry | None = None,
) -> ForecastProcessor:
    """Resolve a binding and compose a processor."""
    selected = backend_bindings.resolve(
        task_id=spec.task_id,
        task_revision=spec.task_revision,
        binding_id=binding_id,
    )
    return create_processor(spec=spec, binding=selected, registry=registry)
