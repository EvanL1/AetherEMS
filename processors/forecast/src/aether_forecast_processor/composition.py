"""Environment-driven composition for the generic forecast processor."""

from __future__ import annotations

from forecast_runtime_core import (
    ForecastBackendRegistry,
    ForecastTaskBackendBindings,
    ForecastTaskSpec,
    create_processor_from_bindings,
)

BACKEND_BINDINGS_ENV = "AETHER_FORECAST_BACKEND_BINDINGS"


def load_backend_bindings_from_env(
    *,
    required: bool = False,
) -> ForecastTaskBackendBindings:
    """Load backend bindings from the package environment."""
    return ForecastTaskBackendBindings.from_env(
        BACKEND_BINDINGS_ENV, required=required
    )


def create_processor_from_env(
    *,
    spec: ForecastTaskSpec,
    binding_id: str,
    registry: ForecastBackendRegistry | None = None,
    required_bindings: bool = True,
):
    """Compose a processor from environment bindings."""
    return create_processor_from_bindings(
        spec=spec,
        binding_id=binding_id,
        backend_bindings=load_backend_bindings_from_env(
            required=required_bindings
        ),
        registry=registry,
    )


__all__ = [
    "BACKEND_BINDINGS_ENV",
    "create_processor_from_env",
    "load_backend_bindings_from_env",
]
