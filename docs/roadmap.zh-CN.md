[English](./roadmap.md) | 中文

# Ifx 路线图

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
| scratch PDA | ⏳ | v1 |

---

## 合并 `main` 前 — `feat/typed-cpi-masked-patches`（Structured CPI）

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

---

## 规划中 — 客户端 SDK

详细方案：[client-sdks.zh-CN.md](./client-sdks.zh-CN.md)

| 优先级 | 能力 | 状态 | 说明 |
|--------|------|------|------|
| **P0 — 高** | **Go SDK** | ✅ | `go-sdk/` — wire、FrameScratch、Structured/Raw CPI、if_else、L1 e2e |
| **P1 — 中** | **Rust SDK** | ⏳ | `ifx-core` + `ifx-sdk`（`FrameScratch` / `LetBuilder`）；R1–R3 |
