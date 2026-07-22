# AetherEMS

AetherEMS is the official energy-management implementation and distribution for
the [AetherEdge](https://github.com/EvanL1/AetherEdge) edge kernel and SDK. This repository owns
the Energy Pack, its fail-safe composition, commissioning examples, and
downstream release evidence. It does not contain or fork the AetherEdge kernel.

The upstream Rust crates and CLI currently retain their `aether-*` and `aether`
names for API compatibility; `AetherEdge` is the repository and product identity.

> **Release status:** this repository is independently versioned and has no
> local path or direct implementation-crate dependency on AetherEdge. It consumes
> the single `aether-edge-sdk` façade from the exact signed AetherEdge `v0.5.0`
> source release. Runtime, CLI, source, checksums, and provenance are recorded in
> the downstream dependency authority described by ADR-0001.

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
