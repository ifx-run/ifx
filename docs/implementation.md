English | [中文](./implementation.zh-CN.md)

# Ifx on-chain implementation

Describes the **Anchor program currently in this repo** (`programs/ifx`). Transaction assembly, layout, and SDK: [design.md](./design.md), [roadmap.md](./roadmap.md).

**Program ID (localnet):** `ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD`

---

## 1. Instructions

| Instruction | Purpose |
|-------------|---------|
| `ifx_create_frame` | Create Frame PDA; allocate `tape` + `payload_at`; `cursor = 0`, `index_count = 0`, `generation = 0` |
| `ifx_reset_frame` | Reset scratch: `cursor = 0`, `index_count = 0`, `generation.wrapping_add(1)` (lazy — tape not zeroed; see [frame-cu-optimization.md](./frame-cu-optimization.md)) |
| `ifx_close_frame` | Close Frame; reclaim rent |
| `ifx_let` | Evaluate `bindings` in order and **append** to `tape` |
| `ifx_assert` | Evaluate `cond: Expr` to bool |
| `ifx_assert_multi` | Evaluate `U8LenVec<Expr>` in order; short-circuit on first false |
| `ifx_patched_cpi` | CPI; patch template `data` from Frame tape (`Cpi` + `RawCpiPatch`; requires non-empty patches) |
| `ifx_if_else` | Conditional branch: `Skip` / `Revert` / CPI sequence per arm | Evaluates `cond`; runs `then_arm` or `else_arm` (`IfElseArm`) |

- `ifx_let`, `ifx_reset_frame`, `ifx_close_frame`, and `ifx_create_frame` must run at **transaction top level** (`stack height == 1`) — [frame-authority.md](./frame-authority.md).
- CPI in `ifx_let` / `ifx_patched_cpi` / `ifx_if_else` uses **`remaining_accounts`** indices.
- On-curve Frame **`authority`** requires **`authority: Signer`** on `reset` / `let` / `close`; off-curve = public writes.
- `ifx_if_else` evaluates `cond` in a short read borrow, then runs CPI without holding the frame read lock (see [frame-authority.md](./frame-authority.md) §5.4).
- **SDK convention:** Before the first `ifx_let` in a business tx, call `ifx_reset_frame` unless this tx continues bindings from an earlier tx in the **same landed bundle** (then omit reset). Provision with `ifx_create_frame` in a **separate tx**.

---

## 2. Account: Frame

```rust
#[account]
pub struct Frame {
    pub authority: Pubkey,
    pub cursor: u32,        // next tape byte (monotonic until reset)
    pub index_count: u16,   // bindings appended since reset
    pub index_cap: u16,     // payload_at.len() at create
    pub generation: u64,    // 0 at create; wrapping_add(1) on each reset
    pub payload_at: Vec<u16>, // payload_at[i] = byte offset of binding i payload
    pub tape: Vec<u8>,
}
```

