# Ifx Rust SDK (`ifx-sdk`)

**[← Ifx project homepage](https://github.com/ifx-run/ifx)**

English | [中文](./README.zh-CN.md)

Rust off-chain client for **Ifx**: build `ifx_create_frame`, `ifx_let`, `ifx_assert`, `ifx_patched_cpi`, `ifx_if_else`, and related instructions. **Does not wrap RPC or wallets** — you get `solana_sdk::instruction::Instruction` values; your backend signs and sends.

> **Preview:** No mainnet program yet. Default `program_id` is devnet (`IFX_DEVNET_PROGRAM_ID`). Local Surfpool / repo integration tests use `IFX_LOCALNET_PROGRAM_ID`.

- **Crates.io name:** `ifx-sdk`
- **Directory:** `rust-sdk/` (same convention as `go-sdk/`)
- **Shared types:** [`ifx-core`](../crates/ifx-core)

## Two layers

1. **`FrameScratch`** — plan tape bindings (`let_*` / `LetBuilder`), emit `ix_reset`, `ix_let`, `ix_assert`, `ix_cpi` (`ifx_patched_cpi`), `ix_if_else`, …
2. **`expr` + `ScratchValue`** — build on-chain `Expr` trees and Frame bindings (binding index, remaining accounts, types)

Prefer `FrameScratch` in application code; use `build_ix_create_frame` and friends when you need lower-level control.

## Install

Path dependency (monorepo):

```toml
ifx-sdk = { path = "../rust-sdk" }
```

Crates.io (when published):

```bash
cargo add ifx-sdk
```

## Quick start

### Tx 1 — Create a Frame (standalone)

Do not mix create with swap/settlement in the same transaction.

```rust
use ifx_sdk::constants::IFX_DEVNET_PROGRAM_ID;
use ifx_sdk::scratch::{FrameScratch, PlanNewFrameParams};

let frame_id = rand::random::<[u8; 32]>();
let plan = FrameScratch::plan_public_frame(PlanNewFrameParams {
    payer,
    frame_id: &frame_id,
    authority: payer, // ignored — public Frame uses Frame PDA as authority
    tape_len: 256,
    program_id: Some(IFX_DEVNET_PROGRAM_ID),
})?;
// Send plan.ix_create alone; persist plan.frame (pubkey) + tape_len (frame_id optional after create)
// plan.scratch.authority == plan.frame (public Frame — no extra signer on reset/let)
```

**Optional — private / closeable Frame** (`authority: payer`, signs reset/let; can close for rent): use `plan_new_frame` — [frame-authority.md](../docs/frame-authority.md).

### Tx 2 — Business (reset + let + assert / CPI)

```rust
use ifx_sdk::expr;
use ifx_sdk::scratch::FrameScratch;

let mut s = plan.scratch;
let reset_ix = s.ix_reset();
let target = s.let_const_u64(10)?;
let let_ix = s.ix_let_single(&target)?;
let assert_ix = s.ix_assert(&expr::non_zero(expr::r(&target)))?;
// Assemble transaction, sign, send
```

### Production: logs, not Frame decode

Confirm behavior via **Ifx transaction logs** (conditions, CPI arms, patch offsets, assert results). On failure, use logs + error codes ([`errors`](../docs/errors.md)).

**Do not call** `decode_frame_account` or tape readback helpers in production. These are for **tests, examples, and local debugging** only. Standalone business txs still start with **`ix_reset`**.

## Single vs multi binding

**Single:** `s.let_lamports(user)?` → `s.ix_let_single(&sv)?` → later `expr::r(&sv)`.

**Multi:** `s.let_builder()` → several `lamports` / `spl_token_amount` / … → `b.build_ix()?` (remaining deduped).

Conditions for `ix_assert` / `ix_if_else`: bool `Expr` or bool `ScratchValue`.

## When to `let`

- **Persist:** values used later by assert, CPI patches, or later lets
- **Skip persist:** nest in `LetEval`, or compare inside `ix_assert` only

Fixed `tape_len` at create (no extend/shrink). See [errors.md](../docs/errors.md) for `IndexCapReached` / `TapeOutOfBounds`.

### Session helpers

| Method | Use |
|--------|-----|
| `plan_new_frame` | New Frame: `scratch` + `ix_create` + PDA |
| `plan_public_frame` | `authority` = Frame PDA (non-closeable; public scratch) |
| `FrameScratch::new` | New session on an existing Frame (production path) |

Public Frame check after decode (tests / debug only): `public_frame_authority(frame) == decoded.authority`.

(`decode_frame_account` — tests & debug only.)

## Structured CPI & patched CPI

Use `encode_cpi` / `build_ix_cpi` with structured patches from `ifx_core::structured_cpi`, or raw patched CPI templates via `cpi` helpers. See [structured-cpi-patches.md](../docs/structured-cpi-patches.md). Wire parity: `rust-sdk/src/parity.rs`.

## Modules

| Module | Role |
|--------|------|
| `scratch` | Planner |
| `frame` / `decode` | PDA, decode, readback (debug) |
| `expr` / `binding` / `typed` / `wire_ix` | IR + wire |
| `ix` / `cpi` | Instructions + CPI |
| `let_bindings` / `let_builder` | Let helpers |
| `frame_authority` | Public / private Frame `authority` helpers |
| `constants` | Program IDs, discriminators, tape limits |

## Examples

See [`examples/README.md`](./examples/README.md) — reference planners under `tests/common/planners/` (L0–L3); localnet e2e in `tests/localnet.rs`.

## Errors

On-chain codes surface as transaction failures; match messages with [error reference](../docs/errors.md) (6000–6035). Client-side planning errors: `ScratchError`.

## Program IDs

`IFX_DEVNET_PROGRAM_ID` · `IFX_LOCALNET_PROGRAM_ID` · `DEFAULT_IFX_PROGRAM_ID`. Set once on `FrameScratch` via `PlanNewFrameParams::program_id`.

## Tests

Unit + wire parity (no RPC):

```bash
cargo test -p ifx-sdk
```

Localnet integration (Surfpool / `anchor test` validator; skips when RPC unavailable):

```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=~/.config/solana/id.json
cargo test -p ifx-sdk --test localnet -- --nocapture
```

Or from repo root: `npm run rust:test` / `npm run rust:test:integration`.

## Other languages

TypeScript: [`@ifx-run/sdk`](../sdk/README.md). Go: [`go-sdk`](../go-sdk/README.md). Same on-chain wire. See repo [`docs/`](../docs/) for orchestration patterns.
