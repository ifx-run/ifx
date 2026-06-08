import { binding } from "../binding";
import type { FrameScratch, ScratchValue } from "../scratch";

/** Token-2022 token account `amount` (owner `spl_token_2022`, typed unpack). */
export function bindSplToken2022AccountAmount(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return scratch.planAtRemainingIndex(
    binding.splToken2022AccountAmount(0),
    remainingAccountIndex
  );
}

export function bindSplToken2022AccountDelegatedAmount(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return scratch.planAtRemainingIndex(
    binding.splToken2022AccountDelegatedAmount(0),
    remainingAccountIndex
  );
}

export function bindSplToken2022AccountState(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u8"> {
  return scratch.planAtRemainingIndex(
    binding.splToken2022AccountState(0),
    remainingAccountIndex
  );
}

export function bindSplToken2022AccountTransferFeeWithheld(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return scratch.planAtRemainingIndex(
    binding.splToken2022AccountTransferFeeWithheld(0),
    remainingAccountIndex
  );
}

export function bindSplToken2022MintSupply(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return scratch.planAtRemainingIndex(
    binding.splToken2022MintSupply(0),
    remainingAccountIndex
  );
}

export function bindSplToken2022MintDecimals(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u8"> {
  return scratch.planAtRemainingIndex(
    binding.splToken2022MintDecimals(0),
    remainingAccountIndex
  );
}

export function bindSplToken2022MintTransferFeeBasisPoints(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u16"> {
  return scratch.planAtRemainingIndex(
    binding.splToken2022MintTransferFeeBasisPoints(0),
    remainingAccountIndex
  );
}

export function bindSplToken2022MintTransferFeeMaximum(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return scratch.planAtRemainingIndex(
    binding.splToken2022MintTransferFeeMaximum(0),
    remainingAccountIndex
  );
}

export function bindSplToken2022MintWithheldAmount(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u64"> {
  return scratch.planAtRemainingIndex(
    binding.splToken2022MintWithheldAmount(0),
    remainingAccountIndex
  );
}

export function bindSplToken2022MintDefaultAccountState(
  scratch: FrameScratch,
  remainingAccountIndex: number
): ScratchValue<"u8"> {
  return scratch.planAtRemainingIndex(
    binding.splToken2022MintDefaultAccountState(0),
    remainingAccountIndex
  );
}
