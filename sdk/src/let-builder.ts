import {
  AccountMeta,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";

import {
  LetAccountInput,
  mergeLetAccountMeta,
  toLetAccountMeta,
} from "./let-account";
import type { IxOpts } from "./ix";
import { binding } from "./binding";
import {
  bindSplMintDecimals,
  bindSplMintSupply,
  bindSplTokenAccountState,
  bindSplTokenAmount,
  bindSplTokenDelegatedAmount,
} from "./spl/bind";
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
import { FrameScratch, type ScratchValue } from "./scratch";
import type { IfxTy, TypedExpr } from "./typed";
import { tyForIfxTy } from "./typed";

export type { LetAccountInput } from "./let-account";

/**
 * Multi-binding `ifx_let` planner: `let*` on {@link FrameScratch} with
 * `remaining_accounts` indices assigned automatically (dedupe by pubkey).
 */
export class LetIxBuilder {
  readonly scratch: FrameScratch;
  private readonly accounts: AccountMeta[] = [];
  private readonly indexByPubkey = new Map<string, number>();
  private readonly bindings: ScratchValue<IfxTy>[] = [];

  constructor(scratch: FrameScratch) {
    this.scratch = scratch;
  }

  get remaining(): readonly AccountMeta[] {
    return this.accounts;
  }

  get planned(): readonly ScratchValue<IfxTy>[] {
    return this.bindings;
  }

  accountIndex(account: LetAccountInput): number {
    const meta = toLetAccountMeta(account);
    const key = meta.pubkey.toBase58();
    const found = this.indexByPubkey.get(key);
    if (found !== undefined) {
      this.accounts[found] = mergeLetAccountMeta(this.accounts[found], meta);
      return found;
    }
    const idx = this.accounts.length;
    this.indexByPubkey.set(key, idx);
    this.accounts.push({ ...meta });
    return idx;
  }

  private push<T extends IfxTy>(binding: ScratchValue<T>): ScratchValue<T> {
    this.bindings.push(binding);
    return binding;
  }

  letEval<T extends IfxTy>(e: TypedExpr<T>): ScratchValue<T> {
    return this.push(this.scratch.letEval(e));
  }

  letConstU64(n: number | bigint): ScratchValue<"u64"> {
    return this.push(this.scratch.letConstU64(n));
  }

  letConstBool(v: boolean): ScratchValue<"bool"> {
    return this.push(this.scratch.letConstBool(v));
  }

  /** `Clock::get()?.slot` (syscall; no remaining account). */
  clockSlot(): ScratchValue<"u64"> {
    return this.push(this.scratch.clockSlot());
  }

  clockEpochStartTimestamp(): ScratchValue<"i64"> {
    return this.push(this.scratch.clockEpochStartTimestamp());
  }

  clockEpoch(): ScratchValue<"u64"> {
    return this.push(this.scratch.clockEpoch());
  }

  clockLeaderScheduleEpoch(): ScratchValue<"u64"> {
    return this.push(this.scratch.clockLeaderScheduleEpoch());
  }

  clockUnixTimestamp(): ScratchValue<"i64"> {
    return this.push(this.scratch.clockUnixTimestamp());
  }

  /** `Rent::get()?.minimum_balance(dataLen)` — e.g. `165` for a classic SPL token account. */
  rentMinimumBalance(dataLen: number): ScratchValue<"u64"> {
    return this.push(this.scratch.rentMinimumBalance(dataLen));
  }

  lamports(account: LetAccountInput): ScratchValue<"u64"> {
    const i = this.accountIndex(account);
    return this.push(
      this.scratch.planAtRemainingIndex(binding.accountLamports(0), i)
    );
  }

  /** On-chain `AccountInfo::data_len` for a remaining account. */
  dataLen(account: LetAccountInput): ScratchValue<"u32"> {
    const i = this.accountIndex(account);
    return this.push(
      this.scratch.planAtRemainingIndex(binding.accountDataLen(0), i)
    );
  }

  accountDataSlice<T extends IfxTy>(
    account: LetAccountInput,
    expectedOwner: LetAccountInput,
    ty: T,
    dataOffset: number
  ): ScratchValue<T> {
    const dataIdx = this.accountIndex(account);
    const ownerIdx = this.accountIndex(expectedOwner);
    return this.push(
      this.scratch.plan(
        binding.accountDataSlice(
          tyForIfxTy(ty),
          dataIdx,
          dataOffset,
          ownerIdx
        )
      )
    );
  }

  splTokenAmount(account: LetAccountInput): ScratchValue<"u64"> {
    return this.push(
      bindSplTokenAmount(this.scratch, this.accountIndex(account))
    );
  }

  splTokenDelegatedAmount(account: LetAccountInput): ScratchValue<"u64"> {
    return this.push(
      bindSplTokenDelegatedAmount(this.scratch, this.accountIndex(account))
    );
  }

  splTokenAccountState(account: LetAccountInput): ScratchValue<"u8"> {
    return this.push(
      bindSplTokenAccountState(this.scratch, this.accountIndex(account))
    );
  }

  splMintSupply(account: LetAccountInput): ScratchValue<"u64"> {
    return this.push(bindSplMintSupply(this.scratch, this.accountIndex(account)));
  }

  splMintDecimals(account: LetAccountInput): ScratchValue<"u8"> {
    return this.push(
      bindSplMintDecimals(this.scratch, this.accountIndex(account))
    );
  }

  /** Token-2022 token account (`spl_token_2022` owner). */
  splToken2022Amount(account: LetAccountInput): ScratchValue<"u64"> {
    return this.push(
      bindSplToken2022AccountAmount(this.scratch, this.accountIndex(account))
    );
  }

  splToken2022DelegatedAmount(account: LetAccountInput): ScratchValue<"u64"> {
    return this.push(
      bindSplToken2022AccountDelegatedAmount(
        this.scratch,
        this.accountIndex(account)
      )
    );
  }

  splToken2022AccountState(account: LetAccountInput): ScratchValue<"u8"> {
    return this.push(
      bindSplToken2022AccountState(this.scratch, this.accountIndex(account))
    );
  }

  splToken2022TransferFeeWithheld(
    account: LetAccountInput
  ): ScratchValue<"u64"> {
    return this.push(
      bindSplToken2022AccountTransferFeeWithheld(
        this.scratch,
        this.accountIndex(account)
      )
    );
  }

  /** Token-2022 mint (`spl_token_2022` owner). */
  splToken2022MintSupply(mint: LetAccountInput): ScratchValue<"u64"> {
    return this.push(
      bindSplToken2022MintSupply(this.scratch, this.accountIndex(mint))
    );
  }

  splToken2022MintDecimals(mint: LetAccountInput): ScratchValue<"u8"> {
    return this.push(
      bindSplToken2022MintDecimals(this.scratch, this.accountIndex(mint))
    );
  }

  splToken2022MintTransferFeeBasisPoints(
    mint: LetAccountInput
  ): ScratchValue<"u16"> {
    return this.push(
      bindSplToken2022MintTransferFeeBasisPoints(
        this.scratch,
        this.accountIndex(mint)
      )
    );
  }

  splToken2022MintTransferFeeMaximum(
    mint: LetAccountInput
  ): ScratchValue<"u64"> {
    return this.push(
      bindSplToken2022MintTransferFeeMaximum(
        this.scratch,
        this.accountIndex(mint)
      )
    );
  }

  splToken2022MintWithheldAmount(mint: LetAccountInput): ScratchValue<"u64"> {
    return this.push(
      bindSplToken2022MintWithheldAmount(this.scratch, this.accountIndex(mint))
    );
  }

  splToken2022MintDefaultAccountState(
    mint: LetAccountInput
  ): ScratchValue<"u8"> {
    return this.push(
      bindSplToken2022MintDefaultAccountState(
        this.scratch,
        this.accountIndex(mint)
      )
    );
  }

  finish(): {
    args: import("./types").LetArgs;
    bindings: ScratchValue<IfxTy>[];
    remaining: AccountMeta[];
    scratch: FrameScratch;
  } {
    return {
      args: FrameScratch.toLetArgs(this.bindings),
      bindings: [...this.bindings],
      remaining: [...this.accounts],
      scratch: this.scratch,
    };
  }

  buildIx(opts?: IxOpts): TransactionInstruction {
    return this.scratch.ixLet(this, opts);
  }
}
