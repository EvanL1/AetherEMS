"""Generic request-driven forecast processor for Aether Data Processing.

This package is a thin deployable wrapper over the shared
``forecast_runtime_core`` layer. It owns no load/PV/energy knowledge: a task is
described by a :class:`~forecast_runtime_core.spec.ForecastTaskSpec` and the
pluggable backend by a :class:`~forecast_runtime_core.backend.ForecastBackend`.
"""

from forecast_runtime_core import (
    DEFAULT_MAX_REQUEST_BYTES,
    MEDIA_TYPE,
    BearerAuthPolicy,
    DataProcessingJSONResponse,
    ForecastProcessor,
    ForecastTaskSpec,
    create_backend_registry,
    create_processor,
    create_processor_from_bindings,
)
from forecast_runtime_core import (
    ProcessorRunner as SharedProcessorRunner,
)

from .api import (
    ProcessorRunner,
    create_app,
    create_router,
    install_routes,
)
from .composition import (
    BACKEND_BINDINGS_ENV,
    create_processor_from_env,
    load_backend_bindings_from_env,
)

__all__ = [
    "BACKEND_BINDINGS_ENV",
    "DEFAULT_MAX_REQUEST_BYTES",
    "MEDIA_TYPE",
    "BearerAuthPolicy",
    "DataProcessingJSONResponse",
    "ForecastProcessor",
    "ForecastTaskSpec",
    "ProcessorRunner",
    "SharedProcessorRunner",
    "create_app",
    "create_backend_registry",
    "create_processor",
    "create_processor_from_bindings",
    "create_processor_from_env",
    "create_router",
    "install_routes",
    "load_backend_bindings_from_env",
]
