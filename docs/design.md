English | [中文](./design.zh-CN.md)

# Ifx design

Product and technical design for **Ifx** (principles and goals independent of implementation progress). Current on-chain behavior: [implementation.md](./implementation.md).

---

## 1. Overview

**Ifx** is an **execution orchestration program** on Solana:

- Express **SSA dataflow** (static single assignment) within one transaction
- Support **conditional assertions** and **conditional CPI**
- Not a VM, scripting engine, or general compute platform

> Elevate a transaction from an “instruction list” to a **DAG** that wallets, risk tools, and debuggers can understand.

---

## 2. Motivation

Common pain points on Solana:

- No transaction-scoped temporaries or unified conditional orchestration
- **New on-chain logic** goes through design, security review, and release
- Same-tx orchestration is sometimes built as **one-off programs** or **client-only tx assembly**
- Transaction structure is hard to interpret and audit statically when logic lives only in clients

Ifx expresses this logic on-chain with a **fixed, enumerable** instruction set; the **SDK compiles layout and IR**; the program only executes.

---

## 3. Core principles

### 3.1 SSA + flat tape

- **SSA:** Each logical value is assigned once; enforced by compiler/SDK.
- **Tape:** `Frame.tape` is a contiguous byte buffer — **not** a register file, **not** a fixed `ValueId → slot` table.
- **Layout:** On-chain `Frame.cursor` **appends** to `tape`; `payload_at[i]` records binding **index** → payload byte offset. Off-chain `FrameScratch` tracks `cursor` + `nextIndex`.
- **Reset:** `ifx_reset_frame` sets `cursor = 0`, `index_count = 0`, and **`generation = generation.wrapping_add(1)`** (lazy tape — see [frame-cu-optimization.md](./frame-cu-optimization.md)). Commonly at tx start when reusing a Frame PDA.
- **`ifx_let` batch order:** Append in `bindings` order; later bindings may reference earlier indices via `Expr::Value { index }`.

Index addressing and `payload_at` are **shipped** — see [implementation.md](./implementation.md), [frame-memory-index.md](./frame-memory-index.md), and [glossary.md](./glossary.md).

### 3.2 Transaction scope & Frame as scratch

- `tape` / `cursor` / `index_count` are **scratch for Ifx logic in a tx** — not a general-purpose state layer.
- The Frame **PDA can persist** on-chain. **Public** Frames (off-curve `authority`) allow anyone to `reset`/`let`; **private** Frames (on-curve `authority`) require the authority signer on writes — [frame-authority.md](./frame-authority.md).
- Ifx **does not guarantee** cross-tx consistency of tape session state. A **landed** Jito bundle only orders txs **inside that bundle** — see [bundles.md](./bundles.md). Prefer one business tx per Ifx flow.

### 3.3 Statically analyzable & top-level writes

- No loops, recursion, or dynamic codegen
- Expressions are finite-depth `Expr` trees
- Execution graph is fully recoverable from instruction args
- **Write** instructions (`create`, `reset`, `let`, `close`) are **transaction top-level only** — not for CPI wrap ([frame-authority.md](./frame-authority.md))
- Outbound CPI uses **`invoke`** only (no **`invoke_signed`**): patched steps must match ix you could place in the **outer** tx

### 3.4 On-chain / off-chain split

| Off-chain (compiler / SDK) | On-chain (program) |
|----------------------------|-------------------|
| SSA graph, node naming | — |
| `tape_len`, `indexCap`, simulated `cursor` / `nextIndex` | `reset_frame` + cursor append + `payload_at` |
| CPI `data` serialization (incl. tape reads via index) | `invoke` with prebuilt `data` |
| Account list and remaining order | Resolve accounts by index |

---

## 4. Frame & addressing

