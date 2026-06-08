import type { ScratchValue } from "./scratch";
import type { CpiPatch } from "./types";
import type { IfxTy } from "./typed";
/** Patch template CPI `data` at `dataOffset` from a frame binding (`Value.index` is u8). */
export declare function cpiPatch<T extends IfxTy>(dataOffset: number, at: ScratchValue<T>): CpiPatch;
