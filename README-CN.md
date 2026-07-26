# AetherEMS

AetherEMS 是行业中立 [AetherEdge](https://github.com/EvanL1/AetherEdge) IoT
边缘内核与 SDK 的官方能源管理实现和发行版。本仓库拥有 Energy Pack、EMS 组合、可选
Console 与 Processor、投运示例及下游一致性验证，不复制或 fork AetherEdge Kernel 源码。

为保持 API 兼容，上游 Rust crate 与 CLI 当前仍使用 `aether-*` / `aether` 名称；
`AetherEdge` 是仓库和产品名称。

首次接触 AetherIoT 时，请先完成
[AetherEdge 安全投运旅程](https://docs.aetheriot.dev/zh/overview/user-journeys/)：安装安全空
运行时并证明只读数据链路，再添加本能源领域发行版。

当前是独立仓库 bootstrap 阶段：本地组合可以通过固定 AetherEdge commit 构建，但正式发布
仍需 AetherEdge 提供已签名的 Runtime、CLI、目标相关 runtime manifest 和公共 crates。

```text
已签名 AetherEdge Runtime + 已验证 Energy Pack + 现场投运 = AetherEMS
```

## 产品旅程

匹配的 AetherEdge 与 AetherEMS 签名制品发布后，操作员应按以下顺序投运：

```text
安装安全空 AetherEdge 运行时
  -> 建立操作员身份
  -> 安装经过验证但尚未投运的 Energy Pack
  -> 创建默认禁用的现场 Channel、设备模型和映射
  -> 证明实时能源数据、质量、新鲜度和历史记录
  -> 按需部署可选 Console 或 Forecasting Processor
  -> 审核并显式投运行为
  -> 审计、观测和修订
```

Pack 安装不会连接硬件，也不会启用 Channel、规则、任务或控制 Binding。引入控制前，必须先
证明从现场设备经 AetherEdge 到 `aether-api:6005` 的只读链路。包括 Console 在内的远程
客户端只能使用这个经过认证的应用网关，不能直接访问内部服务、SHM 或 SQLite。Forecasting
始终是可选、按请求运行的 Processor，不会成为实时状态权威。

当前 bootstrap 阶段没有可发布的 AetherEMS 安装器。贡献者可以从源码验证组合、Pack、
Console 和 Processor，但这些工作流不能替代签名产品发行版。

仓库检查以及内部 Console、Processor 构建方式见 [CONTRIBUTING.md](CONTRIBUTING.md)。这些是
贡献者工作流，不是 AetherEMS 产品安装入口。

所有随包 Channel、规则、任务和 Binding 默认禁用；Pack 安装本身不会连接设备或执行控制。