- **Frame PDA:** `["frame", payer, frame_id]`; `frame_id` is a 32-byte salt.
- **`authority`:** **off-curve** → public scratch writes; **on-curve** → private Frame (bot / relayer key signs `reset` / `let` / `close`). Full spec: [frame-authority.md](./frame-authority.md).
- **`tape_len`:** Tape size allocated at creation (`index_cap = min(256, tape_len / 2)`).

---

## 5. Data loading

On-chain reads use the [`LetBinding`](./typed-let-bindings.md) enum (tags `0`–`28`):

| Tag | Variant | Role |
|-----|---------|------|
| `0` | `AccountDataSlice` | Owner-checked raw slice; caller supplies `ty` and byte offset |
| `1` | `AccountLamports` | Lamports → fixed `U64` |
| `2` | `Eval` | Expression over frame tape (via binding index) |
| `3`–`8` | Clock / Rent sysvar | `Clock::get()` / `Rent::get()` syscalls — no remaining account |
| `9`–`28` | SPL Token / Token-2022 + account metadata + `FrameGeneration` / `FrameIndexCount` | Official unpack / frame fields — see [typed-let-bindings.md](./typed-let-bindings.md) |

**Prefer typed opcodes** over `AccountDataSlice` for sysvar fields, SPL balances, and mint fields.

**Token-2022:** Separate opcodes unpack via `StateWithExtensions` and extension accessors — TLV variability is handled by the official deserializer, not client-chosen offsets.

**Batch cache:** Within one `ifx_let` instruction, Token-2022 loads cache parsed field values per `account_index` (short borrow on miss; same extension parsed once). Cache does not persist across instructions.

---

## 6. CPI patch & conditions

- Arithmetic and comparisons in `ifx_let` via `Eval`.
- Conditions are `Expr`; `ifx_assert` / `ifx_if_else` take `cond: Expr`.
- `ifx_if_else` arms: **`Skip`**, **`Revert`**, or **1–254** sequential **`Cpi`** steps (wire u8 tag = step count).
- Each **`Cpi`** step starts with wire kind **`0` Static** · **`1` RawPatched** · **`2` Structured** ([`structured-cpi-patches.md`](./structured-cpi-patches.md)).
  - **RawPatched:** template `data` + optional **`patches`** (`PatchList`); byte overlay before invoke — DEX / escape hatch.
  - **Structured:** official registry ix; ix `data` assembled from typed Borsh patch — `[2][accounts_start][accounts_len][StructuredCpiPatch…]` (no template blob).
  - **Static:** template `data` invoked as-is (empty `PatchList`).
- Unconditional patched CPI: **`ifx_patched_cpi(arm: Cpi)`** — **RawPatched** or **Structured** (requires patch apply).
- **`RawCpiPatch`:** `{ data_offset: u16, source: Value }` — **RawPatched only**.

**Raw slices and byte patches** are escape hatches for layouts not in the typed registry; wallets should label them layout-unchecked.

## 7. SDK & interpretability

Developer experience ships in [`@ifx-run/sdk`](../sdk/README.md):

```ts
// Conceptual API
const a = tx.snapshotLamports(user)
const b = tx.snapshotLamports(user)
const delta = tx.sub(a, b)
const ok = tx.gt(delta, 0)
tx.invokeIf(ok, transferIx)
```

Compiled output is Anchor instruction sequences + Borsh args (`LetBinding`, `IfElseArgs`, …); wallets can render IR as an SSA graph.

---

## 8. Security & non-goals

**Out of scope:**

- VM / scripting language
- On-chain persistent business state layer
- Dynamic account metadata registry
- On-chain pubkey or owner-specific comparison types

**Not in current version:**

- On-chain dynamic patch of account meta (only patch `data` bytes)

**Raw slices:** `AccountDataSlice` and generic `RawCpiPatch` byte offsets are escape hatches; prefer typed `LetBinding` variants when available.

---

## 9. Core idea

> **Ifx = SSA (off-chain) + planner-assigned binding indices (off-chain) + typed tape execution (on-chain) + conditional CPI (on-chain).**

Not a register machine. Not a slot machine.
