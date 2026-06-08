English | [中文](./frame-cu-optimization.zh-CN.md)

# Frame CU optimization

How we reduced compute cost for **`ifx_reset_frame`**, **`ifx_let`**, **`ifx_assert`**, and **`ifx_if_else`** on large Frame PDAs — measured on localnet (Surfpool), **2026-06-07**.

**Scope:** Frame account load / mut write-back on the hot path. CPI, expression eval, and patched-CPI patch copies are out of scope unless noted.

**Canonical code (Phase 2+):** [`FrameAccount`](../programs/ifx/src/state/frame_account.rs), [`frame_layout`](../programs/ifx/src/state/frame_layout.rs), [`frame_access`](../programs/ifx/src/state/frame_access.rs).

---

## Problem

A Frame PDA grows with `tape_len` (test tiers **256 / 4096 / 8192** → ~817 B / ~4.7 KB / ~8.8 KB account bodies). With Anchor `Account<Frame>` on mut instructions:

1. **Exit-time Borsh serialize + write-back** touched the **entire** account every `reset` / `let`.
2. **`reset_session`** also **`tape.fill(0)`**, clearing the whole buffer even though bindings are session-scoped.

So **`reset` / `let` CU scaled ~linearly with frame size** (~10k → ~20k CU per ix at 8192). Multi-`let` orchestration (L2/L3 patterns) paid ~**20k CU per binding** — unusable at 8 KiB tapes.

Readonly paths (`assert`, `if_else` Skip/Skip) were lower but still **deserialized layout proportional to account size**.

---

## Optimization rounds

| Round | Change | Mut ix vs `tape_len` | Main result |
|-------|--------|----------------------|-------------|
| **0 — Baseline** | `Account<Frame>`, `reset` zeroes full `tape` | **Scales** (+71–78% 256→8192 on reset/let) | Identified Anchor serde as bottleneck |
| **1 — Lazy reset** | Stop `tape.fill(0)`; guard reads with `index_count` | **Still scales** | **~20–42 CU** saved on reset only — not the lever |
| **2 — Zero-copy `FrameAccount`** | In-place layout; `AccountsExit` no-op; `create_frame` still Borsh once | **Flat (O(1))** | **−89–94%** on mut ix; ~**2.1k CU/let** |
| **2.1 — Safety + let heap** | `frame_layout` bounds checks; `FrameSite` for tests; per-binding let log | Flat unchanged | OOM fixed; mut CU **~12–23%** lower vs first Phase 2 build |
| **2.2 — `ValueBytes` stack buffer** | `read_bytes` / `encode_typed` / `eval_expr` → `[u8;16]` on stack; no eval-path `Vec` | Flat unchanged | **Heap ↓**; CU **≈ flat** (+15–39 on let/eval vs 2.1 — within noise) |

### Round 0 — Baseline

**Implementation:** `#[account(mut)] Account<Frame>` on mut handlers; `reset_session` sets `cursor` / `index_count` and **`tape.fill(0)`**.

**Why it hurt:** Every mut instruction serialized and wrote back the full `Frame` (header + `payload_at` + entire `tape` vec). Cost dominated binding logic.

