[English](./README.md) | 中文

# Ifx 文档

设计与实现文档目录。仓库根 [README.zh-CN.md](../README.zh-CN.md) 面向 **Ifx 用户**（场景、指令、SDK 快速上手）。

| 文档 | 读者 | 内容 |
|------|------|------|
| [design.zh-CN.md](./design.zh-CN.md) | 架构 / 产品 | 动机、原则、tape 与 SSA 模型、非目标 |
| [glossary.zh-CN.md](./glossary.zh-CN.md) | 所有人 | **术语表** — 为何叫 `tape`、`index`、`cursor` 等 |
| [implementation.zh-CN.md](./implementation.zh-CN.md) | 集成者 | 指令、类型、限制 |
| [rust-integration.zh-CN.md](./rust-integration.zh-CN.md) | Rust / Anchor 集成者 | CPI、wire 编码、SDK 与 program crate |
| [typed-let-bindings.zh-CN.md](./typed-let-bindings.zh-CN.md) | 集成者 | `LetBinding` opcode 表（tag 0–67） |
| [errors.zh-CN.md](./errors.zh-CN.md) | 集成者 | Anchor 错误码 6000–6039 |
| [debugging.zh-CN.md](./debugging.zh-CN.md) | 集成者 | Program log 伪代码格式 |
| [bundles.zh-CN.md](./bundles.zh-CN.md) | 集成者 | 多 tx 顺序；Jito bundle |
| [frame-memory-index.zh-CN.md](./frame-memory-index.zh-CN.md) | 架构 | Frame index 寻址（已上线）；与临时原型对照 |
| [frame-authority.zh-CN.md](./frame-authority.zh-CN.md) | 集成者 / 架构 | Frame `authority`、写 ACL、写指令仅顶层 |
| [frame-cu-optimization.zh-CN.md](./frame-cu-optimization.zh-CN.md) | 维护者 | Frame CU 优化轮次、benchmark 数据、成果总结 |
| [personal-amm.zh-CN.md](./personal-amm.zh-CN.md) | 集成者 / 演示 | **规划中** 钱包池 swap 展示 — 无 pool/DEX 程序；devnet 不依赖第三方 AMM |
| [development.zh-CN.md](./development.zh-CN.md) | **维护者** | 构建、测试、IDL 同步 |
| [roadmap.zh-CN.md](./roadmap.zh-CN.md) | 全员 | 已交付 vs **里程碑终点 A/B** |
| [lighthouse-coverage.zh-CN.md](./lighthouse-coverage.zh-CN.md) | 维护者 / grant | Lighthouse 对照、覆盖矩阵 |
| [ir-completeness.zh-CN.md](./ir-completeness.zh-CN.md) | 维护者 | **Expr Cast / Binding / Patch** 完备性审计 |
| [domains/stake.zh-CN.md](./domains/stake.zh-CN.md) | 维护者 | Stake 域调研 |
| [client-sdks.zh-CN.md](./client-sdks.zh-CN.md) | 集成者 / 维护者 | **Go SDK（P0）**、Rust SDK（P1）分阶段计划 |
| [program-security.zh-CN.md](./program-security.zh-CN.md) | 维护者 / 集成者 | Solana 官方安全清单 + Ifx 预检 |
| [mainnet-verification.zh-CN.md](./mainnet-verification.zh-CN.md) | 发布 / 运维 | Solscan Verified、security.txt 部署 |
| [SECURITY.zh-CN.md](./SECURITY.zh-CN.md) | 安全研究者 | 漏洞披露（GitHub Advisories） |

权威来源：`programs/ifx/src/`。

**安全报告（版本化）：** [audits/](../audits/README.zh-CN.md) — 内部评估。

**每次审查必读：** [audits/SECURITY-CHECKLIST.zh-CN.md](../audits/SECURITY-CHECKLIST.zh-CN.md)（`IFX-SEC-*` 排查项）。
