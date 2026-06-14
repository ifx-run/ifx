# SDK integrator feedback — implementation plan

Branch: `feat/sdk-integrator-feedback`

Source: [ifx-pumpfun-ext/docs/ifx-sdk-feedback.md](https://github.com/ifx-run/ifx-pumpfun-ext/blob/main/docs/ifx-sdk-feedback.md) (mainnet integration of Pump.fun v2 + sponsor + conditional close).

**Scope split (aligned with feedback):** fix **generic SDK primitives** (P0–P1); optional generic tooling (P2). Do **not** ship business planners, DEX patch offsets, or whole-tx size APIs.

---

## Current gap analysis

| Item | TS `@ifx-run/sdk` | Go `go-sdk` | Rust `rust-sdk` |
|------|-------------------|-------------|-----------------|
| **P0** `PublicKey` identity (`instanceof`) | **Bug** — `let-account.ts` uses `instanceof PublicKey` | OK — `interface{}` + type switch on `solana.PublicKey` | OK — plain `Pubkey` |
| **P1** Export binding types | `ScratchValue<T>` exported via `index.ts` / `typed.ts`, but no convenience aliases (`U64Binding`, …) | `typed.ScratchValue` public; Go lacks generics — document `ScratchValue` + `TyU64` | `ScratchValue` exported from `lib.rs` |
| **P1** Public Frame scratch for **existing** frame | **Missing** — integrators use 6-arg ctor; easy to swap `authority` / `programId` | **Partial** — `NewFrameScratch(frame, tapeLen, programID, authority)` works but no `ForPublicFrame` that sets `authority = frame` | **Partial** — `FrameScratch::new(...)` only |
| **P2** Ifx ix decode | Partial — frame decode in `layout.ts`; no `decodeIfxInstruction` | Frame decode in `frame/` | `decode_frame_account` in `decode.rs` |
| **P2** Log parser | None | None | None |
| **P2** Tape / binding errors | Basic errors in `FrameScratch.plan` | Similar in `scratch.go` | Similar in `scratch.rs` |

**Integrator-owned (out of scope):** `tryCompile` / 1232B policy, Pump `rawCpiPatch` offsets, sponsor / two-hop planners.

---

## Phase 1 — P0 + P1 (ship together)

### 1.1 TS — fix `LetAccountInput` (P0)

**File:** `sdk/src/let-account.ts`

Replace `instanceof PublicKey` with duck typing:

- If value has `pubkey` + `isSigner` + `isWritable` → treat as `AccountMeta`.
- Else if `toBase58` and (`toBytes` or `toBuffer`) → wrap as readonly non-signer meta.
- Else throw a clear error.

Also widen `LetAccountInput` to accept duck-typed pubkey objects (document that **`AccountMeta` is preferred** when the app bundles its own `@solana/web3.js`).

**Tests:** `tests/sdk_let_account.ts` (new) — simulate “foreign” `PublicKey`-like object; assert `letBuilder.lamports()` / `FrameScratch.letLamports()` succeed.

**CHANGELOG:** patch-level note under `@ifx-run/sdk`.

---

### 1.2 TS — binding type aliases (P1)

**File:** `sdk/src/typed.ts` (or `sdk/src/types.ts`)

Export documented aliases integrators can use cross-module:

```ts
export type U64Binding = ScratchValue<"u64">;
export type BoolBinding = ScratchValue<"bool">;
// … u8, u16, u32, i64, pubkey as needed
```

Re-export from `index.ts` (already `export * from "./typed"`).

No runtime change.

---

### 1.3 TS — `FrameScratch.forPublicFrame()` (P1)

**File:** `sdk/src/scratch.ts`

Static factory for **already provisioned** public Frames (production path in ifx-pumpfun-ext):

```ts
static forPublicFrame(params: {
  framePubkey: PublicKey;
  programId?: PublicKey;
  tapeLen?: number;
}): FrameScratch
```

Semantics:

- `authority = params.framePubkey` (public Frame invariant).
- `cursor = 0`, `nextIndex = 0`.
- Default `programId` → `DEFAULT_IFX_PROGRAM_ID`.
- Default `tapeLen` → `DEFAULT_TAPE_LEN`.

**Do not conflate** with `planPublicFrame` (one-time create + `ixCreate`).

**Tests:** `tests/sdk_public_frame_authority.ts` — add case for `forPublicFrame` + `isPublicFrameAuthority`.

**Docs:** `sdk/README.md` — table row distinguishing `planPublicFrame` vs `forPublicFrame`.

---

### 1.4 Go — `ForPublicFrame` helper (P1 parity)

**File:** `go-sdk/scratch/scratch.go`

```go
func ForPublicFrame(framePK, programID solana.PublicKey, tapeLen *int) *FrameScratch
```

Same semantics as TS: `authority = framePK`.

**Tests:** `go-sdk/scratch/scratch_test.go`.

**Docs:** `go-sdk/README.md` — add to factory table next to `NewFrameScratch`.

No P0 work — account normalization already accepts `solana.PublicKey`, `*solana.AccountMeta`, `typed.AccountMeta`.

Optional: accept `string` base58 in `toLetMeta` for ergonomics (low priority).

---

### 1.5 Rust — `for_public_frame` (P1 parity)

**File:** `rust-sdk/src/scratch.rs`

```rust
pub fn for_public_frame(
    frame: Pubkey,
    tape_len: Option<u32>,
    program_id: Option<Pubkey>,
) -> FrameScratch
```

Export via `lib.rs` if needed.

**Tests:** unit test in `scratch.rs` or planner test harness.

---

## Phase 2 — P2 (optional follow-up PR)

Prioritize by integrator pain; each item is **venue-agnostic**:

| Item | TS | Go | Rust |
|------|----|----|------|
| **`decodeIfxInstruction(data)`** — map 8-byte disc → ix name + args skeleton | New `sdk/src/decode-ix.ts`; reuse `codec` / IDL discriminators | `codec/decode_ix.go` | Extend `decode.rs` |
| **`parseIfxLogs(logs)`** — structured assert / if_else / CPI outcomes | New module | New package | New module |
| **Richer tape errors** — suggest `tapeLen`, binding count, bytes needed | Enhance `plan()` messages | Same | Same |
| **Docs: let batching / wire overhead** | `sdk/README.md` + link to pumpfun-ext size table | README | README |
| **Slimmer Anchor peer dep** | Evaluate optional `@anchor-lang/core` (large change — separate spike) | N/A | N/A |

Reference implementation to port from: `ifx-pumpfun-ext/src/util/tx-inspect.ts` (Ifx discriminator list only — strip Pump-specific tables).

---

## Phase 3 — downstream

After Phase 1 ships:

1. **ifx-pumpfun-ext** can delete `src/ifx/let-account.ts` and simplify `src/ifx/frames.ts` to `FrameScratch.forPublicFrame(...)`.
2. Bump `@ifx-run/sdk` peer in pumpfun-ext; run mainnet regression.
3. Update `.cursor/skills/ifx-orchestration/SKILL.md` with `forPublicFrame` one-liner.

---

## Verification checklist (Phase 1)

- [ ] `npm test` / `anchor test` — TS integration tests green
- [ ] `go test ./...` in `go-sdk`
- [ ] `cargo test` in `rust-sdk`
- [ ] `npm run build` in `sdk` — dist types include new exports
- [ ] CHANGELOG entries (EN + zh-CN) for sdk / go-sdk / rust-sdk as applicable

---

## Suggested PR split

1. **PR1 (P0):** TS `let-account` duck typing + tests
2. **PR2 (P1):** TS aliases + `forPublicFrame` + Go/Rust parity + docs
3. **PR3 (P2):** decode / logs / doc pass (optional)

Single branch `feat/sdk-integrator-feedback` is fine; merge as one release if review bandwidth is limited.

---

*Last updated: 2026-06-14*
