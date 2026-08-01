# AetherEMS

**Product site:** [aetheriot.ai](https://aetheriot.ai/) ·
**Developer site:** [aetheriot.dev](https://aetheriot.dev/)

AetherEMS is the official energy-management implementation and distribution for
the industry-neutral [AetherEdge](https://github.com/EvanL1/AetherEdge) edge
kernel and SDK. This repository owns the Energy Pack, its fail-safe composition,
optional Console and processors, commissioning examples, and downstream release
evidence. It does not contain or fork the AetherEdge kernel.

The upstream Rust crates and CLI currently retain their `aether-*` and `aether`
names for API compatibility; `AetherEdge` is the repository and product identity.

> **New to AetherIoT?** Start with the
> [AetherEdge safe commissioning journey](https://docs.aetheriot.dev/overview/user-journeys/):
> install a safe-empty runtime and prove its read-only data path before adding
> this energy-domain distribution.

> **Migration status:** this repository is independently versioned and has no
> local path dependency on AetherEdge. AetherEdge reset its release baseline to
> `0.0.1` and withdrew its `v0.5.0` signed release, so development is pinned to
> one immutable AetherEdge Git commit again. AetherEMS releases remain blocked
> by ADR-0001 during this bootstrap window.

## Product journey

When matching signed AetherEdge and AetherEMS artifacts are published, the
operator journey is deliberately incremental:

```text
install a safe-empty AetherEdge runtime
  -> establish operator identity
  -> install the verified Energy Pack without commissioning it
  -> create disabled site channels, equipment models, and mappings
  -> prove live energy data, quality, freshness, and history
  -> deploy the optional Console or forecasting processor when required
  -> review and explicitly commission behavior
  -> audit, observe, and revise
```

Pack installation never connects hardware or enables a channel, rule, task, or
control binding. Prove the read-only path from field device through AetherEdge
to `aether-api:6005` before introducing control. Remote clients, including the
Console, use that authenticated application gateway rather than internal
services, SHM, or SQLite. Forecasting remains an optional request-driven
processor and never becomes live-state authority.

There is no released AetherEMS installer during the current bootstrap window.
Contributors can validate the composition, Pack, Console, and processor from
source, but those workflows are not a substitute for a signed product release.

## Repository boundary

```text
AetherEdge release / SDK
        |
        v
AetherEMS composition + Energy Pack + Console
        |
        v
site commissioning (addresses, credentials, routing, enablement)
```

- `packs/energy/` contains declarative models, knowledge, mappings, rules,
  evaluations, data-processing tasks, and disabled commissioning examples.
- `crates/aetherems-composition/` proves the Pack layers over the public AetherEdge
  SDK without Redis, PostgreSQL, field hardware, or enabled control.
- `processors/load-forecasting/` owns the optional energy-domain forecasting
  processor; it is disabled by default and has explicit production cutover
  blockers.
- `console/` owns the optional AetherEMS operator Web UI. It consumes published
  AetherEdge HTTP contracts and is not part of the AetherEdge kernel.
- `distribution/runtime-io-features.txt` is the feature authority used when
  selecting the compatible AetherEdge runtime artifact.
- `distribution/aetheriot-dependency.toml` is the single AetherEdge version/source
  authority.

Kernel services, protocol implementations, SHM code, and generic CLI code
belong to AetherEdge and are forbidden here.

## Development

Repository checks and internal Console and processor build instructions live in
[CONTRIBUTING.md](CONTRIBUTING.md). They are contributor workflows, not an AetherEMS product
installation path.

The executable is a deterministic composition proof. It does not start
Aether's six production services or commission a device.

## Build the Pack artifact

Pack artifacts must be built by a released AetherEdge CLI against the matching
runtime manifest:

```bash
AETHER_CLI=/opt/aether/bin/aether \
AETHER_RUNTIME_MANIFEST=/opt/aether/config/runtime-manifest.json \
  ./scripts/build-pack-artifact.sh release/energy.bundle
```

The script intentionally has no Cargo/path fallback into a neighboring
AetherEdge checkout.

## Safety

All bundled channels, instances, rules, and data-processing bindings remain
disabled until explicit site commissioning. Device control stays deny-by-
default and must pass the AetherEdge permission, confirmation, safety, and audit
boundaries.

## License

MIT OR Apache-2.0.
