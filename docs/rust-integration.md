English | [中文](./rust-integration.zh-CN.md)

# Rust & Anchor integration

How to use Ifx from **Rust** projects: on-chain CPI, off-chain transaction building, and where `@ifx-run/sdk` fits.

---

## Who this is for

| Role | Recommended path |
|------|------------------|
| **App / bot / wallet (off-chain)** | [`@ifx-run/sdk`](../sdk/README.md) or [`go-sdk`](../go-sdk/README.md) — layout planning, `expr` builders, instruction encoding |
| **Anchor program (on-chain CPI)** | `ifx` program crate with `features = ["cpi"]` |
| **Pure Rust off-chain (advanced)** | Path dependency on `ifx` crate for wire types + manual Borsh encoding (must match SDK codec) |

There is **no published Rust SDK crate** yet (planned: `ifx-core` + `ifx-sdk`). The program crate (`programs/ifx`) is the source of truth for wire types and on-chain semantics.

**Planned client SDKs (Go P0, Rust P1):** [client-sdks.md](./client-sdks.md)

---

## Off-chain: TypeScript or Go SDK

For almost all integrators, encode transactions with **`@ifx-run/sdk`** or **[`go-sdk`](../go-sdk/README.md)** (same wire; Go needs no Node):

- `FrameScratch` simulates tape layout (`planRecordOffsets` + `indexCapForTapeLen`)
- `expr.*` builds flat `Expr` trees (Borsh tags 0–43)
- `letBuilder` / `ixLet` deduplicates `remaining_accounts`

A Rust backend can:

1. Call the **Go SDK** from a sidecar or separate service, or
2. Shell out to a small TS script that returns serialized instructions, or
3. Call the SDK via Node from Rust, or
4. Reimplement the codec (see below) and keep golden tests aligned with `tests/sdk_expr_flat.ts`

**Do not** use Anchor's recursive instruction coder for [`Expr`](../programs/ifx/src/state/types.rs). `Expr` is a deep recursive enum; Anchor's coder can stack-overflow. The program uses **Borsh** with a flat per-operator tag layout. Encode with SDK `codec.ts` or `borsh` against the same shape.

---

## On-chain: CPI from another Anchor program

```toml
# your-program/Cargo.toml
[dependencies]
ifx = { path = "../ifx/programs/ifx", features = ["cpi"] }
```

```rust
use anchor_lang::prelude::*;
use ifx::cpi::accounts::{ResetFrame, Let};
use ifx::{LetArgs, /* … */};

// PDA: seeds = [b"frame", payer.as_ref(), frame_id.as_ref()]
// Discriminators: programs/ifx/src/constants.rs (IX_DISC_*)
```

**Rules:**

- **`ifx_let` must be a top-level instruction** in the transaction (stack height 1). Do not CPI into `ifx_let` from your program.
- You may CPI into `ifx_assert`, `ifx_patched_cpi`, `ifx_if_else`, `ifx_reset_frame` depending on your flow.
- Pass **`remaining_accounts`** in the order your bindings / CPI arms expect (same as SDK `LetIxBuilder`).

Instruction-level docs live in [`programs/ifx/src/lib.rs`](../programs/ifx/src/lib.rs) and flow into `idl/ifx.json`.

---

## Wire types (shared)

| Type | Serialization | Notes |
|------|---------------|-------|
| `Expr` | **Borsh**, flat enum tags **0–43** | See [implementation.md](./implementation.md) §5 |
| `LetBinding` | Anchor / Borsh enum tags **0–28** | See [typed-let-bindings.md](./typed-let-bindings.md) |
| `LetArgs.bindings` | `U8LenVec<LetBinding>` | u8 length prefix + elements (max 255) |
| `Cpi` step | Wire kind **`0/1/2`** + payload | **Static** / **RawPatched** (`U16LenVec` data + patches) / **Structured** (`[2][accounts_start][accounts_len][StructuredCpiPatch Borsh…]`, no template) — [structured-cpi-patches.md](./structured-cpi-patches.md) |
| `ifx_patched_cpi` ix data | **`Cpi`** (Anchor arg) | Wire kind **`0/1/2`** + payload — see [structured-cpi-patches.md](./structured-cpi-patches.md) |
| `ifx_if_else` ix data | **`IfElseArgs`** (Anchor arg) | `Expr` cond + two custom-wire [`IfElseArm`] sides |
| `Value` | `index: u8` | Binding index (0-based append order) |
| `RawCpiPatch` | `{ data_offset: u16, source: Value }` | **RawPatched only** — patch template `data` before invoke |

---

## Tape layout (off-chain must match on-chain)

Each binding appends **`[ty:1][payload:ty.size()]`** to `Frame::tape` and records **`payload_at[index]`**. Wire refs use **`Value.index`** only.

| Limit | On-chain error | Off-chain |
|-------|----------------|-----------|
| Binding count | `IndexCapReached` (6022) | `binding index cap reached` |
| Tape bytes | `TapeOutOfBounds` (6001) | `scratch would exceed tape` |

At create: `tape_len` up to **65_535**; `index_cap = min(256, tape_len / 2)`.

Off-chain simulation:

- Rust: [`plan_record_offsets`](../programs/ifx/src/state/tape.rs), [`index_cap_for_tape_len`](../programs/ifx/src/constants.rs)
- TypeScript: `@ifx-run/sdk` `planRecordOffsets`, `indexCapForTapeLen`
- Go: `go-sdk/frame` decode + `scratch` planner (same rules)

Mismatch → layout errors, `InvalidValueIndex`, or silent wrong reads.

---

## `remaining_accounts` layout

### `ifx_let`

All accounts referenced by `account_index` / `expected_program_owner` / `expected_program_index` in bindings, **deduplicated**, in first-seen order. Index `0` is the first unique account in that list.

SDK handles this via `FrameScratch.letBuilder()`.

### `ifx_patched_cpi` / `IfElseArm::Cpi`

`remaining_accounts[accounts_start .. accounts_start + accounts_len]` = **`[program_id, …inner_instruction_accounts]`**. The inner slice does **not** repeat the program id.

When `patches` is non-empty, bytes copy from `Frame::tape` (via `payload_at[source.index]`) into `Cpi.data` at `data_offset` before invoke. Empty `patches` = static step (template `data` as-is).

---

## Pure Rust off-chain encoding (advanced)

1. Path-depend on `ifx` with `default-features = false, features = ["no-entrypoint"]` (or `"cpi"` if you only need types in another program).
2. Build `LetBinding` / `Expr` values in Rust.
3. Serialize `Expr` with **`borsh::to_vec`** (not `AnchorSerialize`).
4. Serialize instruction data: 1-byte discriminator (`constants.rs`) + Borsh args.
5. Plan with `plan_record_offsets` + sequential binding indices before filling `Expr::Value { index }`.
6. Compare bytes against `@ifx-run/sdk` output in tests.

---

## Errors & debugging

| Doc | Contents |
|-----|----------|
| [errors.md](./errors.md) | Full error code table (6000–6035) |
| [debugging.md](./debugging.md) | Program log pseudocode format |
| [implementation.md](./implementation.md) | Instructions, limits, types |

---

## Related docs

| Doc | Contents |
|-----|----------|
| [sdk/README.md](../sdk/README.md) | Primary integration guide |
| [typed-let-bindings.md](./typed-let-bindings.md) | `LetBinding` opcode registry |
| [bundles.md](./bundles.md) | Multi-tx / Jito bundle semantics |
| [development.md](./development.md) | IDL sync, build, test (maintainers) |
