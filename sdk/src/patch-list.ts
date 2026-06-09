/** `PatchList` wire: `U16LenVec<RawCpiPatch>` — u16 LE count + entries; `[]` = static step. */

import type { RawCpiPatch } from "./types";

export type PatchList = RawCpiPatch[];

export function patchListStatic(): PatchList {
  return [];
}

export function patchListPatched(patches: RawCpiPatch[]): PatchList {
  return patches;
}

export function patchListHasPatches(list: PatchList): boolean {
  return list.length > 0;
}

export function patchListPatches(list: PatchList): RawCpiPatch[] {
  return list;
}
