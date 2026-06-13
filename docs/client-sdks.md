English | [中文](./client-sdks.zh-CN.md)

# Client SDK roadmap

Planned **off-chain SDKs** for building Ifx transactions. On-chain semantics and wire formats are authoritative in `programs/ifx` and [`@ifx-run/sdk`](../sdk/README.md). New SDKs must align with TS golden tests — not invent parallel rules.

**Status table:** [roadmap.md](./roadmap.md)

---

## Priorities

| Priority | SDK | Status | Notes |
|----------|-----|--------|-------|
| — | TypeScript | ✅ shipped | [`@ifx-run/sdk`](https://www.npmjs.com/package/@ifx-run/sdk) **`0.1.0`** |
| **P0 — high** | **Go SDK** | ✅ shipped | [`go-sdk/`](../go-sdk/README.md) **`v0.1.0`** — planner + L0–L3 e2e; [examples](../go-sdk/examples/README.md) |
| **P1 — medium** | **Rust SDK** | ✅ shipped | [`ifx-sdk`](https://crates.io/crates/ifx-sdk) **`0.1.0`** + `ifx-core`; [rust-integration.md](./rust-integration.md) |

**Out of scope here:** the on-chain `ifx` program crate is for maintainers / forks; integrators plan txs off-chain and do not CPI-wrap Ifx inside their own programs.

---

## Released packages (install)

All three clients target **mainnet** by default (`DEFAULT_*` / `DefaultProgramID`). Localnet / devnet: pass cluster program id explicitly (see each README).

| Language | Package | Install |
|----------|---------|---------|
| TypeScript | `@ifx-run/sdk@0.1.0` | `npm install @ifx-run/sdk` |
| Go | `github.com/ifx-run/ifx/go-sdk@v0.1.0` | `go get github.com/ifx-run/ifx/go-sdk@v0.1.0` |
| Rust | `ifx-sdk@0.1.0` | `cargo add ifx-sdk` |

Pin the same **0.1.0** revision across languages for production. Wire golden tests live under repo `tests/` and `go-sdk/integration/`, `rust-sdk/tests/`.

---

## Shared principles (Go & Rust)

1. **No RPC / wallet wrapper** — emit instructions and account metas only (same as TS).
2. **Wire matches TS** — flat `Expr` Borsh tags **0–51**; `LetBinding` tags **0–67**; `Cpi` step kind **`0/1/2`**; `ifx_patched_cpi(arm: Cpi)` / `ifx_if_else(args: IfElseArgs)` use typed Anchor args (custom wire inside). Do not use Anchor’s recursive coders for deep `Expr`.
3. **Layout matches on-chain** — `plan_record_offsets`, `index_cap_for_tape_len`, packed tape `[ty:1][payload]`; off-chain planner should fail fast before submit.
4. **Tests** — byte-level golden parity with `tests/sdk_expr_parity.ts`, `tests/sdk_let_binding_parity.ts`, `tests/sdk_if_else_codec.ts`, etc.
5. **IDL** — ship bundled `idl/ifx.json`; pin **SDK `0.1.0`** and program id for your cluster.

---

## P0 — Go SDK

**Docs:** [`go-sdk/README.md`](../go-sdk/README.md) · examples [`go-sdk/examples/README.md`](../go-sdk/examples/README.md)

### Why

Go is common for wallet and infra backends; the [`go-sdk/`](../go-sdk/README.md) provides **parity with TS** (no Node bridge required).

### Target API (TS two-layer model)

| Layer | TS reference | Go target |
|-------|--------------|-----------|
| Planner + ix | `FrameScratch`, `LetIxBuilder` | `FrameScratch`, `LetBuilder`, `BuildIxLet()`, … |
| IR | `expr`, `ScratchValue`, `LetBinding` | `expr` package + typed scratch handles |
| Codec | `sdk/src/codec.ts` | `codec` package — **hand-written flat encoding** |
| Layout | `tape-layout.ts`, `layout.ts` | `tape`, `frame` decode / PDA |
| CPI helpers | `structured-cpi.ts`, `cpi.ts`, `if-else-arm.ts` | `structuredcpi`, `patchedcpi`, `ifelse` |

### Suggested repo layout

```
go-sdk/                 # module github.com/ifx-run/ifx/go-sdk
  codec/ expr/ binding/ frame/ ix/ wire/ constants/
  scratch/ patchedcpi/ structuredcpi/ ifelse/ patch/ spltoken/ errors/
  examples/ integration/ testdata/ scripts/
```

### Dependencies

- Solana types: **`github.com/gagliardetto/solana-go`** (chosen).
- Wide integers: `big.Int` for `constU128` / mul-div.
- **No** CGO / Node bridge in v1; integration fixtures are pure Go (`go-sdk/integration/`).

### Phased delivery

| Phase | Scope | Done when |
|-------|--------|-----------|
| **G1 — Wire** | constants, PDA, `encodeExpr` / `encodeLetArgs` / patch & if_else codec | bytes match TS parity tests | ✅ |
| **G2 — IR** | `expr` builders, `LetBinding` helpers, Eval type infer | LetBinding 0–67 / Expr 0–51 samples | ✅ |
| **G3 — Planner** | `FrameScratch`, `LetBuilder` (remaining dedup), `ix_*` | `scratch/*_test.go` | ✅ |
| **G4 — Complete** | RawPatched + **Structured** CPI, if_else, Pubkey lets, L0–L3 e2e | `integration/*_test.go`, `structuredcpi/*_test.go` | ✅ |
| **G5 — Docs** | Go SDK README, examples index | `go-sdk/README` | ✅ |

**Follow-ups (non-blocking):** more `examples/` patterns, SPL CPI template helpers.

### Explicit non-goals (v1)

- Expr wire “compact const” auto-encoding — revisit only with measured tx-size pressure.
- On-chain program or Anchor codegen.

---

## P1 — Rust SDK

### Naming

Off-chain crate: **`ifx-sdk`** (not `ifx-client`) — same layer as `@ifx-run/sdk`, the Go SDK, and Rust `ifx-sdk`: instructions and wire only; **no** RPC, Connection, or wallet wrapper.

| Crate | Role |
|-------|------|
| **`ifx-core`** | Shared on-chain types, constants, tape layout, value codec, inference |
| **`ifx-sdk`** | `FrameScratch`, `LetBuilder`, `ix_*`, `expr` builders; `solana-sdk` `Instruction`s |
| **`ifx`** (program) | Deployed on-chain program; depends on `ifx-core` (maintainers / forks — not an integrator path dep) |

### Why

Pure Rust backends today path-depend on the program crate or reimplement codec ([rust-integration.md](./rust-integration.md)). Rust can **share** on-chain layout and type inference instead of a third copy.

### Architecture (target)

```
crates/ifx-core/          # Shared: constants, wire types, tape layout, codecs (crates.io: ifx-core)
programs/ifx/             # On-chain only: #[program], execute_let, invoke; depends on ifx-core (crates.io: ifx)
rust-sdk/                 # Off-chain planner; package name ifx-sdk (crates.io: ifx-sdk)
```

**Dependency rule:** `ifx-core` ← `ifx` (program) and `ifx-core` ← `ifx-sdk`. Core never depends on Anchor account runtime or `solana-sdk` `Instruction` assembly.

**Incremental `ifx-core` features** (zero-cost when disabled):

| Feature | Contents |
|---------|----------|
| *(default)* | `constants` |
| `wire` | `Cpi`, `StructuredCpiPatch`, `Expr`, `U8LenVec`, … |
| `anchor-wire` | `LetBinding`, `LetArgs` (Anchor-compatible serialize during migration) |
| `layout` | `frame_layout`, `plan_record_offsets`, `infer_expr_ty`, `value_codec` |
| `structured-cpi` | `assemble_structured_cpi` ix data (SPL/System/Stake; no `invoke`) |

**Stays in `programs/ifx` only:** `#[program]` handlers, `AccountInfo` / PDA init, `let_binding_exec`, `program::invoke`, `pseudocode`, `#[error_code]`.

**Short term:** path-depend on `ifx` + `no-entrypoint` still works for CPI integrators. **Medium term:** wallets depend on `ifx-sdk` + `ifx-core`, not the full program crate.

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
| **R1** | `ifx-core` extraction + golden vs TS | ✅ wire + layout + `structured-cpi`; `frame_layout` deferred |
| **R2** | planner + `ix_*` + `expr` | ✅ `FrameScratch`, `LetBuilder`, `let_*`, `ix_cpi` / `ix_if_else` / `ix_close`, parity tests |
| **R3** | examples + integration tests (`ifx-sdk`) | ✅ L0–L3 localnet planners (minimal, close-empty-ATA, dust, two-hop, personal AMM, sponsored buy) |

---

## Maintenance

- Keep this doc and [roadmap.md](./roadmap.md) in sync (⏳ / 🚧 / ✅).
- When TS SDK changes wire or layout, update parity tests in the **same PR** and note Go/Rust backlog here.
