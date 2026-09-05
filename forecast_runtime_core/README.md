# Forecast Runtime Core

Shared generic forecast runtime for Aether's **generic forecast task
platform**. Classic models, edge ONNX/RKNN runtimes, remote services, and
time-series foundation models all act as **pluggable forecast backends**
behind one contract; the concrete task (target, features, units, policy) is
described by a `ForecastTaskSpec`, not by per-domain code.

## Current layering

```text
ForecastTaskSpec (declarative task data)
        -> ForecastProcessor (generic orchestration)
        -> ForecastBackend (pluggable model adapter)
        -> artifact bundle / remote service
```

## What is implemented

- strict Aether Data Processing v1 wire models (`models.py`);
- the declarative task spec and governed frame validator (`spec.py`);
- the generic processor orchestration (`processor.py`);
- generic binding-driven composition (`composition.py`);
- processor HTTP shell helpers, bearer auth, request-size guard;
- bounded runner/concurrency helpers;
- common request digest and deadline validation;
- common produced/fallback/unavailable result shaping;
- common artifact bundle verification helpers;
- a shared pluggable forecast backend contract;
- a shared legacy Edge-Platform backend adapter;
- a remote HTTP backend sample;
- a foundation-model backend skeleton;
- a Chronos-style remote executor sample.

The deployable entrypoint lives in `processors/forecast`; companion service
artifacts live under `processors/chronos-remote-service` and
`processors/mock-chronos`.

## Shared backend contract

```text
ForecastBackend
  - descriptor()
  - is_ready()
  - forecast(history_data, forecast_data, context)
```

Future backends can be added without cloning a processor:

- legacy Python inference service backend;
- ONNX runtime backend;
- RKNN backend;
- remote foundation-model backend;
- local time-series foundation-model sidecar backend.

The task spec owns business semantics (target, features, units, ranges, policy);
the backend only owns how to turn governed rows into a forecast result.

## What this layer must not own

- load/PV-specific feature names;
- domain task semantics;
- model-family-specific tensor/token layouts;
- framework-specific mandatory dependencies;
- direct Aether SHM/history/config access;
- device-control authority.

Domain knowledge lives in domain packs (for example `packs/energy/...` task
YAML and fixtures), never in this shared runtime.
