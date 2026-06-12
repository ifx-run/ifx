[中文](./r4-assert-multi.zh-CN.md) | English

# R4: `ifx_assert_multi` design notes

**Status:** implemented (pre-mainnet; disc **5**)  
**See also:** [lighthouse-coverage.md §R4](./lighthouse-coverage.md) · [ir-completeness.md §IR-4](./ir-completeness.md)

---

## Benefits vs N× `ifx_assert`

| Dimension | N× assert | 1× assert + `expr.and` | 1× `ifx_assert_multi` (shipped) |
|-----------|-----------|--------------------------|----------------------------------|
| Tx size | N legacy ix envelopes | single ix | single ix + `U8LenVec<Expr>` |
| CU (all pass) | ≈ N × **~1,476** | ≈ **~1,476** + tree eval | ≈ **~1,476** + loop (short-circuit) |
| CU (fail #1) | **~1,476** | full tree (no short-circuit) | **~1,476** |
| Failure detail | `AssertFailed` (6005) | 6005 | **`AssertFailedMulti` (6039)** + return data `[index]` |

Baseline CU: [frame-cu-optimization.md](./frame-cu-optimization.md) Round 2.2 (`ifx_assert` **~1,476 CU** @ 8192 tape).

---

## Typical 5-guard legacy tx size (measured)

Guards-only tx (`eq(ref, u64)`): **251 B** (5×) vs **232 B** (multi) → **19 B** saved.  
10 guards: **336 B** vs **292 B** → **44 B** saved.

Savings scale with guard count (~4 B/ix envelope per extra assert). Matters near the **1232 B** limit in full business txs.

Full repro script: [r4-assert-multi.zh-CN.md §2](./r4-assert-multi.zh-CN.md).

---

## CU estimates (5 guards)

| Case | N× assert | multi (short-circuit loop) |
|------|-----------|----------------------------|
| All pass | ≈ **7,380** | ≈ **~2,700** |
| Fail #1 | **~1,476** | **~1,476** |
| Fail #5 after 4 pass | **~7,380** | ≈ **~2,700** |

Add CU regression when implementing R4.

---

## Instruction discriminators (pre-mainnet)

**Planned renumber** (assert family adjacent; acceptable before mainnet):

| disc | Instruction |
|------|-------------|
| 4 | `ifx_assert` |
| **5** | **`ifx_assert_multi`** |
| **6** | `ifx_patched_cpi` (was 5) |
| **7** | `ifx_if_else` (was 6) |

Freeze before mainnet; if external integrators hardcode discs, fall back to append-only (7) instead.

**Payload:** `[5][AssertMultiArgs { conds: U8LenVec<Expr> }]`

---

## When to ship R4

Ship if: tx-size pressure, indexed failures, or CU profile justify it.  
Skip if: few guards; `expr.and` + single assert is enough.

---

## 6. Integration guidance (SDK)

| Constant | Value | Notes |
|----------|-------|-------|
| `MAX_ASSERT_MULTI_CONDS` | 255 | wire `U8LenVec` limit |
| `RECOMMENDED_ASSERT_MULTI_MIN` | 3 | below this, prefer a single `ifx_assert` |
| `RECOMMENDED_ASSERT_MULTI_MAX` | 10 | **suggested per-ix cap** — no on-chain CU limit; profile when higher |

The program does **not** cap CU by cond count. SDK **warns** above 10 and **rejects encoding** above 255.
