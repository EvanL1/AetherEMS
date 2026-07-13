# AetherEMS

AetherEMS 是 [AetherIot](https://github.com/EvanL1/AetherIot) 行业中立 IoT
边缘内核与 SDK 的官方能源管理实现和发行版。本仓库只拥有 Energy Pack、EMS 组合、
投运示例与下游一致性验证，不复制或 fork AetherIot Kernel 源码。

为保持 API 兼容，上游 Rust crate 与 CLI 当前仍使用 `aether-*` / `aether` 名称；
`AetherIot` 是仓库和产品名称。

当前是独立仓库 bootstrap 阶段：本地组合可以通过固定 AetherIot commit 构建，但正式发布
仍需 AetherIot 提供已签名的 Runtime、CLI、目标相关 runtime manifest 和公共 crates。

```text
已签名 AetherIot Runtime + 已验证 Energy Pack + 现场投运 = AetherEMS
```

本地验证：

```bash
cargo fmt --all -- --check
./scripts/check-repository-boundary.sh
cargo test --workspace --all-targets --locked
cargo run --locked -p aetherems-composition
cd processors/load-forecasting
uv sync --locked --all-groups
uv run ruff format --check .
uv run ruff check .
uv run pytest
```

所有随包 channel、规则、任务和 binding 默认禁用；Pack 安装本身不会连接设备或执行控制。
