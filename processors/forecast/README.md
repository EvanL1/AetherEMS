# Aether Forecast Processor

Generic, request-driven forecast processor for **Aether Data Processing**.

This integration is a thin deployable wrapper over the shared
`forecast_runtime_core` layer. It owns **no domain knowledge** — there is no
load or PV code here. A concrete forecast task is described entirely by a
`ForecastTaskSpec` (target, features, units, validation ranges, policy), and
the model is a pluggable `ForecastBackend`.

## Layering

```text
ForecastTaskSpec (data)
        -> ForecastProcessor (generic orchestration)
        -> ForecastBackend (pluggable model adapter)
        -> artifact bundle / remote service
```

## What is generic

- wire models (`aether.data-processing.forecast.v1`);
- HTTP shell, bearer auth, request-size guard, bounded concurrency;
- digest / deadline / provenance / feature-range / calendar validation;
- produced / fallback / unavailable result shaping;
- pluggable backends: legacy in-process inference, remote HTTP, foundation
  model (Chronos/TSFM-style) via `ForecastBackend`.

## Define a task

A task is a `ForecastTaskSpec` dataclass:

```python
from forecast_runtime_core import (
    FeatureRange,
    FeatureSpec,
    ForecastTargetSpec,
    ForecastTaskSpec,
    QUARTER_HOUR_OF_DAY,
)

spec = ForecastTaskSpec(
    task_id="acme.site-power-forecast",
    task_revision=1,
    processor_id="acme-forecast-edge",
    processor_version="0.1.0",
    target=ForecastTargetSpec(name="power", unit="kW", sign_convention="positive_generation"),
    artifact_family="site-power",
    cadence_seconds=900,
    history_steps=672,
    max_horizon_steps=288,
    history_features=(
        FeatureSpec(name="power", unit="kW"),
        FeatureSpec(name="quarter_hour", unit="1",
                    value_range=FeatureRange(minimum=0, maximum=95, integer=True),
                    calendar_transform=QUARTER_HOUR_OF_DAY),
    ),
    future_features=(
        FeatureSpec(name="quarter_hour", unit="1",
                    value_range=FeatureRange(minimum=0, maximum=95, integer=True),
                    calendar_transform=QUARTER_HOUR_OF_DAY),
    ),
    persistence_source_feature="power",
)
```

Then bind a backend and build the app:

```python
from forecast_runtime_core import (
    ForecastTaskBackendBinding,
    create_backend_registry,
    create_processor,
)

binding = ForecastTaskBackendBinding(
    task_id=spec.task_id,
    task_revision=spec.task_revision,
    binding_id="site-a",
    backend_kind="remote-http",
    backend_config={"base_url": "https://forecast.example", "backend_id": "site-a"},
)
processor = create_processor(spec=spec, binding=binding)

from aether_forecast_processor import create_app
app = create_app(processor=processor)
```

## Environment

| Variable | Meaning |
|---|---|
| `AETHER_FORECAST_BEARER_TOKEN` | optional bearer token (>= 32 chars) |
| `AETHER_FORECAST_REQUIRE_AUTH` | `true`/`false` fail-closed auth switch |
| `AETHER_FORECAST_MAX_CONCURRENCY` | processing slot count |
| `AETHER_FORECAST_BACKEND_BINDINGS` | JSON array of task/binding -> backend rules |

## Related

- `forecast_runtime_core/` — shared processor, spec, backends, transport
- `processors/chronos-remote-service/` — remote foundation-model service
- `processors/mock-chronos/` — local mock Chronos service
