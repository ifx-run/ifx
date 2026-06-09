import type { ScratchValue } from "./scratch";
import type { RawCpiPatch } from "./types";
import type { IfxTy } from "./typed";
/**
 * Raw byte overlay on template CPI `data` (wire kind `1` — escape hatch for DEX / custom layouts).
 * Prefer {@link structuredCpi} for official System / SPL ix.
 */
export declare function rawCpiPatch<T extends IfxTy>(dataOffset: number, at: ScratchValue<T>): RawCpiPatch;
/** @deprecated Use {@link rawCpiPatch} */
export declare const cpiPatch: typeof rawCpiPatch;
