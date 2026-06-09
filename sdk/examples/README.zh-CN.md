[English](./README.md) | 中文

# 示例

这些脚本**不会**发布到 npm，仅存放在 git 仓库中供复制与本地运行。

## `minimal-frame.ts`

两笔 tx：(1) `planPublicFrame` + create，(2) reset → let → assert；最后 `fetchDecodedFrame` + `readU64`。导出 `planMinimalFrameBusinessTx`。集成测试：[`tests/minimal_frame.ts`](../../tests/minimal_frame.ts)。

## `dust-destroy-token2022.ts`

**单笔业务 tx** 内 Token-2022 dust 清理：`let` → burn（raw CPI，`rawCpi` + `rawCpiPatch`）→ harvest → close（`staticCpi`）。导出 `planDustDestroyTx(scratch, accounts)` 与 `buildHarvestWithheldToMintIx`（封装 `@solana/spl-token`）。集成测试：[`tests/dust_destroy_token2022.ts`](../../tests/dust_destroy_token2022.ts)。

## `two-hop-token-swap.ts`

**A → USDC → B** 单笔业务 tx、同一 tx 内编排：第一跳 static CPI → 读中间 USDC ATA（`splTokenAmount`）→ patched 第二跳 exact-in。仅标准 SPL；SOL/手续费不在范围内。导出 `planTwoHopTokenSwapTx`、`SPL_TRANSFER_AMOUNT_OFFSET`。集成测试：[`tests/two_hop_swap.ts`](../../tests/two_hop_swap.ts)。

## `personal-amm-swap.ts`

**Personal AMM** — 钱包池恒定乘积 swap，两个任意 mint；用户卖 TOKEN_A、买 TOKEN_B；输出端 **fee bps**（默认 0.3%）。导出 `planPersonalAmmSwapTx`、`computeSwapOutput`、`PERSONAL_AMM_DEFAULT_FEE_BPS`。集成测试：[`tests/personal_amm_swap.ts`](../../tests/personal_amm_swap.ts)。

## `personal-dex-onboarding.ts`

运营方 helper：`personalDexAltAddresses`、`planPersonalDexFrame`。见 [docs/personal-amm.zh-CN.md §5.1](../../docs/personal-amm.zh-CN.md#51-pool-入驻与-address-lookup-table-alt)。

## Structured CPI（参考）

官方 System / SPL / Token-2022 指令 + tape 绑定字段 — 无独立 example 脚本。见 `tests/ifx_structured_cpi_initialize_mint.ts`（InitializeMint2 + `Pubkey` let）与 [structured-cpi-patches.zh-CN.md](../../docs/structured-cpi-patches.zh-CN.md)。

## 本地运行

在仓库根目录（`npm run pretest` 之后，或本地 validator + 已部署 program）：

```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=~/.config/solana/id.json
npx ts-node -r tsconfig-paths/register sdk/examples/minimal-frame.ts
```

或在 `sdk/` 下执行 `npm run build` 后：

```bash
cd sdk
npx ts-node --project tsconfig.json examples/minimal-frame.ts
```

索引：根 [README.zh-CN.md](../../README.zh-CN.md) · L0 `minimal-frame.ts` · L1 `dust-destroy-token2022.ts` · L2 `two-hop-token-swap.ts` · **Personal AMM** `personal-amm-swap.ts` + `personal-dex-onboarding.ts` · L3 [`tests/sponsored_buy.ts`](../../tests/sponsored_buy.ts)。

使用已发布包时，将 import 改为 `@ifx-run/sdk`，并确认 `DEFAULT_IFX_PROGRAM_ID`（或显式传入的 cluster id）与部署的 program 一致。
