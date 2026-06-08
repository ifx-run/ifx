import type { FrameScratch, ScratchValue } from "../scratch";
export declare function bindClockSlot(scratch: FrameScratch): ScratchValue<"u64">;
export declare function bindClockEpochStartTimestamp(scratch: FrameScratch): ScratchValue<"i64">;
export declare function bindClockEpoch(scratch: FrameScratch): ScratchValue<"u64">;
export declare function bindClockLeaderScheduleEpoch(scratch: FrameScratch): ScratchValue<"u64">;
export declare function bindClockUnixTimestamp(scratch: FrameScratch): ScratchValue<"i64">;
export declare function bindRentMinimumBalance(scratch: FrameScratch, dataLen: number): ScratchValue<"u64">;
