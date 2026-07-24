# ADR-0001: Keep AetherEMS as an independent downstream distribution

## Status

Accepted for repository bootstrap. Public AetherEdge release evidence remains a
release blocker; AetherEdge reset its release baseline to `0.0.1` and withdrew
its `v0.5.0` signed release, so this repository returned to the bootstrap Git
pin.

## Context

The original integration workspace contained the AetherIot kernel and the
AetherEMS Energy Pack in one Git repository. Adding a second remote to that
workspace would copy the same source graph and would not establish a downstream
distribution boundary.

The first AetherEdge public crate/runtime release does not yet exist. Development
still needs a reproducible way to compile the downstream composition while the
external release gate is being closed.

## Decision

1. This repository owns only the Energy Pack, energy composition, EMS operator
   console, commissioning examples, and downstream CI/release metadata.
2. Kernel packages, services, extensions, protocol implementations, SHM code,
   and generic CLI code remain exclusively in `EvanL1/AetherIot`.
3. `distribution/aetheriot-dependency.toml` is the sole AetherIot dependency
   authority.
4. During bootstrap, Cargo may consume the public `aether-edge-sdk` façade from
   one exact Git commit. Local path dependencies, branches, and floating tags
   are forbidden. The façade may expose supported composition features such as
   `local-runtime`; AetherEMS must not depend directly on the implementation
   crates behind it.
5. AetherEMS must not publish a release while `mode = "bootstrap-git"`.
6. The bootstrap pin is removed only after public AetherEdge crates and target
   runtime/CLI artifacts exist with checksums and verifiable provenance. Cargo
   then uses released versions, Pack builds use the released CLI, and downstream
   CI records the exact upstream release and artifact digests.

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
- The temporary Git pin is reproducible but is not equivalent to a supported
  AetherEdge release.
- Local development may keep an AetherIot checkout next to this repository, but
  committed manifests and CI never depend on that path.
