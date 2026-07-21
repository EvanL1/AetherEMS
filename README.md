# AetherEMS

AetherEMS is the official energy-management implementation and distribution for
the [AetherIot](https://github.com/EvanL1/AetherIot) edge kernel and SDK. This repository owns
the Energy Pack, its fail-safe composition, commissioning examples, and
downstream release evidence. It does not contain or fork the AetherIot kernel.

The upstream Rust crates and CLI currently retain their `aether-*` and `aether`
names for API compatibility; `AetherIot` is the repository and product identity.

> **Migration status:** this repository is independently versioned and has no
> local path dependency on AetherIot. Until AetherIot publishes its first signed
> public crate/runtime release, development is pinned to one immutable AetherIot
> Git commit. AetherEMS releases remain blocked by ADR-0001 during this bootstrap
> window.

## Repository boundary

```text
AetherIot release / SDK
        |
        v
AetherEMS composition + Energy Pack + Console
        |
        v
site commissioning (addresses, credentials, routing, enablement)
```

- `packs/energy/` contains declarative models, knowledge, mappings, rules,
  evaluations, data-processing tasks, and disabled commissioning examples.
- `crates/aetherems-composition/` proves the Pack layers over the public AetherIot
  SDK without Redis, PostgreSQL, field hardware, or enabled control.
- `processors/load-forecasting/` owns the optional energy-domain forecasting
  processor; it is disabled by default and has explicit production cutover
  blockers.
- `console/` owns the optional AetherEMS operator Web UI. It consumes published
  AetherIot HTTP contracts and is not part of the AetherIot kernel.
- `distribution/runtime-io-features.txt` is the feature authority used when
  selecting the compatible AetherIot runtime artifact.
- `distribution/aetheriot-dependency.toml` is the single AetherIot version/source
  authority.

Kernel services, protocol implementations, SHM code, and generic CLI code
belong to AetherIot and are forbidden here.

## Development

Repository checks and internal Console and processor build instructions live in
[CONTRIBUTING.md](CONTRIBUTING.md). They are contributor workflows, not an AetherEMS product
installation path.

The executable is a deterministic composition proof. It does not start
Aether's six production services or commission a device.

## Build the Pack artifact

Pack artifacts must be built by a released AetherIot CLI against the matching
runtime manifest:

```bash
AETHER_CLI=/opt/aether/bin/aether \
AETHER_RUNTIME_MANIFEST=/opt/aether/config/runtime-manifest.json \
  ./scripts/build-pack-artifact.sh release/energy.bundle
```

The script intentionally has no Cargo/path fallback into a neighboring Aether
checkout.

## Safety

All bundled channels, instances, rules, and data-processing bindings remain
disabled until explicit site commissioning. Device control stays deny-by-
default and must pass the AetherIot permission, confirmation, safety, and audit
boundaries.

## License

MIT OR Apache-2.0.
