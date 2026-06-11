[中文](./stake.zh-CN.md) | English

# Stake domain

**Status:** R2+R5 shipped — typed lets tags **31–38**, **60–64**  
**Parent:** [lighthouse-coverage.md](../lighthouse-coverage.md)

Stake is a first-class Lighthouse domain (`AssertStakeAccount`). Ifx covers meta, delegation, and R5 completion fields via **typed `LetBinding`**.

Full field tables and examples: [stake.zh-CN.md](./stake.zh-CN.md) (Chinese, most detailed).

---

## Shipped bindings (summary)

| Tags | Fields |
|------|--------|
| 31–38 | delegation stake/epochs/voter, lockup, authorized staker/withdrawer |
| 60–64 | state tag, lockup custodian, rent_exempt_reserve, credits_observed, flags |

Account lamports: generic `AccountLamports` (tag 1).

**Tests:** `tests/stake_typed_lets.ts` · **Example:** [`sdk/examples/stake-conditional-withdraw.ts`](../../sdk/examples/stake-conditional-withdraw.ts) (assert + Skip + `planStakeStructuredWithdrawTx`)

## Structured CPI (SP-5) — shipped

| Wire tag | Variant | Dynamic fields |
|----------|---------|----------------|
| 29 | `StakeWithdraw` | `lamports: Value` |
| 30 | `StakeSplit` | `lamports: Value` |
| 31 | `StakeDeactivate` | — |
| 32 | `StakeDelegateStake` | — |

See [structured-cpi-patches.md](../structured-cpi-patches.md) · SDK `structuredCpiPatch.stake*`.

---

## Changelog

| Date | Note |
|------|------|
| 2026-06-08 | Stub pointing to Chinese draft |
| 2026-06-08 | R2+R5: English stub aligned with shipped typed lets |
