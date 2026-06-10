/**
 * Personal AMM — constant-product swap via a **wallet pool** (two ATAs), no pool/DEX program.
 *
 * One business tx: read reserves → `x*y=k` → slippage assert → user SPL transfer (static) + patched pool payout.
 * Frame PDA must exist; pool and user must co-sign the returned tx.
 *
 * **Ifx only where amounts depend on chain state:** `amount_out` is patched; `amount_in` is a normal
 * top-level SPL `Transfer` when known at quote time (same as {@link two-hop-token-swap.ts} hop 1).
 */
import {
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";

import {
  expr,
  structuredCpi,
  structuredCpiPatch,
  type FrameScratch,
  type IxOpts,
  type ScratchValue,
} from "../src/index";

export type PersonalAmmAccounts = {
  user: PublicKey;
  pool: PublicKey;
  /** User + pool ATAs for the **input** mint (user sells this token). */
  userTokenAAta: PublicKey;
  poolTokenAAta: PublicKey;
  /** User + pool ATAs for the **output** mint (user receives this token). */
  userTokenBAta: PublicKey;
  poolTokenBAta: PublicKey;
  tokenProgram?: PublicKey;
};

/** Basis-point denominator (1 bp = 0.01%). */
export const BPS_DENOM = 10_000;

/** Default swap fee: 30 bps (0.3%), deducted from user output; remainder stays in pool. */
export const PERSONAL_AMM_DEFAULT_FEE_BPS = 30;

export type PersonalAmmSwapParams = {
  amountIn: number | bigint;
  minOut: number | bigint;
  /** Output-side fee in basis points. Default {@link PERSONAL_AMM_DEFAULT_FEE_BPS}. Use `0` for no fee. */
  feeBps?: number;
};

export type PersonalAmmBindings = {
  reserveTokenA: ScratchValue<"u64">;
  reserveTokenB: ScratchValue<"u64">;
  amountIn: ScratchValue<"u64">;
  amountOut: ScratchValue<"u64">;
  minOut: ScratchValue<"u64">;
};

export type PersonalAmmSwapPlan = {
  bindings: PersonalAmmBindings;
  instructions: TransactionInstruction[];
};

/**
 * Off-chain constant product for sell-A / buy-B:
 * `gross = floor(reserveB * amountIn / (reserveTokenA + amountIn))`;
 * `net = floor(gross * (BPS_DENOM - feeBps) / BPS_DENOM)`.
 * Matches on-chain `mulDivFloor` + `bpsMulFloor` + `asU128`.
 */
export function computeSwapOutput(
  reserveTokenA: bigint,
  reserveTokenB: bigint,
  amountIn: bigint,
  feeBps: number = PERSONAL_AMM_DEFAULT_FEE_BPS
): bigint {
  if (amountIn <= 0n) return 0n;
  const denom = reserveTokenA + amountIn;
  if (denom <= 0n) return 0n;
  const gross = (reserveTokenB * amountIn) / denom;
  if (feeBps <= 0) return gross;
  if (feeBps >= BPS_DENOM) return 0n;
  return (gross * BigInt(BPS_DENOM - feeBps)) / BigInt(BPS_DENOM);
}

function resolveFeeBps(feeBps: number | undefined): number {
  const bps = feeBps ?? PERSONAL_AMM_DEFAULT_FEE_BPS;
  if (!Number.isInteger(bps) || bps < 0 || bps > BPS_DENOM) {
    throw new Error(`feeBps must be an integer in [0, ${BPS_DENOM}], got ${feeBps}`);
  }
  return bps;
}

/**
 * Plan reset → let (reserves + formula) → assert slippage → static user transfer + patched pool transfer.
 * Frame PDA must exist; pool and user must co-sign the returned tx.
 */
export function planPersonalAmmSwapInstructions(
  scratch: FrameScratch,
  accounts: PersonalAmmAccounts,
  params: PersonalAmmSwapParams,
  opts: IxOpts = {}
): PersonalAmmSwapPlan {
  const tokenProgram = accounts.tokenProgram ?? TOKEN_PROGRAM_ID;
  const feeBps = resolveFeeBps(params.feeBps);
  const instructions: TransactionInstruction[] = [];

  instructions.push(scratch.ixReset(opts));

  const batch = scratch.letBuilder();
  const reserveTokenA = batch.splTokenAmount(accounts.poolTokenAAta);
  const reserveTokenB = batch.splTokenAmount(accounts.poolTokenBAta);
  const amountIn = batch.letConstU64(params.amountIn);
  const xPlusDx = batch.letEval(expr.add(reserveTokenA, amountIn));
  const amountOutGross = batch.letEval(
    expr.mulDivFloor(
      expr.asU128(reserveTokenB),
      expr.asU128(amountIn),
      expr.asU128(xPlusDx)
    )
  );
  const amountOutGrossU64 = batch.letEval(expr.asU64(amountOutGross));
  const amountOut =
    feeBps === 0
      ? amountOutGrossU64
      : batch.letEval(
          expr.bpsMulFloor(amountOutGrossU64, expr.u64(BPS_DENOM - feeBps))
        );
  const minOut = batch.letConstU64(params.minOut);
  instructions.push(batch.buildIx(opts));

  instructions.push(scratch.ixAssert(expr.ge(amountOut, minOut), opts));

  instructions.push(
    createTransferInstruction(
      accounts.userTokenAAta,
      accounts.poolTokenAAta,
      accounts.user,
      params.amountIn,
      [],
      tokenProgram
    )
  );

  const transferOut = structuredCpi(
    createTransferInstruction(
      accounts.poolTokenBAta,
      accounts.userTokenBAta,
      accounts.pool,
      0,
      [],
      tokenProgram
    ),
    structuredCpiPatch.tokenTransfer(amountOut)
  ).build();
  instructions.push(scratch.ixCpi(transferOut, opts));

  return {
    bindings: {
      reserveTokenA,
      reserveTokenB,
      amountIn,
      amountOut,
      minOut,
    },
    instructions,
  };
}

/** Convenience: {@link planPersonalAmmSwapInstructions} wrapped in a legacy {@link Transaction}. */
export function planPersonalAmmSwapTx(
  scratch: FrameScratch,
  accounts: PersonalAmmAccounts,
  params: PersonalAmmSwapParams,
  opts?: IxOpts
): Transaction {
  const { instructions } = planPersonalAmmSwapInstructions(
    scratch,
    accounts,
    params,
    opts
  );
  const tx = new Transaction();
  for (const ix of instructions) tx.add(ix);
  return tx;
}
