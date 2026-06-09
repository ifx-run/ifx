import { resolveRef } from "./expr";
import type { ScratchValue } from "./scratch";
import type { RawCpiPatch } from "./types";
import type { IfxTy } from "./typed";

/**
 * Raw byte overlay on template CPI `data` (wire kind `1` — escape hatch for DEX / custom layouts).
 * Prefer {@link structuredCpi} for official System / SPL ix.
 */
export function rawCpiPatch<T extends IfxTy>(
  dataOffset: number,
  at: ScratchValue<T>
): RawCpiPatch {
  return {
    dataOffset,
    source: { index: resolveRef(at).index },
  };
}

/** @deprecated Use {@link rawCpiPatch} */
export const cpiPatch = rawCpiPatch;
