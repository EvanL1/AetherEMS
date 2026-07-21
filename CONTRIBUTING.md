# Contributing

Contributions must stay inside the AetherEMS distribution boundary. Generic
kernel or protocol changes belong in the upstream AetherIot repository.

Before committing and pushing to `main`, run:

```bash
./scripts/check-repository-boundary.sh
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

Never commit production credentials, customer data, commissioned addresses, or
enabled control examples. Record changes to the AetherIot dependency contract or
Pack authority as an ADR.
