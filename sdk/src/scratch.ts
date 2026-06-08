import {
  AccountMeta,
  Connection,
  PublicKey,
  TransactionInstruction,
  type Commitment,
} from "@solana/web3.js";

import { DEFAULT_IFX_PROGRAM_ID, indexCapForTapeLen } from "./constants";
import { immortalCloseAuthority } from "./immortal-close";
import { planRecordOffsets, recordByteLength } from "./tape-layout";
import { decodeFrameAccount, type DecodedFrame, framePda } from "./layout";
import {
  accountDataSliceBinding,
  binding,
  inferBindingTy,
  remapBindingAccountIndex,
} from "./binding";
import { expr } from "./expr";
import type { LetArgs, LetBinding, ValueType } from "./types";
import {
  scratchValue,
  tyForIfxTy,
  type Cond,
  type IfxTy,
  type ScratchValue,
  type TypedExpr,
} from "./typed";
import type { CpiBuildResult } from "./cpi";
import type { IfElseArgs } from "./types";
import {
  buildIxAssert,
  buildIxLet,
  buildIxResetFrame,
  createIxCloseFrame,
  createIxCreateFrame,
  createIxIfElse,
  createIxCpi,
  mergeIxOpts,
  type CreateIxCreateFrameParams,
  type IxOpts,
} from "./ix";
import {
  LetAccountInput,
  toLetAccountMeta,
} from "./let-account";
import { LetIxBuilder } from "./let-builder";

export type { CreateIxCreateFrameParams } from "./ix";

/** Params for {@link FrameScratch.planPublicFrame} — `close_authority` is set to {@link immortalCloseAuthority}. */
export type PlanPublicFrameParams = Omit<
  CreateIxCreateFrameParams,
  "closeAuthority"
>;

/** Options for {@link FrameScratch.fetchDecodedFrame}. */
export type FrameScratchReadOpts = {
  commitment?: Commitment;
};

export type {
  Cond,
  ExprInput,
  IfxTy,
  ScratchValue,
  TypedExpr,
} from "./typed";

/** Result of {@link FrameScratch.planNewFrame}. */
export type PlanNewFrameResult = {
  scratch: FrameScratch;
  ixCreate: TransactionInstruction;
  /** Frame PDA (same as `scratch.frame`). */
  frame: PublicKey;
  frameBump: number;
};

/**
 * Off-chain mirror of Frame scratch tape: `cursor` + binding indices for `ifx_let`.
 * Plan values with `let*`; build frame instructions via `ix*` (reset / let / assert / patched_cpi / if_else).
 */
export class FrameScratch {
  cursor: number;
  nextIndex: number;
  readonly tapeLen?: number;
  readonly indexCap?: number;
  /** Frame PDA (may be derived before the account exists on-chain). */
  readonly frame: PublicKey;
  /** Ifx program id for all {@link FrameScratch} `ix*` builders (override per call via `IxOpts`). */
  readonly programId: PublicKey;
  private readonly indexTypes = new Map<number, IfxTy>();

  constructor(
    frame: PublicKey,
    tapeLen?: number,
    cursor = 0,
    nextIndex = 0,
    programId: PublicKey = DEFAULT_IFX_PROGRAM_ID
  ) {
    this.frame = frame;
    this.programId = programId;
    this.tapeLen = tapeLen;
    this.indexCap =
      tapeLen === undefined ? undefined : indexCapForTapeLen(tapeLen);
    this.cursor = cursor;
    this.nextIndex = nextIndex;
  }

  /** Sync planner from a fetched frame account (`frame` must match the fetch address). Tests / local debug only. */
  static fromFrame(
    account: DecodedFrame,
    frame: PublicKey,
    programId: PublicKey = DEFAULT_IFX_PROGRAM_ID
  ): FrameScratch {
    return new FrameScratch(
      frame,
      account.tape.length,
      account.cursor,
      account.indexCount,
      programId
    );
  }

