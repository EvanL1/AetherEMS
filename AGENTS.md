# AetherEMS Agent Instructions

This repository is the energy-management implementation and distribution
downstream of AetherIot.

## Ownership boundary

- Energy models, mappings, rules, evaluations, knowledge, commissioning
  examples, distribution metadata, and energy-domain processors belong here.
- Generic domain, ports, application, SHM, protocol, service, CLI, and storage
  implementation belongs in `EvanL1/AetherIot`.
- Do not copy AetherIot packages or source directories into this repository.
- Cargo dependencies on AetherIot must use the single authority in
  `distribution/aetheriot-dependency.toml`; committed local `path` overrides are
  forbidden.

## Safety

- Pack installation must never commission a site or enable hardware.
- Every example channel, instance, rule, binding, and task is disabled by
  default.
- Site addresses, credentials, certificates, customer data, and production
  memory/database images must never be committed.
- Device control remains deny-by-default, confirmed, permission checked, and
  audited by AetherIot.

## Verification

Run:

```bash
./scripts/check-repository-boundary.sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-targets
cd processors/load-forecasting
uv sync --locked --all-groups
uv run ruff format --check .
uv run ruff check .
uv run pytest
```

An AetherEMS release additionally requires
`./scripts/check-release-readiness.sh`, which intentionally fails while the
bootstrap Git pin is active.
