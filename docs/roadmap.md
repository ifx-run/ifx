English | [中文](./roadmap.zh-CN.md)

# Ifx roadmap

| Capability | Status | Notes |
|------------|--------|-------|
| Frame PDA + flat `tape` + `payload_at` | ✅ | |
| `ifx_reset_frame` (scratch reset) | ✅ | `cursor = 0`, `index_count = 0`, tape cleared |
| `ifx_let` binding index append | ✅ | `Value.index`; see [implementation.md](./implementation.md) |
| Recursive `Expr` + `cond: Expr` | ✅ | |
| `min` / `max`, sub-expression compare | ✅ | |
| `AccountDataSlice.offset` u32 | ✅ | |
| `ifx_let` stack height = 1 | ✅ | |
| TypeScript SDK (cursor simulation) | ✅ | `@ifx-run/sdk` |
| Anchor integration tests | ✅ | |
| CPI Patch (`Cpi::patches`) | ✅ | |
| `FrameScratch` / `letBuilder` (SDK `ifx_let` + auto remaining) | ✅ | `@ifx-run/sdk` |
| Typed `LetBinding` enum + Phase 1 field registry (SPL Token, lamports u64-only) | ✅ | [typed-let-bindings.md](./typed-let-bindings.md); opcodes `0`–`8` |
| Token-2022 typed let (base `9`–`13`, extensions + field cache) | ✅ | Same doc §4.4; opcodes `9`–`18`; per-batch parsed field cache |
| `AccountDataSlice` owner check (`expected_program_owner`) | ✅ | Tag `0`; layout still caller-defined |
| Frame tape（index + `payload_at`、更大 tape） | ✅ | [frame-memory-index.md](./frame-memory-index.md) |
| Personal AMM showcase (program-free wallet pool swap) | ✅ | [personal-amm.md](./personal-amm.md); example + test; optional quote server TBD |
| scratch PDA | ⏳ | v1 |

---

## Planned — client SDKs

Full plan: [client-sdks.md](./client-sdks.md)

| Priority | Capability | Status | Notes |
|----------|------------|--------|-------|
| **P0 — high** | **Go SDK** | ✅ | `go-sdk/` — wire, FrameScratch, LetBuilder, patched CPI, if_else |
| **P1 — medium** | **Rust SDK** | ⏳ | `ifx-core` + `ifx-sdk` (`FrameScratch` / `LetBuilder`); R1–R3 |