  /**
   * Plan a new frame PDA + scratch planner, and the `ifx_create_frame` instruction.
   * `scratch.frame` matches the account `ixCreate` will allocate.
   */
  static planNewFrame(params: CreateIxCreateFrameParams): PlanNewFrameResult {
    const programId = params.programId ?? DEFAULT_IFX_PROGRAM_ID;
    const [frame, frameBump] = framePda(params.payer, params.frameId, programId);
    return {
      scratch: new FrameScratch(frame, params.tapeLen, 0, 0, programId),
      ixCreate: createIxCreateFrame({ ...params, programId }),
      frame,
      frameBump,
    };
  }

  /**
   * Like {@link planNewFrame}, but sets `close_authority` to the Frame PDA itself
   * ({@link immortalCloseAuthority}) — shared / config-pinned Frames with no close Signer.
   * Reset and let remain open to anyone (scratch semantics).
   */
  static planPublicFrame(params: PlanPublicFrameParams): PlanNewFrameResult {
    const programId = params.programId ?? DEFAULT_IFX_PROGRAM_ID;
    return FrameScratch.planNewFrame({
      ...params,
      programId,
      closeAuthority: immortalCloseAuthority(
        params.payer,
        params.frameId,
        programId
      ),
    });
  }

  /** `ifx_create_frame` when you already have a {@link FrameScratch} planner. */
  static ixCreateFrame(
    params: CreateIxCreateFrameParams
  ): TransactionInstruction {
    return createIxCreateFrame(params);
  }

  /** `ifx_close_frame` for this planner's frame PDA. */
  ixCloseFrame(authority: PublicKey, opts?: IxOpts): TransactionInstruction {
    return createIxCloseFrame(this.frame, authority, this.mergeIxOpts(opts));
  }

  private mergeIxOpts(opts?: IxOpts): IxOpts {
    return mergeIxOpts({ programId: this.programId }, opts);
  }

  syncCursor(onChainCursor: number): void {
    this.cursor = onChainCursor;
  }

  syncIndexCount(onChainIndexCount: number): void {
    this.nextIndex = onChainIndexCount;
  }

  /** Fetch and decode this frame account from RPC. Tests / local debug only — not production. */
  async fetchDecodedFrame(
    connection: Connection,
    opts?: FrameScratchReadOpts
  ): Promise<DecodedFrame> {
    const info = await connection.getAccountInfo(
      this.frame,
      opts?.commitment
    );
    if (!info) {
      throw new Error(`frame account missing: ${this.frame.toBase58()}`);
    }
    return decodeFrameAccount(Buffer.from(info.data));
  }

  /** Align local planner with on-chain session from RPC. Tests / local debug only — not production. */
  async refreshFromChain(
    connection: Connection,
    opts?: FrameScratchReadOpts
  ): Promise<DecodedFrame> {
    const decoded = await this.fetchDecodedFrame(connection, opts);
    this.syncCursor(decoded.cursor);
    this.syncIndexCount(decoded.indexCount);
    return decoded;
  }

  /** Next binding index if `ty` were appended now. */
  peekIndex(): number {
    return this.nextIndex;
  }

  /** Start a multi-binding `ifx_let` planner (remaining dedup). */
  letBuilder(): LetIxBuilder {
    return new LetIxBuilder(this);
  }

  letEval<T extends IfxTy>(e: TypedExpr<T>): ScratchValue<T> {
    return this.plan(binding.eval(e));
  }

  letConstU64(n: number | bigint): ScratchValue<"u64"> {
    return this.letEval(expr.u64(n));
  }

  letConstBool(v: boolean): ScratchValue<"bool"> {
    return this.letEval(expr.bool(v));
  }

  letLamports(account: LetAccountInput): ScratchValue<"u64"> {
    const meta = toLetAccountMeta(account);
    return this.plan(binding.accountLamports(0), [meta]);
  }

  /** `remaining[i].data.byteLength` on-chain (`AccountInfo::data_len`). */
  letDataLen(account: LetAccountInput): ScratchValue<"u32"> {
    const meta = toLetAccountMeta(account);
    return this.plan(binding.accountDataLen(0), [meta]);
  }

