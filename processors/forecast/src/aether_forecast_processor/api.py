"""FastAPI transport for the generic request-driven forecast processor."""

from __future__ import annotations

from forecast_runtime_core import (
    DEFAULT_MAX_REQUEST_BYTES,
    MEDIA_TYPE,
    ProcessorBusyError,
    RuntimeTransportConfig,
)
from forecast_runtime_core import (
    BearerAuthPolicy as SharedBearerAuthPolicy,
)
from forecast_runtime_core import (
    ProcessorRunner as SharedProcessorRunner,
)
from forecast_runtime_core import (
    create_app as create_runtime_app,
)
from forecast_runtime_core import (
    create_router as create_runtime_router,
)
from forecast_runtime_core import (
    install_routes as install_runtime_routes,
)
from forecast_runtime_core.models import (
    DataProcessingRequest,
    ProcessingError,
    ProcessingResult,
)
from forecast_runtime_core.processor import ForecastProcessor
from forecast_runtime_core.processor_common import ProcessorRequestError

_CONFIG = RuntimeTransportConfig(
    token_env="AETHER_FORECAST_BEARER_TOKEN",
    require_auth_env="AETHER_FORECAST_REQUIRE_AUTH",
    max_concurrency_env="AETHER_FORECAST_MAX_CONCURRENCY",
    thread_name_prefix="aether-forecast",
    state_attr="aether_forecast_runner",
    duplicate_install_message="Aether forecast routes are already installed",
    app_title="Aether Forecast Processor",
)


class BearerAuthPolicy(SharedBearerAuthPolicy):
    """Local convenience wrapper whose ``from_env`` reads the package config."""

    @classmethod
    def from_env(cls) -> BearerAuthPolicy:
        """Build the policy from the package config."""
        return super().from_env(_CONFIG)


class ProcessorRunner(SharedProcessorRunner):
    """Concurrency runner bound to the package config."""

    def __init__(self, max_concurrency: int = 1) -> None:
        """Store the concurrency limit."""
        super().__init__(
            max_concurrency=max_concurrency,
            thread_name_prefix=_CONFIG.thread_name_prefix,
        )


def create_router(
    processor: ForecastProcessor,
    *,
    runner: ProcessorRunner | None = None,
):
    """Create the forecast process and health router."""
    return create_runtime_router(
        processor=processor,
        request_model=DataProcessingRequest,
        response_model=ProcessingResult,
        error_model=ProcessingError,
        processor_request_error_type=ProcessorRequestError,
        config=_CONFIG,
        runner=runner,
    )


def install_routes(
    app,
    *,
    processor: ForecastProcessor,
    max_request_bytes: int = DEFAULT_MAX_REQUEST_BYTES,
    max_processor_concurrency: int | None = None,
    auth_policy=None,
    include_health_alias: bool = False,
) -> None:
    """Install forecast routes on an app."""
    install_runtime_routes(
        app,
        processor=processor,
        request_model=DataProcessingRequest,
        response_model=ProcessingResult,
        error_model=ProcessingError,
        processor_request_error_type=ProcessorRequestError,
        config=_CONFIG,
        max_request_bytes=max_request_bytes,
        max_processor_concurrency=max_processor_concurrency,
        auth_policy=auth_policy,
        include_health_alias=include_health_alias,
    )


def create_app(
    *,
    processor: ForecastProcessor,
    max_request_bytes: int = DEFAULT_MAX_REQUEST_BYTES,
    max_processor_concurrency: int | None = None,
    auth_policy=None,
):
    """Create a FastAPI app with forecast routes."""
    return create_runtime_app(
        processor=processor,
        request_model=DataProcessingRequest,
        response_model=ProcessingResult,
        error_model=ProcessingError,
        processor_request_error_type=ProcessorRequestError,
        config=_CONFIG,
        max_request_bytes=max_request_bytes,
        max_processor_concurrency=max_processor_concurrency,
        auth_policy=auth_policy,
    )


__all__ = [
    "MEDIA_TYPE",
    "BearerAuthPolicy",
    "ProcessorBusyError",
    "ProcessorRunner",
    "create_app",
    "create_router",
    "install_routes",
]
