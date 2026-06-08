[English](./roadmap.md) | 中文

# Ifx 路线图

| 能力 | 状态 | 说明 |
|------|------|------|
| Frame PDA + flat `tape` + `payload_at` | ✅ | |
| `ifx_reset_frame`（草稿重置） | ✅ | `cursor = 0`，`index_count = 0`，tape 清零 |
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

## 规划中 — 客户端 SDK

详细方案：[client-sdks.zh-CN.md](./client-sdks.zh-CN.md)

| 优先级 | 能力 | 状态 | 说明 |
|--------|------|------|------|
| **P0 — 高** | **Go SDK** | ✅ | `go-sdk/` — wire、FrameScratch、LetBuilder、patched CPI、if_else |
| **P1 — 中** | **Rust SDK** | ⏳ | `ifx-core` + `ifx-sdk`（`FrameScratch` / `LetBuilder`）；R1–R3 |
