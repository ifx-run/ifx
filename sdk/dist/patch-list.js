"use strict";
/** `PatchList` wire: `U16LenVec<RawCpiPatch>` — u16 LE count + entries; `[]` = static step. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchListStatic = patchListStatic;
exports.patchListPatched = patchListPatched;
exports.patchListHasPatches = patchListHasPatches;
exports.patchListPatches = patchListPatches;
function patchListStatic() {
    return [];
}
function patchListPatched(patches) {
    return patches;
}
function patchListHasPatches(list) {
    return list.length > 0;
}
function patchListPatches(list) {
    return list;
}
