[English](./roadmap.md) | 中文

# Ifx 路线图

## 里程碑终点（1.0 定义）

下一阶段的 **两个任务终点**（mainnet 前）。细节见链接文档；已交付能力见下文表格。

### 终点 A — 域覆盖 + IR 完备（Lighthouse 对照并超越）

**目标：** [Lighthouse](https://github.com/Jac0xb/lighthouse) 断言域作为 **对照表**；Ifx 在 **可表达 guard 场景** 上对齐并保留 **Skip / CPI / patch** 增量。同时在 **devnet 窗口** 内闭合 `LetBinding`、`Expr`、`StructuredCpiPatch` wire（允许 breaking change）。

| 文档 | 内容 |
|------|------|
| [lighthouse-coverage.zh-CN.md](./lighthouse-coverage.zh-CN.md) | 调研、覆盖矩阵、R0–R5 域路线、非目标（Memory PDA） |
| [lighthouse-full-coverage.zh-CN.md](./lighthouse-full-coverage.zh-CN.md) | R5：Lighthouse 断言域 tag 45–67 |
| [ir-completeness.zh-CN.md](./ir-completeness.zh-CN.md) | **Cast / Binding / Patch 审计**；显式 **AsU8…AsI128**（Expr tag 18–28） |
| [domains/stake.zh-CN.md](./domains/stake.zh-CN.md) | Stake 域（tag 31–38、60–64） |

**终点 A 验收（全部满足）：**

- [x] 覆盖矩阵：[lighthouse-coverage.zh-CN.md §4](./lighthouse-coverage.zh-CN.md) 无 ⏳（🟡 仅 `AccountDataSlice` layout cookbook 可选）
- [x] IR-1：显式 **AsU8…AsI128**（Expr cast 族）；TS/Go golden 更新
- [x] IR-2：Account meta + Stake + R5 typed lets；guardrail / delta **示例**
- [x] 每域至少 1 个 **超越** 示例（assert + Skip 或 patch）— Stake / Upgradeable / Token / Merkle 见 `sdk/examples/`
- [ ] 第三方审计 + mainnet 部署（grant / 发布主线，与终点 A 并行）

### 终点 B — Rust SDK

**目标：** 链下 Rust 与 `@ifx-run/sdk` / Go **同等表达能力**；wire 由 `ifx-core` 单点维护。

| 文档 | 内容 |
|------|------|
| [client-sdks.zh-CN.md](./client-sdks.zh-CN.md) § P1 | `ifx-core` + `ifx-sdk`；R1–R3 阶段 |

**依赖：** **IR-1 完成后** 再冻结 Rust golden（避免 cast wire 二次迁移）。

**终点 B 验收：**

- [x] `ifx-core` 与 TS parity tests 字节一致（wire + layout + structured-cpi）
- [x] `ifx-sdk`：`FrameScratch`、`LetBuilder`、`let_*`、`ix_cpi` / `ix_if_else` / `ix_close`、`expr` builder + parity 测试
- [x] 至少 L1 级 Rust 集成测试（`rust-sdk/tests/localnet.rs`：minimal、close-empty-ATA、sponsored buy）

**建议顺序：** 终点 A 的 **IR-1 → IR-2** 与审计并行 → **终点 B** → 终点 A 剩余 IR-3 / 域示例扫尾 → mainnet。

---

## 已交付（摘要）

| 能力 | 状态 | 说明 |
|------|------|------|
| Frame PDA + flat `tape` + `payload_at` | ✅ | |
| `ifx_reset_frame`（草稿重置） | ✅ | `cursor = 0`，`index_count = 0`，`generation.wrapping_add(1)`（lazy tape） |
| `Frame.generation` + let tag 27–28 | ✅ | 多 tx / bundle 续写；见 [typed-let-bindings.zh-CN.md](./typed-let-bindings.zh-CN.md) |
| `ifx_let` binding index append | ✅ | `Value.index`；见 [implementation.zh-CN.md](./implementation.zh-CN.md) |
| 递归 `Expr` + `cond: Expr` | ✅ | |
| `min` / `max`、子表达式比较 | ✅ | |
| `AccountDataSlice.offset` u32 | ✅ | |
| `ifx_let` stack height = 1 | ✅ | |
| TypeScript SDK（cursor 模拟） | ✅ | `@ifx-run/sdk` |
| Anchor 集成测试 | ✅ | |
| CPI Patch (`Cpi::patches`) | ✅ | |
| `FrameScratch` / `letBuilder`（SDK `ifx_let` + remaining 自动索引） | ✅ | `@ifx-run/sdk` |
| Typed `LetBinding` enum + Phase 1 字段登记（SPL Token、lamports 仅 u64） | ✅ | [typed-let-bindings.zh-CN.md](./typed-let-bindings.zh-CN.md)；opcode `0`–`8` |
| Token-2022 typed let（base `9`–`13`、扩展 + 批内缓存） | ✅ | 同文档 §4.4；opcode `9`–`18`；批内 account data 缓存 |
| `AccountDataSlice` owner 校验（`expected_program_owner`） | ✅ | Tag `0`；layout 仍由调用方负责 |
| Frame tape（index + `payload_at`、更大 tape） | ✅ | [frame-memory-index.zh-CN.md](./frame-memory-index.zh-CN.md) |
| Personal AMM 展示（无专用 pool/DEX 程序的钱包池 swap） | ✅ | [personal-amm.zh-CN.md](./personal-amm.zh-CN.md)；示例 + 测试；可选报价服务待定 |

## 已交付 — 终点 A（扫尾项：审计 / mainnet）

### 域覆盖（Lighthouse 对照）

| 阶段 | 内容 | 状态 |
|------|------|------|
| **R0** | 矩阵文档、guardrail / delta 示例 | ✅ |
| **R1** | Account signer/writable `LetBinding` | ✅ |
| **R2** | Stake typed lets + 示例 + 测试 | ✅ |
| **R3** | Upgradeable loader、Merkle CPI 示例 | ✅ |
| **R4** | `ifx_assert_multi` | ✅ — [r4-assert-multi.zh-CN.md](./r4-assert-multi.zh-CN.md)（disc=5） |
| **R5** | Lighthouse 断言域 tag 45–67 | ✅ — [lighthouse-full-coverage.zh-CN.md](./lighthouse-full-coverage.zh-CN.md) |

### IR 完备（wire 定稿）

| 阶段 | 内容 | 状态 |
|------|------|------|
| **IR-0** | [ir-completeness.zh-CN.md](./ir-completeness.zh-CN.md) | ✅ |
| **IR-1** | 显式 AsU8…AsI128（Expr cast 族）；golden 迁移 | ✅ |
| **IR-2** | LB-1/LB-2 + Stake lets + **SP-5** structured CPI | ✅ |
| **IR-3** | Mint/loader 补全、Raw patch 文档 | ✅ |

**扫尾（组织线，非 IR）：** 第三方审计 + mainnet 部署。

**非目标：** Lighthouse Memory PDA、`lighthouse-compat` SDK 糖层。

---

## 进行中 — 终点 B 分解

详见 [client-sdks.zh-CN.md](./client-sdks.zh-CN.md) § P1。

| 阶段 | 内容 | 状态 |
|------|------|------|
| **Rust R1** | `ifx-core` 抽取 + golden vs TS | ✅ |
| **Rust R2** | planner + `ix_*` + `expr` | ✅ |
| **Rust R3** | 示例 + L0–L3 集成测试 | ✅ minimal、close-empty-ATA、dust、two-hop、personal AMM、sponsored buy |

---

## 历史 — 客户端 SDK（Go 已交付）

| 优先级 | 能力 | 状态 | 说明 |
|--------|------|------|------|
| **P0** | **Go SDK** | ✅ | `go-sdk/` |
| **P1** | **Rust SDK** | ✅ | `ifx-core` + `ifx-sdk`（R1–R3 minimal localnet） |

---

## 附录 — 已合并分支 / 权限（归档）

以下章节保留历史记录；新工作以 **§ 里程碑终点** 为准。

### 合并 `main` 前 — Structured CPI

本分支成熟前不合并。细则见 [structured-cpi-patches.zh-CN.md](./structured-cpi-patches.zh-CN.md)。

| 门槛 | 状态 | 说明 |
|------|------|------|
| Flat `StructuredCpiPatch` wire（无 `CpiKind` + shape） | ✅ | `structured_cpi_patch.rs` + SDK `structured-cpi-patch.ts` |
| 命名统一（`*Patch`、glossary） | ✅ | 移除 Typed/mask/shape 术语 |
| **tape 上 `Pubkey` + Structured patch 槽位（M1）** | ✅ | `ValueType::Pubkey`；`AccountKey` / `ConstPubkey` let binding；`Expr::ConstPubkey`；`InitializeMint` 的 `PubkeyValue` + `FreezeAuthPatch`。可选 freeze/auth 在 patch enum 建模 — 非 tape 复合类型 `COption<Pubkey>`。 |
| 从 official instruction 推断 patch tag（可选 DX） | ✅ | `structuredCpi(ix, { amountDecimals: … })` — 从 program + discriminator 推断 tag |
| Go SDK Structured CPI + Pubkey 对齐 | ✅ | `go-sdk/structuredcpi/` + LetBinding 25–28、Expr 43、`ValueType::Pubkey` |

---

## 已交付 — Frame 权限

规范：[frame-authority.zh-CN.md](./frame-authority.zh-CN.md)。

| 项 | 状态 | 说明 |
|----|------|------|
| `close_authority` → `authority` 改名 | ✅ | 账户同偏移；IDL + SDK |
| on-curve `authority` 在 `reset` / `let` / `close` 上要 signer | ✅ | off-curve = 公共 scratch |
| `ResetNotTopLevel` / `CloseNotTopLevel` / `CreateNotTopLevel` | ✅ | `let` 已有 `LetNotTopLevel` |
| TS / Go SDK：on-curve 时 prepend `remaining[0]`；public 零账户 | ✅ | `planPublicFrame` 不变 |
