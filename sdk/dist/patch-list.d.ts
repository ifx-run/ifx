/** `PatchList` wire: `U16LenVec<RawCpiPatch>` — u16 LE count + entries; `[]` = static step. */
import type { RawCpiPatch } from "./types";
export type PatchList = RawCpiPatch[];
export declare function patchListStatic(): PatchList;
export declare function patchListPatched(patches: RawCpiPatch[]): PatchList;
export declare function patchListHasPatches(list: PatchList): boolean;
export declare function patchListPatches(list: PatchList): RawCpiPatch[];
