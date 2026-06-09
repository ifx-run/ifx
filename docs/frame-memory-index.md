English | [中文](./frame-memory-index.zh-CN.md)

# Frame tape model (index addressing)

**Status: shipped — first public wire format.** Canonical spec: **[implementation.md](./implementation.md)**. This document explains **why** Frame uses binding **index** addressing plus a **`payload_at`** table, and contrasts with an **early temporary in-repo prototype** (byte-offset `Value.offset`, `memory` field) that was **never published** to npm or mainnet.

There is **no production migration** from the temporary scheme; the contrast is historical context for contributors only.

---

## 1. Problem with the temporary byte-offset prototype

In the temporary prototype, `Value.offset` was the **payload byte index** in `Frame.memory` (type tag at `offset - 1`). `MAX_FRAME_MEMORY_LEN = 256`.

| Limit | Consequence |
|-------|-------------|
| `offset: u8` | Payload must start at byte `≤ 255` |
| `memory_len ≤ 256` | Total tape size capped at 256 bytes |
| Coupled limits | A few large bindings (`u128`, alignment) can exhaust **space** before hitting 256 bindings; many small bindings (`bool`) can exhaust **byte indices** while bytes remain unused |

For **[bundle pattern 3](./bundles.md)** (tx2 continues bindings **without** `reset`), `cursor` accumulates across txs in the same landed bundle. Complex flows can hit the 256-byte wall even when fewer than 256 logical SSA values are needed — or fail because the next payload byte index would exceed 255.

**Pattern 1** (one business tx) and **pattern 2** (each Ifx tx `reset`s) mostly fit the temporary prototype.

---

## 2. Design goals (shipped Frame model)

