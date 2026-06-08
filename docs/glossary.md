English | [中文](./glossary.zh-CN.md)

# Ifx glossary

Why Ifx names things the way it does — variables, accounts, wire fields, and SDK types. For behavior and limits, see [implementation.md](./implementation.md); for rationale vs the early temporary byte-offset prototype, see [frame-memory-index.md](./frame-memory-index.md).

---

## 1. Product & program

| Term | Meaning | Why this name |
|------|---------|---------------|
| **Ifx** | The on-chain orchestration program + its instruction IR | Short project name; encodes **instruction-level dataflow** (read → compute → assert → CPI), not a general VM. |
| **Orchestration** | Same-tx composition over existing programs (System, SPL, DEX) | Ifx does not replace those programs; it **orders and branches** CPIs based on values read mid-tx. |
| **IR** (intermediate representation) | Borsh-encoded instruction args (`LetBinding`, `Expr`, `Cpi`, …) | Wallets and risk tools can render a **static graph** from args — not hidden client logic. |
| **SSA** (static single assignment) | Each logical value is written once per session | Matches compiler theory; SDK enforces “one `let` slot per binding.” On-chain refs use **`Value.index`**, not reassignment. |
| **Session** | One contiguous append sequence on a Frame between **`reset`** and the next **`reset`** | Like a scratch pad page: cleared at tx start (usually), shared across multiple `ifx_let` in the same tx. |

---

## 2. Frame account & tape model

The **Frame** PDA holds a byte buffer (**tape**) plus a small index table. Names emphasize **append-only sequential storage**, not a register file or arbitrary heap.

| Term | Where | Meaning | Why this name |
|------|-------|---------|---------------|
| **Frame** | On-chain account | Transaction-scoped **execution context** for Ifx bindings | Analogous to a stack **frame**: locals live here for one “run,” then are cleared. PDA seed is `"frame"`. **Not** application business state. |
| **tape** | `Frame.tape: Vec<u8>` | Contiguous byte buffer; records are **appended** in order | From the **Turing-machine tape** metaphor: one sequential medium, write head moves forward. Replaces the temporary prototype field **`memory`**, which sounded like generic RAM or account data. |
| **tape_len** | `ifx_create_frame` arg | Fixed byte capacity of `tape` (1…65_535) | Length of the physical tape allocated at create; **no extend**. |
| **cursor** | `Frame.cursor: u32` | Next **byte offset** where append will write | The tape **write head**. Monotonic within a session until `reset`. Distinct from **`Value.index`** (binding slot number). |
| **payload_at** | `Frame.payload_at: Vec<u16>` | `payload_at[i]` = byte offset of binding **`i`**’s payload in `tape` | **Indirection table**: wire refs use small **`index`**, not byte offsets. “Payload” = typed value bytes; “at” = location in tape. |
| **index** (binding index) | `Value.index`, logs `$N` | 0-based sequence number of append order | First binding is **`0`**. Stable handle for `Expr::Value`, `CpiPatch.source`, and debug logs. |
| **index_count** | `Frame.index_count: u16` | Bindings appended since last reset | Count of used slots; next binding gets index `index_count` before increment. |
| **index_cap** | `Frame.index_cap: u16` | Max bindings (`payload_at.len()`) fixed at create | `min(256, tape_len / 2)`. Hitting cap → **`IndexCapReached`** (independent of tape bytes). |
| **record** | Tape layout | One binding: **`[ty:1][payload:ty.size()]`** packed at `cursor` | “Record” = one typed row on the tape (type tag + payload), not an account record. |
| **ty** / **ValueType** | First byte of each record | Primitive type tag (`Bool`, `U64`, …) | Short for **type**; size is fixed per variant (see [implementation.md](./implementation.md) §3). |
| **payload** | Bytes after `ty` | Little-endian value bytes | Everything **`Expr`** and **`CpiPatch`** read for a binding (type comes from `ty` at `payload_at[i] - 1` on chain). |
| **close_authority** | `Frame.close_authority` | Pubkey allowed to **`ifx_close_frame`** | Standard “who may close this account and reclaim rent” — not who may append or reset. |
| **frame_id** | PDA seed (32 bytes) | User-chosen salt with payer | Lets one payer hold **many** Frame PDAs; not stored in account body. Persist **`frame_id` + `tape_len`** off-chain after create. |
| **payer** | PDA seed | Frame rent payer | Anchor `#[account(init, payer = …)]` convention. |

