import { binding } from "../binding";
import type { FrameScratch, ScratchValue } from "../scratch";

export function bindClockSlot(scratch: FrameScratch): ScratchValue<"u64"> {
  return scratch.plan(binding.sysvarClockSlot());
}

export function bindClockEpochStartTimestamp(
  scratch: FrameScratch
): ScratchValue<"i64"> {
  return scratch.plan(binding.sysvarClockEpochStartTimestamp());
}

export function bindClockEpoch(scratch: FrameScratch): ScratchValue<"u64"> {
  return scratch.plan(binding.sysvarClockEpoch());
}

export function bindClockLeaderScheduleEpoch(
  scratch: FrameScratch
): ScratchValue<"u64"> {
  return scratch.plan(binding.sysvarClockLeaderScheduleEpoch());
}

export function bindClockUnixTimestamp(scratch: FrameScratch): ScratchValue<"i64"> {
  return scratch.plan(binding.sysvarClockUnixTimestamp());
}

export function bindRentMinimumBalance(
  scratch: FrameScratch,
  dataLen: number
): ScratchValue<"u64"> {
  return scratch.plan(binding.sysvarRentMinimumBalance(dataLen));
}
