English | [中文](./client-sdks.zh-CN.md)

# Client SDK roadmap

Planned **off-chain SDKs** for building Ifx transactions. On-chain semantics and wire formats are authoritative in `programs/ifx` and [`@ifx-run/sdk`](../sdk/README.md). New SDKs must align with TS golden tests — not invent parallel rules.

**Status table:** [roadmap.md](./roadmap.md)

---

## Priorities

| Priority | SDK | Status | Notes |
|----------|-----|--------|-------|
| **P0 — high** | **Go SDK** | ✅ | [`go-sdk/`](../go-sdk/README.md) — planner + readback + L0–L1 e2e; see [examples](../go-sdk/examples/README.md) |
| **P1 — medium** | **Rust SDK** | ⏳ planned | `ifx-core` + `ifx-sdk`; see [rust-integration.md](./rust-integration.md) |
| — | TypeScript | ✅ shipped | `@ifx-run/sdk` |

**Out of scope here:** on-chain CPI continues to use the `ifx` program crate (`features = ["cpi"]`).

---

## Shared principles (Go & Rust)

1. **No RPC / wallet wrapper** — emit instructions and account metas only (same as TS).
2. **Wire matches TS** — flat `Expr` Borsh tags **0–42**; `LetBinding` tags **0–23**; `Value.index` is u8 binding index. Do not use Anchor’s recursive coders for deep `Expr`.
3. **Layout matches on-chain** — `plan_record_offsets`, `index_cap_for_tape_len`, packed tape `[ty:1][payload]`; off-chain planner should fail fast before submit.
4. **Tests** — byte-level golden parity with `tests/sdk_expr_parity.ts`, `tests/sdk_let_binding_parity.ts`, `tests/sdk_if_else_codec.ts`, etc.
5. **IDL** — ship bundled `idl/ifx.json` (pin program id to the same revision as npm).

---

## P0 — Go SDK

**Docs:** [`go-sdk/README.md`](../go-sdk/README.md) · examples [`go-sdk/examples/README.md`](../go-sdk/examples/README.md)

### Why

Go is common for wallet and infra backends; today integrators must shell to Node or hand-encode wire. Goal is **parity with TS**, not a minimal subset.

### Target API (TS two-layer model)

| Layer | TS reference | Go target |
|-------|--------------|-----------|
| Planner + ix | `FrameScratch`, `LetIxBuilder` | `FrameScratch`, `LetBuilder`, `BuildIxLet()`, … |
| IR | `expr`, `ScratchValue`, `LetBinding` | `expr` package + typed scratch handles |
| Codec | `sdk/src/codec.ts` | `codec` package — **hand-written flat encoding** |
| Layout | `tape-layout.ts`, `layout.ts` | `tape`, `frame` decode / PDA |
| CPI helpers | `cpi.ts`, `if-else-arm.ts`, `patch-list.ts` | `patchedcpi`, `ifelse` packages |

### Suggested repo layout

```
go-sdk/                 # module github.com/ifx-run/ifx/go-sdk
  codec/ expr/ binding/ frame/ ix/ wire/ constants/
  scratch/ patchedcpi/ ifelse/ patch/ spltoken/ errors/
  examples/ integration/ testdata/ scripts/
```

### Dependencies

- Solana types: **`github.com/gagliardetto/solana-go`** (chosen).
- Wide integers: `big.Int` for `constU128` / mul-div.
- **No** CGO / Node bridge in v1 (except dust fixture script for tests).

### Phased delivery

| Phase | Scope | Done when |
|-------|--------|-----------|
| **G1 — Wire** | constants, PDA, `encodeExpr` / `encodeLetArgs` / patch & if_else codec | bytes match TS parity tests | ✅ |
| **G2 — IR** | `expr` builders, `LetBinding` helpers, Eval type infer | opcode 0–23 samples | ✅ |
| **G3 — Planner** | `FrameScratch`, `LetBuilder` (remaining dedup), `ix_*` | `scratch/*_test.go` | ✅ |
| **G4 — Complete** | patched CPI, if_else, SPL/sysvar lets, L0–L1 examples + localnet e2e | `integration/*_test.go` | ✅ |
| **G5 — Docs** | Go SDK README, examples index | `go-sdk/README` | ✅ |

**Follow-ups (non-blocking):** more `examples/` patterns, SPL CPI template helpers.

### Explicit non-goals (v1)

- Expr wire “compact const” auto-encoding — revisit only with measured tx-size pressure.
- On-chain program or Anchor codegen.

---

## P1 — Rust SDK

### Naming

Off-chain crate: **`ifx-sdk`** (not `ifx-client`) — same layer as `@ifx-run/sdk` and the Go SDK: instructions and wire only; **no** RPC, Connection, or wallet wrapper.

| Crate | Role |
|-------|------|
| **`ifx-core`** | Shared on-chain types, constants, tape layout, value codec, inference |
| **`ifx-sdk`** | `FrameScratch`, `LetBuilder`, `ix_*`, `expr` builders; `solana-sdk` `Instruction`s |
| **`ifx`** (program) | On-chain program + `features = ["cpi"]`; depends on `ifx-core` |

### Why

Pure Rust backends today path-depend on the program crate or reimplement codec ([rust-integration.md](./rust-integration.md)). Rust can **share** on-chain layout and type inference instead of a third copy.

### Target architecture

```
crates/ifx-core/          # extract from programs/ifx: types, constants, tape, frame_layout,
                          # value_codec, infer_expr_ty, plan_record_offsets
programs/ifx/             # depends on ifx-core; on-chain execute_let / CPI
crates/ifx-sdk/           # FrameScratch, LetBuilder, ix_*, expr builders; solana-sdk
```

Short term: path-depend on `ifx` + `no-entrypoint` to prove the planner. Medium term: extract `ifx-core` so wallets do not pull the full Anchor program crate.

### Reuse (do not rewrite)

- Wire types, `constants`, `plan_record_offsets`, `index_cap_for_tape_len`
- `infer_expr_ty` (off-chain `FrameReader` + scratch `index → ValueType` map)
- `frame_layout` decode, `value_codec` reads
- `Expr` → `borsh::to_vec`; `LetArgs` → AnchorSerialize / instruction data

### New code only

- `FrameScratch` / `LetIxBuilder` (remaining dedup)
- `TransactionInstruction` builders
- `expr` builder ergonomics

### Phased delivery

| Phase | Scope |
|-------|--------|
| **R1** | `ifx-core` extraction + golden vs TS |
| **R2** | planner + `ix_let` / reset / assert |
| **R3** | patched CPI, if_else, examples + integration tests (`ifx-sdk`) |

---

## Maintenance

- Keep this doc and [roadmap.md](./roadmap.md) in sync (⏳ / 🚧 / ✅).
- When TS SDK changes wire or layout, update parity tests in the **same PR** and note Go/Rust backlog here.