### Why not “memory”, “slot”, or “register”?

| Avoid | Prefer | Reason |
|-------|--------|--------|
| **memory** | **tape** | “Memory” suggests account data, heap, or cross-tx state. Tape stresses **sequential append + reset**. |
| **register file** | **tape + payload_at** | No fixed `ValueId → register` table; only **index → byte offset** indirection. |
| **offset** (in `Value`) | **index** | The temporary prototype used **`Value.offset`** as a **byte** index (confusing vs CPI **`data_offset`**). **`index`** is explicitly a **binding number**. |

---

## 3. Instructions

| Instruction | Verb | Why this name |
|-------------|------|---------------|
| **`ifx_create_frame`** | Provision PDA once | **Create** allocates `tape` + `payload_at`; separate from business txs. |
| **`ifx_reset_frame`** | Start a clean session | **Reset** zeroes `cursor`, `index_count`, and `tape` bytes — like clearing scratch paper. No ACL. |
| **`ifx_close_frame`** | Reclaim rent | **Close** Frame PDA; requires **`close_authority`**. |
| **`ifx_let`** | Append bindings | **`let`** = bind a name/value (SSA). One ix may carry many **`LetBinding`**s in order. |
| **`ifx_assert`** | Hard-fail if false | **`assert!`**-style condition on **`Expr`**. |
| **`ifx_patched_cpi`** | CPI with tape-filled `data` | **Patched** = template instruction bytes + overlays from tape before **`invoke`**. |
| **`ifx_if_else`** | Conditional arm | **`if` / `else`** on **`Expr`**; each arm is an **`IfElseArm`** (`Skip`, `Revert`, or 1–254 **`Cpi`** steps). |

Prefix **`ifx_`** matches the program module and keeps instruction names grep-friendly in explorers.

---

## 4. Wire types & fields

### References & expressions

| Term | Meaning | Why this name |
|------|---------|---------------|
| **`Value`** | `{ index: u8 }` | Minimal **reference** to a prior binding — not the bytes themselves. |
| **`Expr`** | Flat Borsh enum (tags 0–42) | **Expression** tree: literals, ops, **`Value { index }`**, comparisons. Encoded with **Borsh**, not Anchor recursive coder. |
| **`LetBinding`** | One load or compute in **`ifx_let`** | **Binding** = produce one new tape record (account read, sysvar, SPL field, or **`Eval`**). |
| **`Eval`** | `LetBinding` variant with nested **`Expr`** | **Evaluate** expression over earlier indices, append result to tape. |
| **`Cond`** (SDK) | `TypedExpr<"bool">` or `ScratchValue<"bool">` | Condition type alias for assert / if_else — not a separate on-chain type. |

### CPI types

| Term | Field | Meaning | Why this name |
|------|-------|---------|---------------|
| **`Cpi`** | `accounts_start`, `accounts_len`, `data`, `patches` | Inner instruction template | **CPI** = cross-program invocation. **`patches`** empty → static step; non-empty → tape overlays applied before invoke. |
| **`CpiPatch`** | `data_offset`, `source: Value` | One patch range | **`data_offset`** = byte into **CPI template `data`** (e.g. Transfer amount @ 4). **`source.index`** = binding to copy **from tape**. |
| **`IfElseArm`** | `Skip` / `Revert` / `Cpi[]` | One branch outcome | **Arm** = one side of conditional (PL terminology). Up to **254** sequential **`Cpi`** steps per arm (wire tag = count); steps may mix static and patched. |
| **`remaining_accounts`** | Account metas slice | Extra accounts beyond ix struct fields | Anchor/Solana convention: indices in **`LetBinding`** and **`Cpi`** point into this slice. |

### Account reads (do not confuse with tape)

| Term | Field | Meaning | Why this name |
|------|-------|---------|---------------|
| **`AccountDataSlice`** | `offset: u32` | Byte offset into **`remaining[account_index].data`** | **Slice** of raw account bytes after owner check — unrelated to **`Value.index`**. |
| **`account_index`** | u8 | Index into **`remaining_accounts`** | Which passed account to read. |
| **`expected_program_owner`** | u8 | Index of owner pubkey in **`remaining_accounts`** | Validates **`account.owner`** before slicing — caller still responsible for layout. |
| **`AccountLamports`** | — | Read native SOL balance | Fixed **U64**; no byte offset on wire. |

### Collections on wire

