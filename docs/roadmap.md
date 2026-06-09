English | [中文](./roadmap.zh-CN.md)

# Ifx roadmap

| Capability | Status | Notes |
|------------|--------|-------|
| Frame PDA + flat `tape` + `payload_at` | ✅ | |
| `ifx_reset_frame` (scratch reset) | ✅ | `cursor = 0`, `index_count = 0`, `generation.wrapping_add(1)` (lazy tape) |
| `Frame.generation` + let tags 27–28 | ✅ | Multi-tx / bundle continuation; see [typed-let-bindings.md](./typed-let-bindings.md) |
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

## Before `main` merge — `feat/typed-cpi-masked-patches` (Structured CPI)

Branch stays off `main` until the following are done. Track here; details in [structured-cpi-patches.md](./structured-cpi-patches.md).

| Gate | Status | Notes |
|------|--------|-------|
| Flat `StructuredCpiPatch` wire (no `CpiKind` + shape) | ✅ | `structured_cpi_patch.rs` + SDK `structured-cpi-patch.ts` |
| Unified naming (`*Patch`, glossary) | ✅ | Removed Typed/mask/shape terminology |
| **`Pubkey` on tape + structured patch slots (M1)** | ✅ | `ValueType::Pubkey`; `AccountKey` / `ConstPubkey` let bindings; `Expr::ConstPubkey`; `InitializeMint` `PubkeyValue` + `FreezeAuthPatch`. Optional freeze/auth still modeled in patch enum — not a composite `COption<Pubkey>` tape type. |
| Infer patch tag from official instruction (optional DX) | ✅ | `structuredCpi(ix, { amountDecimals: … })` — tag inferred from program + discriminator |
| Go SDK parity for Structured CPI + Pubkey | ✅ | `go-sdk/structuredcpi/` + LetBinding 25–28, Expr 43, `ValueType::Pubkey` |

---

## Shipped — Frame authority

Spec: [frame-authority.md](./frame-authority.md).

| Item | Status | Notes |
|------|--------|-------|
| Rename `close_authority` → `authority` | ✅ | Same account offset; IDL + SDK |
| On-curve `authority` signer on `reset` / `let` / `close` | ✅ | Off-curve = public scratch |
| `ResetNotTopLevel` / `CloseNotTopLevel` / `CreateNotTopLevel` | ✅ | `let` already `LetNotTopLevel` |
| TS / Go SDK auto `authority` meta | ✅ | `planPublicFrame` unchanged |

---

## Planned — client SDKs

Full plan: [client-sdks.md](./client-sdks.md)

| Priority | Capability | Status | Notes |
|----------|------------|--------|-------|
| **P0 — high** | **Go SDK** | ✅ | `go-sdk/` — wire, FrameScratch, Structured/Raw CPI, if_else, L1 e2e |
| **P1 — medium** | **Rust SDK** | ⏳ | `ifx-core` + `ifx-sdk` (`FrameScratch` / `LetBuilder`); R1–R3 |
