# ADR-0001: Keep AetherEMS as an independent downstream distribution

## Status

Accepted for repository bootstrap. Public AetherIot release evidence remains a
release blocker.

## Context

The original integration workspace contained the AetherIot kernel and the
AetherEMS Energy Pack in one Git repository. Adding a second remote to that
workspace would copy the same source graph and would not establish a downstream
distribution boundary.

The first AetherIot public crate/runtime release does not yet exist. Development
still needs a reproducible way to compile the downstream composition while the
external release gate is being closed.

## Decision

1. This repository owns only the Energy Pack, energy composition, commissioning
   examples, and downstream CI/release metadata.
2. Kernel packages, services, extensions, protocol implementations, SHM code,
   and generic CLI code remain exclusively in `EvanL1/AetherIot`.
3. `distribution/aetheriot-dependency.toml` is the sole AetherIot dependency
   authority.
4. During bootstrap, Cargo may consume public AetherIot packages from one exact
   Git commit. Local path dependencies, branches, and floating tags are
   forbidden.
5. AetherEMS must not publish a release while `mode = "bootstrap-git"`.
6. The bootstrap pin is removed only after public AetherIot crates and target
   runtime/CLI artifacts exist with checksums and verifiable provenance. Cargo
   then uses released versions, Pack builds use the released CLI, and downstream
   CI records the exact upstream release and artifact digests.

The extraction source was AetherIot integration commit
`25a75263da04ea352124814cbf95826f12e63032`. Pack assets were copied from the
working extraction snapshot; the new repository's initial commit is their new
distribution authority.

## Consequences

- AetherEMS can evolve and release independently without copying Kernel source.
- The temporary Git pin is reproducible but is not equivalent to a supported
  AetherIot release.
- Local development may keep an AetherIot checkout next to this repository, but
  committed manifests and CI never depend on that path.
