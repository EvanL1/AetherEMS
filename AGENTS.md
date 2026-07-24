# AetherEMS Agent Instructions

This repository is the energy-management implementation and distribution
downstream of AetherEdge. `CLAUDE.md` and `GEMINI.md` are symlinks to this
file, so every agent reads and edits the same instructions.

## Ownership boundary

- Energy models, mappings, rules, evaluations, knowledge, commissioning
  examples, distribution metadata, the EMS operator console, and energy-domain
  processors belong here.
- Generic domain, ports, application, SHM, protocol, service, CLI, and storage
  implementation belongs in `EvanL1/AetherEdge`.
- Do not copy AetherEdge packages or source directories into this repository.
- Cargo dependencies on AetherEdge must use the single authority in
  `distribution/aetheriot-dependency.toml`; committed local `path` overrides are
  forbidden.
- Cargo must consume only the `aether-edge-sdk` façade at the exact commit
  recorded by that authority. Direct dependencies on AetherEdge implementation
  crates are forbidden.

## Safety

- Pack installation must never commission a site or enable hardware.
- Every example channel, instance, rule, binding, and task is disabled by
  default.
- Site addresses, credentials, certificates, customer data, and production
  memory/database images must never be committed.
- Device control remains deny-by-default, confirmed, permission checked, and
  audited by AetherEdge.

## Verification

Run:

```bash
./scripts/check-repository-boundary.sh
./scripts/check-release-readiness.sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-targets
cd console
corepack pnpm install --frozen-lockfile
corepack pnpm run type-check:only
corepack pnpm run lint:check
corepack pnpm run test:coverage
corepack pnpm run build
cd ../processors/load-forecasting
uv sync --locked --all-groups
uv run ruff format --check .
uv run ruff check .
uv run pytest
```

An AetherEMS release additionally requires
`./scripts/check-release-readiness.sh`, which intentionally passes as a no-op
while the bootstrap Git pin is active and only enforces signed release
evidence — pinned upstream source, runtime and CLI checksums, and GitHub
artifact attestation — once the dependency authority switches to
`released-git`. It then requires network access and an authenticated GitHub
CLI; use `AETHEREMS_OFFLINE_RELEASE_CHECK=1` only for narrow local script
tests.
