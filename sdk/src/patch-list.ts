/** `PatchList` wire: `U16LenVec<CpiPatch>` — u16 LE count + entries; `[]` = static step. */

import type { CpiPatch } from "./types";

export type PatchList = CpiPatch[];

export function patchListStatic(): PatchList {
  return [];
}

export function patchListPatched(patches: CpiPatch[]): PatchList {
  return patches;
}

export function patchListHasPatches(list: PatchList): boolean {
  return list.length > 0;
}

export function patchListPatches(list: PatchList): CpiPatch[] {
  return list;
}