  letAccountDataSlice<T extends IfxTy>(
    account: LetAccountInput,
    expectedOwner: LetAccountInput,
    ty: T,
    dataOffset: number
  ): ScratchValue<T> {
    const dataMeta = toLetAccountMeta(account);
    const ownerMeta = toLetAccountMeta(expectedOwner);
    return this.plan(
      accountDataSliceBinding(ty, 0, dataOffset, 1),
      [dataMeta, ownerMeta]
    );
  }

  /** `Clock::get()?.slot` (syscall; no remaining account). */
  clockSlot(): ScratchValue<"u64"> {
    return this.plan(binding.sysvarClockSlot());
  }

  clockEpochStartTimestamp(): ScratchValue<"i64"> {
    return this.plan(binding.sysvarClockEpochStartTimestamp());
  }

  clockEpoch(): ScratchValue<"u64"> {
    return this.plan(binding.sysvarClockEpoch());
  }

  clockLeaderScheduleEpoch(): ScratchValue<"u64"> {
    return this.plan(binding.sysvarClockLeaderScheduleEpoch());
  }

  clockUnixTimestamp(): ScratchValue<"i64"> {
    return this.plan(binding.sysvarClockUnixTimestamp());
  }

  /** `Rent::get()?.minimum_balance(dataLen)` — e.g. `165` for a classic SPL token account. */
  rentMinimumBalance(dataLen: number): ScratchValue<"u64"> {
    return this.plan(binding.sysvarRentMinimumBalance(dataLen));
  }

  /** Token-2022 token account (`spl_token_2022` owner). */
  letSplToken2022Amount(account: LetAccountInput): ScratchValue<"u64"> {
    return this.plan(binding.splToken2022AccountAmount(0), [
      toLetAccountMeta(account),
    ]);
  }

  letSplToken2022DelegatedAmount(account: LetAccountInput): ScratchValue<"u64"> {
    return this.plan(binding.splToken2022AccountDelegatedAmount(0), [
      toLetAccountMeta(account),
    ]);
  }

  letSplToken2022AccountState(account: LetAccountInput): ScratchValue<"u8"> {
    return this.plan(binding.splToken2022AccountState(0), [
      toLetAccountMeta(account),
    ]);
  }

  letSplToken2022TransferFeeWithheld(
    account: LetAccountInput
  ): ScratchValue<"u64"> {
    return this.plan(binding.splToken2022AccountTransferFeeWithheld(0), [
      toLetAccountMeta(account),
    ]);
  }

  /** Token-2022 mint (`spl_token_2022` owner). */
  letSplToken2022MintSupply(mint: LetAccountInput): ScratchValue<"u64"> {
    return this.plan(binding.splToken2022MintSupply(0), [
      toLetAccountMeta(mint),
    ]);
  }

  letSplToken2022MintDecimals(mint: LetAccountInput): ScratchValue<"u8"> {
    return this.plan(binding.splToken2022MintDecimals(0), [
      toLetAccountMeta(mint),
    ]);
  }

  letSplToken2022MintTransferFeeBasisPoints(
    mint: LetAccountInput
  ): ScratchValue<"u16"> {
    return this.plan(binding.splToken2022MintTransferFeeBasisPoints(0), [
      toLetAccountMeta(mint),
    ]);
  }

  letSplToken2022MintTransferFeeMaximum(
    mint: LetAccountInput
  ): ScratchValue<"u64"> {
    return this.plan(binding.splToken2022MintTransferFeeMaximum(0), [
      toLetAccountMeta(mint),
    ]);
  }

  letSplToken2022MintWithheldAmount(mint: LetAccountInput): ScratchValue<"u64"> {
    return this.plan(binding.splToken2022MintWithheldAmount(0), [
      toLetAccountMeta(mint),
    ]);
  }

  letSplToken2022MintDefaultAccountState(
    mint: LetAccountInput
  ): ScratchValue<"u8"> {
    return this.plan(binding.splToken2022MintDefaultAccountState(0), [
      toLetAccountMeta(mint),
    ]);
  }

