import { type PatchList } from "./patch-list";
import type { Cpi, Expr } from "./types";
export { LET_BINDING_VARIANT } from "./let-binding-variants";
export { EXPR_TAG, EXPR_VARIANT, EXPR_VARIANT_COUNT } from "./expr-variants";
export { IF_ELSE_ARM, ifElseArmStepTag, } from "./if-else-arm";
export { patchListPatched, patchListStatic, type PatchList, } from "./patch-list";
export { CPI_WIRE } from "./types";
export { STRUCTURED_CPI_PATCH_WIRE, type StructuredCpiPatchWireTag, } from "./structured-cpi-patch";
/** Runtime shapes from {@link expr} / {@link binding} helpers (avoid recursive IDL types here). */
type AnyExpr = any;
type AnyRecord = any;
export declare function encodeValueType(ty: AnyRecord): Buffer;
/** Bound value reference: binding **index** only (type resolved via `payload_at` on-chain). */
export declare function encodeValue(ref: AnyRecord): Buffer;
/** `U8LenVec` length prefix: u8 (max 255 elements). */
export declare function writeU8Len(buf: Buffer[], n: number): void;
/** Encode `U8LenVec<T>`: u8 count + mapped elements. */
export declare function encodeU8LenVec<T>(items: readonly T[], encodeItem: (item: T) => Buffer): Buffer;
/** `U16LenVec` length prefix: u16 LE (max 65535 elements). */
export declare function writeU16Len(buf: Buffer[], n: number): void;
/** Encode `U16LenVec<T>`: u16 LE count + mapped elements. */
export declare function encodeU16LenVec<T>(items: readonly T[], encodeItem: (item: T) => Buffer): Buffer;
/** `U16LenVec<u8>`: u16 LE length + raw bytes. */
export declare function encodeU16LenBytes(data: Buffer | Uint8Array): Buffer;
export declare function encodeExpr(expr: AnyExpr): Buffer;
export declare function encodeLetBinding(binding: AnyRecord): Buffer;
export declare function encodeLetArgs(args: AnyRecord): Buffer;
export declare function encodeAssertMultiArgs(args: {
    conds: readonly Expr[];
}): Buffer;
export declare function encodeRawCpiPatch(patch: AnyRecord): Buffer;
/** @deprecated Use {@link encodeRawCpiPatch} */
export declare const encodeCpiPatch: typeof encodeRawCpiPatch;
export declare function encodePatchList(list: PatchList): Buffer;
export declare function encodeCpi(step: Cpi): Buffer;
export declare function encodeIfElseArgs(args: AnyRecord): Buffer;