1. **Keep wire compact** — `Value` reference stays **1 byte** (`u8`).
2. **256 bindings is enough** — treat **256 SSA bindings** as a product ceiling aligned with Solana tx scale (account count, tx size, CU). **No goal to support binding 257.**
3. **Decouple binding index from tape bytes** — wire still allows up to **256** indices (`u8`); physical tape sized at `ifx_create_frame`. **`payload_at` length is derived from `tape_len`**, not always 256 (see [§4](#4-on-chain-frame-layout-proposal)).
4. **O(1) read by index** — no tape scan to resolve binding `k`.
5. **Preserve append-only packed tape** — `[ty:1][payload:ty.size()]` back-to-back; **no alignment padding** (same packed layout as the temporary prototype).

---

## 3. Core semantic change

| | Temporary prototype (never published) | Shipped Frame |
|--|---------------------------------------|---------------|
| `Value.offset` meaning | **Byte index** of payload in `memory` | **Binding index** (0-based sequence number of append order) |
| Pseudocode `$N` | Often coincides with byte offset | **Nth binding** (clearer) |
| Max referencable bindings | ~few dozen–30 (typical), hard-capped by bytes | **`index_cap`** at create: `min(256, f(memory_len))`; wire index `< index_cap` |
| `memory_len` at create | `1..=256` | `1..=MAX` (see [§5](#5-memory_len-limits)) |
| Resolve read | Direct byte offset | `payload_at[index]` → byte offset → read tape |

Renaming the wire field to `Value.index` is used in shipped code and docs; keeping the field name `offset` with new semantics would be confusing.

---

## 4. On-chain Frame layout (proposal)

```text
Frame {
  authority: Pubkey
  cursor: u32              // next append position in memory (bytes)
  index_count: u16         // bindings appended since last reset
  index_cap: u16           // = payload_at.len(); fixed at create
  generation: u64          // 0 at create; wrapping_add(1) on each reset
  payload_at: Vec<u16>     // len = index_cap; payload_at[i] = byte offset of binding i's payload
  memory: Vec<u8>          // physical tape, len = memory_len at create
}
```

### 4.0 Sizing `payload_at` from `memory_len`

`payload_at` is **variable-length**, allocated once at **`ifx_create_frame`**. Its length (`index_cap`) is **not** always 256 — it is computed from `memory_len`:

```text
index_cap = min(256, f(memory_len))
```

`f` is a **protocol-defined, deterministic** upper bound on how many bindings could fit in the tape if every binding used the **smallest record** (`bool`: `[ty:1][payload:1]` → **2 bytes** per binding, sequential layout). Example implementation sketch:

```text
f(memory_len) = memory_len / 2   // floor; bool-sized records, no alignment slack
```

| `memory_len` | `index_cap` | Intuition |
|--------------|-------------|-----------|
| 20 | 10 | Small frame; at most ~10 bool-sized bindings if tape fills |
| 256 | 128 | Default-sized tape; index table **128 × 2 = 256 B**, not 512 B |
| 8192 | 256 | Large tape; hits **wire ceiling** (`u8` index) |

**Why:** rent and account size should scale with the frame you actually provision. A minimal frame does not pay for 256 unused `u16` entries.

**Absolute ceiling:** `index_cap ≤ 256` (Solana / product binding limit; `Value.index` is `u8`).

**Append-time reality:** `f` is optimistic. A frame with `index_cap = 10` may hold **fewer than 10** bindings if types are large (`u128`) — **tape full** before **index exhausted**. Conversely, many `bool`s may hit **`index_count == index_cap`** before `cursor == memory_len`. Both checks stay in place.

SDK and program **must use the same `f`** when validating `ifx_create_frame`.

### 4.1 Append (`ifx_let`)

For each binding in order:

1. Plan tape layout from `cursor` and `ValueType` (**packed:** `ty @ cursor`, `payload @ cursor + 1`; same as the temporary prototype).
2. Let `index = index_count`.
3. Write `[ty][payload]` into `memory`.
4. Set `payload_at[index] = payload_byte_offset` (u16).
5. `cursor = endCursor`; `index_count += 1`.
6. Fail if `index_count >= index_cap` (**index cap reached**) or `endCursor > memory.len()` (**tape full**).

### 4.2 Read (`eval_expr`, `RawCpiPatch`, …)

```text
resolve(index k):
  require k < index_count
  require k < index_cap
  off = payload_at[k]
  ty  = memory[off - 1]
  payload = memory[off .. off + ty.size()]
```

**O(1)** per reference: one u16 table load + contiguous tape read.

### 4.3 Reset (`ifx_reset_frame`)

- `cursor = 0`
- `index_count = 0`
- `generation = generation.wrapping_add(1)` (`0` at create)
- **Lazy tape:** does not zero `memory` (O(`memory_len`) avoided); stale bytes unreachable until re-append (`index < index_count` guard)
- **`payload_at` need not be cleared** — entries are only read for `k < index_count`.

### 4.4 Account size / rent

At create:

```text
account_bytes ≈ frame_header + memory_len + (index_cap × 2)
index_cap = min(256, f(memory_len))
```

Examples:

| Profile | `memory_len` | `index_cap` | `payload_at` rent |
|---------|--------------|-------------|-------------------|
| Minimal | 256 | 128 | 256 B |
| Tiny | 20 | 10 | 20 B |
| Bundle | 8192 | 256 | 512 B |

Allocated at **`ifx_create_frame`** only — **not** grown per binding.

---

## 5. `memory_len` limits

Two **independent** failure modes (per frame, after create):

| Failure | When |
|---------|------|
| **Index cap reached** | `index_count == index_cap` (`index_cap = min(256, f(memory_len))`) |
| **Tape full** | Next binding would push `cursor` past `memory_len` |

Planning at create:

- **`memory_len` default** may stay **256** → `index_cap = 128` with `f = memory_len / 2` (see [§4.0](#40-sizing-payload_at-from-memory_len)).
- **Bundle / pattern 3** planners may pass **4096**, **8192**, or similar — `index_cap` hits **256**; size tape for worst-case **types** (e.g. 256×`u128` packed ≈ 4352 B), not binding 257.

Protocol hard cap:

- **`index_cap ≤ 256`** (wire / product).
- If `payload_at` entries are **u16**, **`memory_len ≤ 65_535`** is the natural pairing for byte offsets in the table.
- Solana account size (~10 MiB) is an absolute upper bound; a product constant (e.g. **8192** or **16384**) may be chosen below that.

**Note:** `f(memory_len)` sizes the **index table**, not a guarantee that `index_cap` large bindings fit. Large tapes are for **large types**; small tapes imply a **low index cap** even though wire index is still 1 byte.

---

## 6. Off-chain planner (SDK)

| State | Role |
|-------|------|
| **`nextIndex`** (or `indexCount`) | Wire `Value.index`; increment by 1 per planned binding; enforce `< indexCap`. |
| **`indexCap`** | From create: `min(256, f(tapeLen))`; decoded from Frame account (`payload_at.len()` / `index_cap`). |
| **`cursor`** | Simulate tape layout (`planRecordOffsets`); enforce `endCursor ≤ tapeLen`. |
| **`tapeLen`** | From create params (`ifx_create_frame` arg). |

After **`ifx_reset_frame`**: local `cursor = 0`, `nextIndex = 0`.

**Bundle pattern 3** (no reset on later tx): **`refreshFromChain`** / **`fromFrame`** should sync **`cursor`**, **`index_count`**, and read **`generation`** from the Frame account before planning more bindings (tests / lab only — not production wallet paths).

Index alone is **not** enough to check tape space (256 `bool` vs 256 `u128` differ); **cursor simulation stays required** for layout parity and overflow checks.

---

## 7. Coexistence (historical note)

If we **had** published the temporary scheme and later shipped index addressing, options would include:

| Approach | Idea | Pros | Cons |
|----------|------|------|------|
| **A. No coexistence** | New deploy / breaking upgrade; close old Frames | Simplest semantics | Migration effort |
| **B. Frame `version` byte** | Same program; byte-offset reads vs index + `payload_at` | One program ID | Branching in append/read; test matrix doubles |
| **C. Separate account type** | e.g. distinct discriminator + separate create ix | Clear separation at account level | Two account layouts in one program |
| **D. Second program ID** | Deploy a second program | Clean break | Two programs to maintain / document |

**Actual path:** index addressing shipped **before** npm / mainnet, so **A applies in practice** — no live temporary-scheme Frame PDAs to migrate.

**Wire note:** both schemes use 1-byte `Value` references, but **meaning differs**. Mixed semantics in one Frame account without an explicit version field is **unsafe**.

---

## 8. Performance summary

| Operation | Temporary prototype | Shipped Frame (with `payload_at`) |
|-----------|---------------------|-------------------------------------|
| Read binding | O(1) direct byte | O(1) table + tape |
| Append binding | O(1) + write tape | O(1) + write tape + one u16 |
| Reset | O(`memory_len`) | O(`memory_len`) |
| Full `ifx_let` with N bindings | O(N) | O(N) |

Avoid **scanning the tape** to resolve index `k` (O(k) per read). The **`payload_at`** table (length `index_cap`) exists to keep reads **O(1)**.

Dominant CU cost remains **CPI**, **SPL unpack**, and **expr tree size** — not index lookup.

---

## 9. Decision record

We adopted index addressing **before the first npm release** because:

1. **[Bundle pattern 3](./bundles.md)** and larger binding counts needed binding indices decoupled from tape bytes.
2. The temporary prototype’s **256-byte wall** and byte-offset `Value` semantics failed planning for those flows.
3. **No public migration cost** — the temporary scheme never shipped; we could switch wire format in-repo only.

The temporary prototype remained adequate for early L0 demos (pattern 1 / 2, small tapes) but was not the model we document for integrators.

---

## 10. Non-goals (unchanged)

- Binding **257+** — out of scope; aligns with Solana tx limits, not an Ifx protocol goal.
- **`extend_frame` / dynamic resize** — still optional future work; tape is sized at create.
- **Cross-tx consistency without bundles** — still not guaranteed; see [bundles.md](./bundles.md).

---

## Related

- [design.md](./design.md) — product principles
- [implementation.md](./implementation.md) — shipped limits
- [bundles.md](./bundles.md) — when larger / cross-tx tape matters
- [roadmap.md](./roadmap.md) — tracking