  /**
   * `ifx_reset_frame` — clears on-chain scratch and the local planner.
   * Call once per business tx, then plan `let*` / CPI (same tx). Reuse the returned ix in `tx.add` / `sendAndConfirm`.
   */
  ixReset(opts?: IxOpts): TransactionInstruction {
    this.cursor = 0;
    this.nextIndex = 0;
    this.indexTypes.clear();
    return buildIxResetFrame(this.frame, this.mergeIxOpts(opts));
  }

  /** One `ifx_let` from a single {@link ScratchValue} or a {@link LetIxBuilder} batch. */
  ixLet(
    target: ScratchValue<IfxTy> | LetIxBuilder,
    opts?: IxOpts
  ): TransactionInstruction {
    const ixOpts = this.mergeIxOpts(opts);
    if (target instanceof LetIxBuilder) {
      const { args, remaining } = target.finish();
      return buildIxLet(this.frame, args, remaining, ixOpts);
    }
    return buildIxLet(
      this.frame,
      FrameScratch.toLetArgs([target]),
      [...(target.letRemaining ?? [])],
      ixOpts
    );
  }

  ixAssert(cond: Cond, opts?: IxOpts): TransactionInstruction {
    return buildIxAssert(this.frame, cond, this.mergeIxOpts(opts));
  }

  /** Patched CPI (`ifx_patched_cpi`). */
  ixCpi(built: CpiBuildResult, opts?: IxOpts): TransactionInstruction {
    return createIxCpi(this.frame, built, this.mergeIxOpts(opts));
  }

  /** Conditional CPI arms (`ifx_if_else`). */
  ixIfElse(
    args: IfElseArgs,
    remainingAccounts?: AccountMeta[] | PublicKey[],
    opts?: IxOpts
  ): TransactionInstruction {
    return createIxIfElse(
      this.frame,
      args,
      remainingAccounts,
      this.mergeIxOpts(opts)
    );
  }

  /** @internal */
  plan<T extends IfxTy = IfxTy>(
    letBinding: LetBinding,
    letRemaining?: readonly AccountMeta[]
  ): ScratchValue<T> {
    const ty = inferBindingTy(letBinding, this.indexTypes) as T;
    const valueType = tyForIfxTy(ty);
    const bindingIndex = this.nextIndex;
    if (this.indexCap !== undefined && bindingIndex >= this.indexCap) {
      throw new Error(
        `scratch binding index cap reached (${bindingIndex} >= ${this.indexCap}); use a larger frame tape`
      );
    }
    const { endCursor } = planRecordOffsets(this.cursor, valueType);
    if (this.tapeLen !== undefined && endCursor > this.tapeLen) {
      throw new Error(
        `scratch would exceed tape (${endCursor} > ${this.tapeLen}); reset or use a larger frame (+${recordByteLength(valueType)} B per binding)`
      );
    }
    this.cursor = endCursor;
    this.nextIndex += 1;
    this.indexTypes.set(bindingIndex, ty);
    return scratchValue<T>(
      letBinding,
      { index: bindingIndex },
      letRemaining,
      ty
    );
  }

  /** @internal Used by {@link LetIxBuilder} and SPL helpers. */
  planAtRemainingIndex<T extends IfxTy = IfxTy>(
    letBinding: LetBinding,
    remainingAccountIndex: number
  ): ScratchValue<T> {
    return this.plan(
      remapBindingAccountIndex(letBinding, remainingAccountIndex)
    );
  }

  static toLetArgs(scratchValues: ScratchValue<IfxTy>[]): LetArgs {
    return { bindings: scratchValues.map((p) => p.binding) };
  }
}

// Re-export SPL helpers (use with letBuilder account indices).

import {
  bindSplMintDecimals as letSplMintDecimalsImpl,
  bindSplMintSupply as letSplMintSupplyImpl,
  bindSplTokenAccountState as letSplTokenAccountStateImpl,
  bindSplTokenAmount as letSplTokenAmountImpl,
  bindSplTokenDelegatedAmount as letSplTokenDelegatedAmountImpl,
} from "./spl/bind";

