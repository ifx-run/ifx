/** `PatchList` wire: `U16LenVec<CpiPatch>` — u16 LE count + entries; `[]` = static step. */
import type { CpiPatch } from "./types";
export type PatchList = CpiPatch[];
export declare function patchListStatic(): PatchList;
export declare function patchListPatched(patches: CpiPatch[]): PatchList;
export declare function patchListHasPatches(list: PatchList): boolean;
export declare function patchListPatches(list: PatchList): CpiPatch[];
