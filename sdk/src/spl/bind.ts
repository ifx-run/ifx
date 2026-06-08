import { binding } from "../binding";
import type { FrameScratch, ScratchValue } from "../scratch";

/** `ifx_let` binding: SPL token account `amount` (typed unpack, owner `spl_token`). */
export function bindSplTokenAmount(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return scratch.planAtRemainingIndex(
    binding.splTokenAccountAmount(0),
    remainingAccountIndex
  );
}

export function bindSplTokenDelegatedAmount(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return scratch.planAtRemainingIndex(
    binding.splTokenAccountDelegatedAmount(0),
    remainingAccountIndex
  );
}

export function bindSplTokenAccountState(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u8"> {
  return scratch.planAtRemainingIndex(
    binding.splTokenAccountState(0),
    remainingAccountIndex
  );
}

export function bindSplMintSupply(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return scratch.planAtRemainingIndex(
    binding.splMintSupply(0),
    remainingAccountIndex
  );
}

export function bindSplMintDecimals(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u8"> {
  return scratch.planAtRemainingIndex(
    binding.splMintDecimals(0),
    remainingAccountIndex
  );
}