**Benchmark (single ix, `tape_len=8192):** reset **18,865** · let **19,848** · assert **5,992** · if_else Skip **6,320**.  
**Multi-let:** reset + 5×let → **118,177** CU (~**+19.9k** per extra `let`).

See [§ Benchmark — Round 0](#round-0--baseline) for full matrix.

---

### Round 1 — Lazy reset

**Hypothesis:** Skipping `memset` on an 8 KiB tape saves meaningful CU.

**Implementation:** `reset_session` only writes `cursor = 0`, `index_count = 0`. Stale tape bytes are unreachable until re-appended (`index < index_count` guard).

**Result:** reset **18,823** at 8192 (**−42 CU** vs Round 0). `let` / readonly unchanged. Multi-let total **118,135** (**−42 CU**).

**Conclusion:** Bulk memset is metered cheaply (`max(10, n/250)` on Solana). **The remaining ~18k reset CU is Anchor full-account write-back**, not tape clearing. Next lever must bypass exit serde.

See [§ Benchmark — Round 1](#round-1--lazy-reset).

---

### Round 2 — `FrameAccount` zero-copy

**Implementation:**

- Mut instructions: `UncheckedAccount` + [`FrameAccount::try_from`](../programs/ifx/src/state/frame_account.rs) → [`FrameMut`](../programs/ifx/src/state/frame_access.rs) writes header / tape records **in place**.
- [`AccountsExit`](../programs/ifx/src/state/frame_account.rs) **no-op** — no Borsh write-back.
- Readonly: [`FrameRef`](../programs/ifx/src/state/frame_access.rs) + [`FrameLayout::parse`](../programs/ifx/src/state/frame_layout.rs) — no full deserialize.
- `ifx_create_frame` still uses `Account<Frame>` once at init (wire / IDL unchanged).

**First benchmark (same day, pre–Round 2.1 polish):**

| ix @ 8192 | Round 0 | Round 2 (first) | Δ |
|-----------|---------|-----------------|---|
| reset | 18,865 | 1,276 | **−93%** |
| let | 19,848 | 2,753 | **−86%** |
| assert | 5,992 | 1,686 | **−72%** |
| if_else Skip | 6,320 | 1,863 | **−71%** |

**256 / 4096 / 8192 identical** on all four instructions — **O(1) in `tape_len`**.

**Multi-let @ 8192:** N=1 **4,029** · N=5 **15,113** (~**+2.8k CU** per extra `let` vs ~**+19.9k** in Round 0).

See [§ Benchmark — Round 2](#round-2--zero-copy-current).

---

### Round 2.1 — Layout safety, error sites, let heap

**Not a separate CU architecture** — hardening and correctness on top of Round 2:

| Work | Purpose | CU impact |
|------|---------|-----------|
| [`frame_layout`](../programs/ifx/src/state/frame_layout.rs) — `field` / `field_mut`, compile-time offset chain | Panic-free in-place access | None on happy path |
| [`FrameSite`](../programs/ifx/src/state/frame_error.rs) on `FrameLayoutResult` | Distinguish same `ErrorCode` in unit tests | None on happy path (no on-chain `msg!`) |
| `execute_let`: log per binding instead of `Vec<Vec<u8>>` batch | Fix BPF **heap OOM** on multi-binding lets | Mut paths **~12–23%** lower vs first Round 2 build |

**Current benchmark (final numbers):**

| ix @ 8192 | Round 0 | **Final** | Δ |
|-----------|---------|-----------|---|
| reset | 18,865 | **1,122** | **−94%** |
| let | 19,848 | **2,118** | **−89%** |
| assert | 5,992 | **1,448** | **−76%** |
| if_else Skip | 6,320 | **1,691** | **−73%** |

**Multi-let @ 8192:** N=1 **3,240** · N=5 **11,784** (~**+2.1k CU** per extra `let`).

---

### Round 2.2 — `ValueBytes` stack buffer

**Goal:** Remove small **heap** allocations on the expression / tape-read hot path (`read_bytes` → `to_vec()`, `encode_typed` → `Vec`, nested `eval_expr` temporaries). **Not** a CU optimization — Solana meters heap alloc lightly relative to the work already saved in Round 2.

**Implementation:** [`ValueBytes`](../programs/ifx/src/state/value_codec.rs) — `Copy` stack struct (`[u8; 16]` + `len`); wired through [`FrameReader::read_bytes`](../programs/ifx/src/state/frame_access.rs), [`eval_expr`](../programs/ifx/src/state/let_exec.rs), [`value_ops`](../programs/ifx/src/state/value_ops.rs), [`let_binding_exec`](../programs/ifx/src/state/let_binding_exec.rs).

**Memory (not CU):** each primitive was **`Vec<u8>`** — ~24 B handle on stack **plus** a bump-heap slice (1–16 B payload). **`ValueBytes`** inlines payload as **17 B on stack** (`Copy`, no heap). Primary win: **fewer bump allocations** toward the 32 KiB heap cap. Secondary: **~7 B less stack per live temporary** (24 → 17); deep expr trees with many simultaneous intermediates benefit from both. Solana has no built-in heap meter — see Round 2.2 conclusion for what remains on heap.

**Benchmark vs Round 2.1 @ 8192:**

| ix | 2.1 | **2.2** | Δ |
|----|-----|---------|---|
| reset | 1,122 | **1,122** | 0 |
| let | 2,118 | **2,157** | +39 |
| assert | 1,448 | **1,476** | +28 |
| if_else Skip | 1,691 | **1,706** | +15 |

**Multi-let @ 8192:** N=1 **3,279** · N=3 **7,629** · N=5 **11,979** (~**+2.2k CU** per extra `let`).

**Conclusion:** CU curve stays **flat vs `tape_len`**; eval-path numbers drift **&lt;2%** — within run-to-run noise. Primary win is **BPF heap headroom** for deep / multi-binding lets. **Still on heap:** `LetArgs` deserialize, CPI `arm.data`, `AccountMeta` collect, `LetBatchCache` `Vec` growth.

See [§ Benchmark — Round 2.2](#round-22--valuebytes-current).

---

## Benchmark harness

Sub-task: reproducible CU numbers for each round. **Not** a production feature — maintainer regression guard.

**Code:** [`tests/frame_cu_benchmark.ts`](../tests/frame_cu_benchmark.ts)

**Run** (Surfpool on `:8899`, program deployed):

```bash
npm run pretest
anchor test --detach   # or ensure RPC :8899 + deployed program
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=~/.config/solana/id.json IFX_LOG_TX=0 \
  npx ts-mocha -p ./tsconfig.json -t 120000 --require tests/setup.ts \
  --grep "frame CU benchmark" tests/frame_cu_benchmark.ts
```

**Method:**

- **Test 1:** one measured instruction per simulate tx (`reset`, `let`, `assert`, `if_else` Skip/Skip).
- **Test 2:** one tx = `reset + N×let` at `tape_len=8192` (N = 1, 3, 5).
- **`if_else`:** Skip / Skip only — isolates frame load + eval, no CPI.
- Metric: **`simulateTransaction().unitsConsumed`**.

Assertions in the harness encode Round 2 expectations (flat curve, reset &lt; 2.5k, let &lt; 3.5k, extra let &lt; 4k CU).

### Round 0 — Baseline

| `tape_len` | account ≈ | reset | let | assert | if_else (Skip) |
|-----------|-----------|-------|-----|--------|----------------|
| 256 | 561 B | 10,585 | 11,590 | 3,772 | 4,100 |
| 4096 | 4,657 B | 18,801 | 19,800 | 5,960 | 6,288 |
| 8192 | 8,753 B | 18,865 | 19,848 | 5,992 | 6,320 |

| N (let ixs @ 8192) | total CU | CU / let |
|--------------------|----------|----------|
| 1 | 38,713 | 38,713 |
| 3 | 78,445 | 26,148 |
| 5 | 118,177 | 23,635 |

### Round 1 — Lazy reset

| `tape_len` | reset | Δ vs R0 | let | assert | if_else |
|-----------|-------|---------|-----|--------|---------|
| 256 | 10,565 | −20 | 11,590 | 3,772 | 4,100 |
| 4096 | 18,775 | −26 | 19,800 | 5,960 | 6,288 |
| 8192 | 18,823 | −42 | 19,848 | 5,992 | 6,320 |

| N @ 8192 | total CU | Δ vs R0 |
|----------|----------|---------|
| 1 | 38,671 | −42 |
| 5 | 118,135 | −42 |

### Round 2.1 — Zero-copy (historical)

First polished zero-copy build. Superseded by Round 2.2 for eval-path heap.

#### Test 1 @ 8192

| reset | let | assert | if_else (Skip) |
|-------|-----|--------|----------------|
| 1,122 | 2,118 | 1,448 | 1,691 |

#### Test 2 @ 8192

| N | total CU |
|---|----------|
| 1 | 3,240 |
| 3 | 7,512 |
| 5 | 11,784 |

### Round 2.2 — `ValueBytes` (current)

**112 passing** integration tests · `anchor test --detach` · Surfpool localnet · 2026-06-07.

#### Test 1 — single instruction vs `tape_len`

| `tape_len` | reset | let | assert | if_else (Skip) |
|-----------|-------|-----|--------|----------------|
| 256 | 1,122 | 2,157 | 1,476 | 1,706 |
| 4096 | 1,122 | 2,157 | 1,476 | 1,706 |
| 8192 | 1,122 | 2,157 | 1,476 | 1,706 |

#### Test 2 — `reset + N×let` @ `tape_len = 8192`

| N | total CU | CU / let |
|---|----------|----------|
| 1 | 3,279 | 3,279 |
| 3 | 7,629 | 2,543 |
| 5 | 11,979 | 2,396 |

Check: N=1 → reset (1,122) + let (2,157) ≈ 3,279.

---

## Summary

### What we achieved

1. **Removed the `tape_len` cliff.** Round 0: reset/let **+71–78%** from 256→8192. Final: **0 CU delta** across all four instructions — orchestration cost is **decoupled from Frame PDA size** up to 8 KiB tapes.

2. **~10× cheaper mut session work.** At 8192: reset **18,865 → 1,122** (−94%); let **19,848 → 2,157** (−89%).

3. **Multi-`let` txs are practical.** Extra binding **~+2.2k CU** (was **~+19.9k**) — enables L2/L3 same-tx patterns (swap settle, two-hop, sponsored buy) without blowing the CU budget on frame housekeeping.

4. **Readonly path improved too.** assert **−75%**, if_else Skip **−73%** — layout parse replaces full Borsh deserialize.

5. **Eval path off the heap.** `ValueBytes` stack buffer on `read_bytes` / `encode_typed` / `eval_expr` — fewer BPF heap allocs on complex lets (CU neutral vs 2.1).

6. **Shipped safely.** Panic-free layout access, `FrameSite` test tags, let heap fix — **112 integration tests green**, no on-chain error-code explosion.

### What we learned

| Attempt | Outcome |
|---------|---------|
| Lazy reset (skip `tape.fill(0)`) | **Insufficient** — saves &lt;50 CU; Anchor exit write-back dominates |
| Zero-copy in-place mut + no exit serde | **Decisive** — flattens curve and cuts mut ix ~10× |
| `ValueBytes` stack buffer (Round 2.2) | **Heap win, CU neutral** — small `Vec` allocs were cheap to meter; stack copies ~same order |
| On-chain `msg!` error sites | **Rejected** — bloats `.so`, uses heap on errors; `FrameSite` in tests only |

### Remaining costs (not optimized here)

- **`LetArgs` Borsh deserialize**, CPI **`arm.data` / `AccountMeta`**, **`LetBatchCache` `Vec`** — still heap.
- **Expression / CPI / patch** CU beyond frame load/write-back.
- **`create_frame`** still pays one-time full init serialize (acceptable — once per session PDA).

**Bottom line:** The Frame hot path went from **“cost scales with account size”** to **~1–2k CU fixed overhead per frame touch** — the prerequisite for Ifx orchestration at realistic `tape_len` tiers.
