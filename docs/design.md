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
- The Frame **PDA can persist** on-chain. **Public** Frames (off-curve `authority`) allow anyone to `reset`/`let`; session safety in production comes from **`reset` at each atomic unit start** (one tx or one landed bundle) — [frame-authority.md](./frame-authority.md) §3.4. **Private** Frames (on-curve `authority`) for pre-signed read without `reset`, or `close`.
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

- **Frame PDA:** `["frame", payer, frame_id]`; `frame_id` is a 32-byte salt used **only at create** to derive the address.
- **`authority`:** **off-curve** → public scratch writes; **on-curve** → private Frame (bot / relayer key signs `reset` / `let` / `close`). Full spec: [frame-authority.md](./frame-authority.md).
- **`tape_len`:** Tape size allocated at creation (`index_cap = min(256, tape_len / 2)`).

### 4.1 Frame address identity (closed loop)

**Design intent:** After `ifx_create_frame`, the Frame’s **pubkey is the sole runtime identifier**. `frame_id` is a one-time PDA salt — it is **not stored** in the account body and is **not** passed to `reset`, `let`, `assert`, `if_else`, `patched_cpi`, or `close`.

| Phase | What identifies the Frame | `frame_id` in ix? |
|-------|---------------------------|------------------|
| **Create** | Anchor derives `PDA(["frame", payer, frame_id])` | ✅ instruction arg (for seeds) |
| **Reset / let / assert / CPI / close** | `frame` account pubkey in the tx | ❌ |

**Why seeds are not re-checked on non-create instructions**

- Re-verifying `["frame", payer, frame_id]` on every `reset`/`let` would require carrying `payer` + `frame_id` in each instruction again — extra bytes, account resolution, and **CU** — without adding security once the correct **address** is already in the transaction.
- The address **is** the commitment to `(payer, frame_id)` from create. Integrators persist **`scratch.frame`** (pubkey) + `tape_len` (+ `authority` when private). They may discard `frame_id` after provisioning.
- On-chain validation on non-create paths: `FrameAccount::try_from` (Ifx owner + layout) and, for writes/close, [`frame-authority.md`](./frame-authority.md) write gates. Passing a random non-Frame pubkey fails; passing a **different valid Frame** address is the same class of bug as using the wrong ATA in any Solana program — prevented by the SDK/planner, not by re-deriving seeds.

**Integrator checklist:** use `planPublicFrame` / `planNewFrame` once → persist `frame` pubkey → all later txs use `FrameScratch` methods or `createIx*` with that pubkey only. To reclaim rent, `ixCloseFrame` also needs only `frame` + `authority` signer — no `frame_id`.

---

## 5. Data loading

On-chain reads use the [`LetBinding`](./typed-let-bindings.md) enum (tags `0`–`67`):

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
  - **Structured (type-safe):** official registry ix; on-chain validates program id + patch variant; ix `data` assembled from typed Borsh patch — `[2][accounts_start][accounts_len][StructuredCpiPatch…]`.
  - **RawPatched (type-unsafe):** template `data` + **`patches`** (`PatchList`); byte overlay before invoke — DEX / custom / non-registry layouts. **Program id is builder-chosen**; Ifx does not maintain a Raw allowlist ([`raw-cpi-patches.md`](./raw-cpi-patches.md) § design intent).
  - **Static:** template `data` invoked as-is (empty `PatchList`); program id also builder-chosen.
- Unconditional patched CPI: **`ifx_patched_cpi(arm: Cpi)`** — **RawPatched** or **Structured** (requires patch apply).
- **`RawCpiPatch`:** `{ data_offset: u16, source: Value }` — **RawPatched only**.

**Division of responsibility:** prefer **Structured** for registry ix (System / SPL / Token-2022 / Stake). Use **Raw** when generality matters — same trade-off as typed vs `unsafe` APIs: the **transaction constructor** is responsible for correct template, accounts, offsets, and target program. Optional Raw whitelists would not be meaningfully safer without duplicating Structured field-by-field.

**Raw slices:** `AccountDataSlice` and generic `RawCpiPatch` byte offsets are additional escape hatches; prefer typed `LetBinding` variants when available.

## 7. SDK & interpretability

Developer experience ships in [`@ifx-run/sdk`](../sdk/README.md), [`go-sdk`](../go-sdk/README.md), and [`ifx-sdk`](../rust-sdk/README.md) (same planner layer):

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
