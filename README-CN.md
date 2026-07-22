# AetherEMS

AetherEMS 是 [AetherEdge](https://github.com/EvanL1/AetherEdge) 行业中立 IoT
边缘内核与 SDK 的官方能源管理实现和发行版。本仓库拥有 Energy Pack、EMS 组合、可选
Console、投运示例与下游一致性验证，不复制或 fork AetherEdge Kernel 源码。

为保持 API 兼容，上游 Rust crate 与 CLI 当前仍使用 `aether-*` / `aether` 名称；
`AetherEdge` 是仓库和产品名称。

当前是独立仓库 bootstrap 阶段：本地组合可以通过固定 AetherEdge commit 构建，但正式发布
仍需 AetherEdge 提供已签名的 Runtime、CLI、目标相关 runtime manifest 和公共 crates。

```text
已签名 AetherEdge Runtime + 已验证 Energy Pack + 现场投运 = AetherEMS
```

仓库检查以及内部 Console、Processor 构建方式见 [CONTRIBUTING.md](CONTRIBUTING.md)。这些是
贡献者工作流，不是 AetherEMS 产品安装入口。

所有随包 channel、规则、任务和 binding 默认禁用；Pack 安装本身不会连接设备或执行控制。
