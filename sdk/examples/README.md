English | [中文](./README.zh-CN.md)

# Examples

These scripts are **not** published to npm; they live in the git repo for copy-paste and local runs.

## `minimal-frame.ts`

Two txs: (1) `planPublicFrame` + create, (2) reset → let → assert; then `fetchDecodedFrame` + `readU64`. Exports `planMinimalFrameBusinessTx`. Integration test: [`tests/minimal_frame.ts`](../../tests/minimal_frame.ts).

## `dust-destroy-token2022.ts`

Token-2022 dust cleanup in **one business tx**: `let` → burn (`structuredCpi` / `token2022BurnChecked`) → harvest → close (`staticCpi`). Exports `planDustDestroyTx(scratch, accounts)` and `buildHarvestWithheldToMintIx` (wraps `@solana/spl-token`). Integration test: [`tests/dust_destroy_token2022.ts`](../../tests/dust_destroy_token2022.ts).

## `two-hop-token-swap.ts`

**A → USDC → B** in one business tx via same-tx orchestration: static hop-1 CPI → `splTokenAmount` on intermediate USDC ATA → structured hop-2 (`tokenTransfer`). Standard SPL only; SOL/fees out of scope. Exports `planTwoHopTokenSwapTx`. Integration test: [`tests/two_hop_swap.ts`](../../tests/two_hop_swap.ts).

## `personal-amm-swap.ts`

**Personal AMM** — constant-product swap through a **wallet pool** (two arbitrary mints); user sells TOKEN_A, receives TOKEN_B; output-side **fee bps** (default 0.3%). Static SPL debit (`amount_in` at quote time) + structured pool payout (`structuredCpiPatch.tokenTransfer`). Exports `planPersonalAmmSwapTx`, `computeSwapOutput`, `PERSONAL_AMM_DEFAULT_FEE_BPS`. Integration test: [`tests/personal_amm_swap.ts`](../../tests/personal_amm_swap.ts). Blueprint: [docs/personal-amm.md](../../docs/personal-amm.md).

## `wsol-conditional-wrap.ts`

Conditional WSOL wrap in **one business tx**: `let` → idempotent ATA create → `if_else` arm with structured System transfer + `syncNative` (`staticCpi`). Exports `planWsolConditionalWrapTx`. Integration test: [`tests/ifx_wsol_if_else.ts`](../../tests/ifx_wsol_if_else.ts).

## `personal-dex-onboarding.ts`

Pool operator helpers: `personalDexAltAddresses`, `planPersonalDexFrame`. See [docs/personal-amm.md §5.1](../../docs/personal-amm.md#51-pool-onboarding-and-address-lookup-table-alt).

## `guardrail-lamports-delta.ts` / `guardrail-two-account-lamports-diff.ts`

Lighthouse §5.2 composable delta (no Memory PDA): single-account debit and symmetric two-account lamports change asserts.

## `mint-authority-guard.ts` / `upgradeable-program-guard.ts`

Absolute asserts (≈ Lighthouse AssertMint / upgradeable loader); latter checks program owner + ProgramData upgrade authority.

## `stake-conditional-withdraw.ts`

Stake typed lets + assert + `if_else` Skip; `planStakeStructuredWithdrawTx` demonstrates **SP-5** `structuredCpiPatch.stakeWithdraw`.

## Structured CPI (reference)

Official System / SPL / Token-2022 / **Stake** ix with tape-bound fields. See `tests/ifx_structured_cpi_initialize_mint.ts`, `tests/sdk_structured_cpi_codec.ts`, and [structured-cpi-patches.md](../../docs/structured-cpi-patches.md).

## Typecheck

From repo root (also runs in `pretest` before `npm test`):

```bash
npm run examples:typecheck
```

## Run locally

From repo root (after `npm run pretest` or local validator + deploy):

```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=~/.config/solana/id.json
npx ts-node -r tsconfig-paths/register sdk/examples/minimal-frame.ts
```

Or from `sdk/` after `npm run build`:

```bash
cd sdk
npx ts-node --project tsconfig.json examples/minimal-frame.ts
```

Examples index: root [README.md](./README.md) · L0 `minimal-frame.ts` · L1 `dust-destroy-token2022.ts` · L2 `two-hop-token-swap.ts` · **Personal AMM** `personal-amm-swap.ts` + `personal-dex-onboarding.ts` · L3 [`tests/sponsored_buy.ts`](../../tests/sponsored_buy.ts).