export function letSplTokenAmount(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return letSplTokenAmountImpl(scratch, remainingAccountIndex);
}

export function letSplTokenDelegatedAmount(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return letSplTokenDelegatedAmountImpl(scratch, remainingAccountIndex);
}

export function letSplTokenAccountState(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u8"> {
  return letSplTokenAccountStateImpl(scratch, remainingAccountIndex);
}

export function letSplMintSupply(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return letSplMintSupplyImpl(scratch, remainingAccountIndex);
}

export function letSplMintDecimals(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u8"> {
  return letSplMintDecimalsImpl(scratch, remainingAccountIndex);
}

import {
  bindSplToken2022AccountAmount,
  bindSplToken2022AccountDelegatedAmount,
  bindSplToken2022AccountState,
  bindSplToken2022AccountTransferFeeWithheld,
  bindSplToken2022MintDecimals,
  bindSplToken2022MintDefaultAccountState,
  bindSplToken2022MintSupply,
  bindSplToken2022MintTransferFeeBasisPoints,
  bindSplToken2022MintTransferFeeMaximum,
  bindSplToken2022MintWithheldAmount,
} from "./spl/token2022-bind";

import {
  bindClockEpoch,
  bindClockEpochStartTimestamp,
  bindClockLeaderScheduleEpoch,
  bindClockSlot,
  bindClockUnixTimestamp,
  bindRentMinimumBalance,
} from "./sysvar/bind";

/** Sysvar reads — `remaining` index not used (syscall). */
export function letClockSlot(scratch: FrameScratch): ScratchValue<"u64"> {
  return bindClockSlot(scratch);
}

export function letClockEpochStartTimestamp(
  scratch: FrameScratch
): ScratchValue<"i64"> {
  return bindClockEpochStartTimestamp(scratch);
}

export function letClockEpoch(scratch: FrameScratch): ScratchValue<"u64"> {
  return bindClockEpoch(scratch);
}

export function letClockLeaderScheduleEpoch(
  scratch: FrameScratch
): ScratchValue<"u64"> {
  return bindClockLeaderScheduleEpoch(scratch);
}

export function letClockUnixTimestamp(scratch: FrameScratch): ScratchValue<"i64"> {
  return bindClockUnixTimestamp(scratch);
}

export function letRentMinimumBalance(
  scratch: FrameScratch,
  dataLen: number
): ScratchValue<"u64"> {
  return bindRentMinimumBalance(scratch, dataLen);
}

/** Token-2022 loads by `remaining_accounts` index (multi-binding batches). */
export function letSplToken2022Amount(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return bindSplToken2022AccountAmount(scratch, remainingAccountIndex);
}

export function letSplToken2022DelegatedAmount(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return bindSplToken2022AccountDelegatedAmount(scratch, remainingAccountIndex);
}

export function letSplToken2022AccountState(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u8"> {
  return bindSplToken2022AccountState(scratch, remainingAccountIndex);
}

export function letSplToken2022TransferFeeWithheld(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return bindSplToken2022AccountTransferFeeWithheld(
    scratch,
    remainingAccountIndex
  );
}

export function letSplToken2022MintSupply(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return bindSplToken2022MintSupply(scratch, remainingAccountIndex);
}

export function letSplToken2022MintDecimals(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u8"> {
  return bindSplToken2022MintDecimals(scratch, remainingAccountIndex);
}

export function letSplToken2022MintTransferFeeBasisPoints(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u16"> {
  return bindSplToken2022MintTransferFeeBasisPoints(
    scratch,
    remainingAccountIndex
  );
}

export function letSplToken2022MintTransferFeeMaximum(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return bindSplToken2022MintTransferFeeMaximum(
    scratch,
    remainingAccountIndex
  );
}

export function letSplToken2022MintWithheldAmount(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return bindSplToken2022MintWithheldAmount(scratch, remainingAccountIndex);
}

export function letSplToken2022MintDefaultAccountState(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u8"> {
  return bindSplToken2022MintDefaultAccountState(scratch, remainingAccountIndex);
}