| Term | Meaning | Why this name |
|------|---------|---------------|
| **`U8LenVec<T>`** / **`U16LenVec<T>`** | Length-prefixed vector | Explicit max sizes for account space math; **`u8`** vs **`u16`** length prefix. |

---

## 5. SDK (off-chain)

| Term | Meaning | Why this name |
|------|---------|---------------|
| **`FrameScratch`** | Planner + ix builders for one Frame pubkey | **Scratch** = tx draft pad mirroring on-chain session; **`Frame`** = which PDA. Holds **`cursor`**, **`nextIndex`**, optional **`tapeLen`**. |
| **`ScratchValue<T>`** | Planned binding with **`ref.index`** and type **`T`** | Value that **will** live on tape after **`ixLet`**; **`Scratch`** until landed. |
| **`nextIndex`** | SDK | Next binding index to assign | Mirrors **`index_count`** after **`refreshFromChain`**. |
| **`planRecordOffsets`** | `tape-layout.ts` | Computes **`tyOffset`**, **`payloadOffset`**, **`endCursor`** | Function name from the early prototype; still plans **byte layout** on tape for the next record. |
| **`indexCapForTapeLen`** | `min(256, floor(tapeLen / 2))` | Matches on-chain **`index_cap_for_tape_len`**. |
| **`DecodedFrame`** | Deserialized Frame account | Read **`tape`**, **`payload_at`**, **`readValue(slot)`** after fetch. |
| **`letBuilder`** | Batch many bindings → one **`ifx_let`** | Builds **`remaining_accounts`** dedupe + ordered **`LetBinding`** list. |
| **`cpi` / `cpiPatch`** | SDK helpers for **`Cpi`** wire steps | **`cpi(template, { patches })`** — use **`scratch.ixCpi`** for unconditional **`ifx_patched_cpi`** (patches required). **`cpiPatch(byteOffset, slot)`** — **`byteOffset`** is CPI data, **`slot.ref.index`** is tape binding. |
| **`staticCpi`** | Wrap known ix for **`ifx_if_else`** static step | Empty **`patches`** — prefer plain **`tx.add(ix)`** when unconditional. |
| **`$N`** (logs) | Binding index in pseudocode | See [debugging.md](./debugging.md): **`let $0: u64 = …`**. |

---

## 6. Errors (name → situation)

| Code name | When | Name intent |
|-----------|------|-------------|
| **`TapeOutOfBounds`** | Next record would exceed **`tape_len`** | Tape **bytes** full — not index table. |
| **`IndexCapReached`** | **`index_count == index_cap`** | **Binding slots** exhausted — tape may still have free bytes. |
| **`InvalidTapeLen`** | Create arg out of range | Invalid **`tape_len`**, not invalid index. |
| **`InvalidValueIndex`** | Read unknown / out-of-range **`Value.index`** | Bad **binding** reference, not bad byte offset. |
| **`IfElseRevert`** | Arm chose **`Revert`** | Explicit branch failure (distinct from assert). |

Full table: [errors.md](./errors.md).

---

## 7. Quick disambiguation

| You see… | It means… | It is **not**… |
|----------|-----------|----------------|
| **`tape`** | Append-only byte buffer on Frame | Account data, heap, or durable app state |
| **`cursor`** | Next write byte in **`tape`** | Binding index (`$N`) |
| **`Value.index`** | Binding #N (0-based) | Byte offset in tape or CPI data |
| **`CpiPatch.data_offset`** | Byte in CPI template **`data`** | Frame binding index |
| **`AccountDataSlice.offset`** | Byte in token/mint **account data** | Frame tape position |
| **`payload_at[i]`** | Where binding **i**’s payload bytes start | The payload bytes themselves |
| **`index_cap`** | Max number of bindings | Max **`tape_len`** (bytes) |
| **`reset`** | Clear session (`cursor`, bindings count, tape bytes) | Close PDA or shrink allocation |
| **`Frame` PDA persists** | Account exists on-chain | Tape contents are trustworthy cross-tx (they are not — see [bundles.md](./bundles.md)) |

---

## 8. Related docs

| Topic | Doc |
|-------|-----|
| Layout & limits | [implementation.md](./implementation.md) |
| Design principles | [design.md](./design.md) |
| Frame index design rationale | [frame-memory-index.md](./frame-memory-index.md) |
| `LetBinding` opcodes | [typed-let-bindings.md](./typed-let-bindings.md) |
| Log `$N` format | [debugging.md](./debugging.md) |