- **PDA seeds:** `["frame", payer, frame_id]` (`frame_id` 32-byte salt; not stored in account body). Seeds are enforced **only on `ifx_create_frame`** (Anchor `init`). All other instructions identify the Frame by **account pubkey** only — no `frame_id` in ix data, no seeds re-check ([design.md §4.1](./design.md#41-frame-address-identity-closed-loop); intentional — saves CU).
- **`tape_len`:** `1..=65_535` at create (fixed; no extend)
- **`index_cap`:** `min(256, tape_len / 2)` — fixed `payload_at` table size at create
- **Account space:** `1 + 32 + 4 + 2 + 2 + 8 + 4 + (index_cap×2) + 4 + tape_len`
- **Instruction discriminators:** 1 byte each (`0`…`6`, see `programs/ifx/src/constants.rs`)

### Reset & append

1. `ifx_reset_frame` or `ifx_create_frame`: `cursor = 0`, `index_count = 0` (`ifx_create_frame` also sets `generation = 0`; `reset` increments `generation` with `wrapping_add(1)` and does not byte-clear `tape` / `payload_at`).
2. Each `ifx_let` processes `bindings` **in order**:
   - Assign binding **index** = current `index_count`
   - Plan tape layout (**packed:** `ty @ cursor`, `payload @ cursor + 1`)
   - Write `[ty:1][payload]`; set `payload_at[index] = payload_byte_offset`
   - Increment `index_count`; move `cursor` to end of record
3. Multiple `ifx_let` in one tx: **share** the same session (Frame must exist).
4. New transaction: **`ifx_reset_frame`** unless continuing in the **same landed bundle** (pattern 3).

**Packed tape:** each record uses `1 + ty.size()` bytes contiguously.

**No extend:** size `tape_len` and `index_cap` at create; use `FrameScratch` to plan both tape bytes and binding count.

**Append failures (independent):** `IndexCapReached` (binding indices) vs `TapeOutOfBounds` (tape bytes) — see [errors.md](./errors.md).

---

## 3. Types (`ValueType`)

| `ValueType` | Bytes |
|-------------|-------|
| `Bool`, `U8`, `I8` | 1 |
| `U16`, `I16` | 2 |
| `U32`, `I32`, `F32` | 4 |
| `U64`, `I64`, `F64` | 8 |
| `U128`, `I128` | 16 |
| `Pubkey` | 32 |

Tape `Pubkey` loads: prefer **`AccountKey`** (ALT-friendly); **`ConstPubkey`** / **`Expr::ConstPubkey`** allowed with explicit ix-data cost.

---

## 4. `ifx_let`

[`LetBinding`](./typed-let-bindings.md) is a **single wire enum** (tags `0`–`67`). On-chain bindings **append in order**; there is no per-binding offset field on wire.

**Off-chain:** Assign sequential binding **index** per planned value; fill `Expr::Value { index }`.

**Batch dependencies:** Within one `ifx_let`, later bindings’ `Expr::Value` may read earlier appended offsets (sequential eval + immediate append).

| Tag | Variant | Meaning |
|-----|---------|---------|
| `0` | `AccountDataSlice { ty, account_index, offset, expected_program_owner }` | Owner-checked slice of `remaining[account_index].data` |
| `1` | `AccountLamports { account_index }` | Lamports → `U64` |
| `2` | `Eval { expr }` | Expression tree (type inferred) |
| `3`–`8` | Clock / Rent sysvar | Syscall reads; see [typed-let-bindings.md](./typed-let-bindings.md) |
| `9`–`26` | SPL Token / Token-2022 typed + `AccountDataLen` / `AccountKey` / `ConstPubkey` | Official unpack; see [typed-let-bindings.md](./typed-let-bindings.md) |
| `27`–`28` | `FrameGeneration` / `FrameIndexCount` | Frame metadata (`generation`, `index_count`); no `remaining` account |

### Frame tape records & `Value` refs

Each `ifx_let` binding writes **`[ty:1][payload:ty.size()]`** to `tape` and records **`payload_at[index]`**.

```rust
pub struct Value { pub index: u8 }  // binding index (0-based append order)
```

Off-chain `FrameScratch` assigns sequential binding indices; **type is implied by `LetBinding` variant** (or inferred for `Eval`), not on `Expr::Value` / `RawCpiPatch` wire. Reads resolve `payload_at[index]` → tape bytes.

---

## 5. Expressions (`Expr`)

Flat enum: **one Borsh tag per operator** (no nested `Unary`/`Binary` + `*Operator` shells). Tags **`0`–`51`** — see `sdk/src/expr-variants.ts` (`ConstPubkey` = 51; cast family `AsU8`…`AsI128` at 18–28). Next append-only tag: **52**.

**Core:** `Value`, `Const*`, `Not`, `Neg`, comparisons, `Add`…`Max`, `Div`.

**Settlement helpers:** `IsZero`, `NonZero`, `AsU64`, `AsU128`, `SaturatingSub`, `And`, `Or`, `MulDivFloor`/`Ceil`, `Clamp`, `Select`, `DivFloor`/`DivCeil`, `BpsMulFloor`/`Ceil`.

Comparisons: `infer_expr_ty` on subtrees; lhs/rhs types must match.

---

## 6. Conditional execution

- `ifx_assert(cond: Expr)` — revert if false
- `ifx_assert_multi(args: AssertMultiArgs)` — revert on first false (`AssertFailedMulti`; index in return data)
- `ifx_patched_cpi(arm: Cpi)` — one **RawPatched** or **Structured** step (requires patch apply)
- `ifx_if_else(args: IfElseArgs)` — `cond` + two [`IfElseArm`] sides
- **`IfElseArm` wire:** `0x00` skip · `0xff` revert · `1..254` = N × [`Cpi`] step
- **`Cpi` wire kind** (first byte per step): **`0` Static** · **`1` RawPatched** · **`2` Structured** ([`structured-cpi-patches.md`](./structured-cpi-patches.md))
  - **Static:** `[0][accounts_start][accounts_len][U16LenVec data]` — invoke template as-is
  - **RawPatched:** `[1][accounts_start][accounts_len][data][PatchList]` — byte overlay via [`RawCpiPatch`]; DEX / non-registry layouts; **builder-chosen program id** (type-unsafe by design — [`raw-cpi-patches.md`](./raw-cpi-patches.md))
  - **Structured:** `[2][accounts_start][accounts_len][StructuredCpiPatch Borsh…]` — **no ix data template**; flat enum (variant tag **0–32** inside Borsh blob); official System / SPL / Token-2022 / Stake registry; on-chain program-id check
- **`U8LenVec<T>`:** **u8** element count + Borsh elements (max 255); `LetArgs::bindings`
- **`U16LenVec<T>`:** **u16 LE** element count + elements; RawPatched `Cpi::data` and `PatchList`
- **`RawCpiPatch`:** `{ data_offset: u16, source: Value }` — **RawPatched only**; copies typed bytes from `payload_at[source.index]`

---

## 7. Typical transactions

```text
# Provisioning — standalone tx
ifx_create_frame

# Business tx — typical
ifx_reset_frame → ifx_let → ifx_assert / ifx_assert_multi / ifx_patched_cpi / ifx_if_else → …

# Split — same landed Jito bundle only: tx1 reset+let, tx2 let+… (no reset)

# Teardown — standalone tx (optional)
ifx_close_frame
```

---

## 8. Constants & errors

| Constant | Meaning |
|----------|---------|
| `MIN_TAPE_LEN` | `1` (lower bound for `tape_len`) |
| `MAX_FRAME_TAPE_LEN` | `65_535` (`tape` bytes; `payload_at` entries are `u16`) |
| `MAX_BINDING_INDEX` | `256` (max `index_cap`; wire `Value.index` is `u8`) |

Practical limits: `index_cap` at create, tape full, Solana tx size, rent, BPF CU.

Error codes: [errors.md](./errors.md) (Anchor codes 6000+).

---

## 9. Source index

| Path | Purpose |
|------|---------|
| `programs/ifx/src/lib.rs` | instruction entrypoints |
| `programs/ifx/src/state/tape.rs` | `reset_session`, `append_value`, `plan_record_offsets` (packed) |
| `programs/ifx/src/state/let_exec.rs` | `ifx_let` evaluation |
| `programs/ifx/src/instructions/reset_frame.rs` | `ifx_reset_frame` |

Generate client types: `anchor build` → `target/types/ifx.ts`.
