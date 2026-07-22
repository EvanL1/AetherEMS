# ADR-0001: Keep AetherEMS as an independent downstream distribution

## Status

Accepted. The bootstrap boundary was completed by the signed AetherEdge `v0.5.0`
source, runtime, and CLI release.

## Context

The original integration workspace contained the AetherIot kernel and the
AetherEMS Energy Pack in one Git repository. Adding a second remote to that
workspace would copy the same source graph and would not establish a downstream
distribution boundary.

The AetherEdge workspace crates are implementation units that cannot be used
independently. Publishing each crate to a registry would expose unsupported
package-level APIs and would still require consumers to assemble the correct
combination themselves. AetherEMS needs one reproducible SDK entry point plus
verifiable runtime and CLI artifacts.

## Decision

1. This repository owns only the Energy Pack, energy composition, EMS operator
   console, commissioning examples, and downstream CI/release metadata.
2. Kernel packages, services, extensions, protocol implementations, SHM code,
   and generic CLI code remain exclusively in `EvanL1/AetherIot`.
3. `distribution/aetheriot-dependency.toml` is the sole AetherIot dependency
   authority.
4. Cargo consumes only the `aether-edge-sdk` façade from the exact commit behind
   a signed AetherEdge source release. The façade may expose supported composition
   features such as `local-runtime`; AetherEMS must not depend directly on the
   implementation crates behind it.
5. Local paths, moving branches, floating tags, and registry publication of the
   internal crate graph are not release mechanisms.
6. Every AetherEMS build records the upstream tag and commit plus the signed
   source, runtime, CLI, manifest, and provenance asset digests. CI verifies
   those records against the public release before accepting downstream code.

The extraction source was AetherIot integration commit
`25a75263da04ea352124814cbf95826f12e63032`. Pack assets were copied from the
working extraction snapshot; the new repository's initial commit is their new
distribution authority.

The legacy EMS Web UI was subsequently moved intact from the same pinned
AetherIot source commit into `console/`. Its package identity, CI, and release
ownership now belong exclusively to AetherEMS.

## Consequences

- AetherEMS can evolve and release independently without copying Kernel source.
- The product-specific console evolves with AetherEMS rather than adding a
  Node/Vue/nginx toolchain to the headless AetherIot kernel.
- AetherEMS has one supported Rust integration surface while AetherEdge retains
  freedom to refactor its internal crate graph.
- The immutable Git revision is part of a signed source release, not an
  unversioned bootstrap snapshot.
- Local development may keep an AetherIot checkout next to this repository, but
  committed manifests and CI never depend on that path.
