English | [中文](./README.zh-CN.md)

# Examples

These scripts are **not** published to npm; they live in the git repo for copy-paste and local runs.

## `minimal-frame.ts`

Two txs: (1) `planNewFrame` + create, (2) reset → let → assert; then `fetchDecodedFrame` + `readU64`. Exports `planMinimalFrameBusinessTx`. Integration test: [`tests/minimal_frame.ts`](../../tests/minimal_frame.ts).

## `dust-destroy-token2022.ts`

Token-2022 dust cleanup in **one business tx**: `let` → burn (patched CPI via `cpi`) → harvest → close (`staticCpi`). Exports `planDustDestroyTx(scratch, accounts)` and `buildHarvestWithheldToMintIx` (wraps `@solana/spl-token`). Integration test: [`tests/dust_destroy_token2022.ts`](../../tests/dust_destroy_token2022.ts).

## `two-hop-token-swap.ts`

**A → USDC → B** in one business tx via same-tx orchestration: static hop-1 CPI → `splTokenAmount` on intermediate USDC ATA → patched hop-2 exact-in. Standard SPL only; SOL/fees out of scope. Exports `planTwoHopTokenSwapTx` and `SPL_TRANSFER_AMOUNT_OFFSET`. Integration test: [`tests/two_hop_swap.ts`](../../tests/two_hop_swap.ts).

## `personal-amm-swap.ts`

**Personal AMM** — constant-product swap through a **wallet pool** (two arbitrary mints); user sells TOKEN_A, receives TOKEN_B; output-side **fee bps** (default 0.3%). Static SPL debit (`amount_in` at quote time) + patched pool payout (`amount_out` on-chain). Exports `planPersonalAmmSwapTx`, `computeSwapOutput`, `PERSONAL_AMM_DEFAULT_FEE_BPS`. Integration test: [`tests/personal_amm_swap.ts`](../../tests/personal_amm_swap.ts). Blueprint: [docs/personal-amm.md](../../docs/personal-amm.md).

## `personal-dex-onboarding.ts`

Pool operator helpers: `personalDexAltAddresses`, `planPersonalDexFrame`. See [docs/personal-amm.md §5.1](../../docs/personal-amm.md#51-pool-onboarding-and-address-lookup-table-alt).

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
