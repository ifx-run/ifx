import type { IdlTypes } from "@anchor-lang/core";
import type { IfElseArm } from "./expr/arm";
import type { PatchList } from "./patch-list";
import type { Ifx } from "./idl/ifx";
export type ValueType = IdlTypes<Ifx>["valueType"];
export type Expr = IdlTypes<Ifx>["expr"];
export type LetBinding = IdlTypes<Ifx>["letBinding"];
/** Frame binding index (IDL `Value`; not inferred when Anchor `RecursiveDepth4` truncates). */
export type Value = {
    index: number;
};
/** Raw patched CPI byte overlay (IDL `RawCpiPatch`). */
export type RawCpiPatch = {
    dataOffset: number;
    source: Value;
};
/** @deprecated Use {@link RawCpiPatch} */
export type CpiPatch = RawCpiPatch;
/** Wire: u16 LE element count + items. IDL `U16LenVec` is an empty marker struct. */
export type U16LenVec<T> = T[];
/** Wire: u8 element count + items (max 255 per `ifx_let`). */
export type U8LenVec<T> = T[];
type IdlLetArgs = IdlTypes<Ifx>["letArgs"];
export type LetArgs = Omit<IdlLetArgs, "bindings"> & {
    bindings: U8LenVec<LetBinding>;
};
export type AssertMultiArgs = {
    conds: U8LenVec<Expr>;
};
export type CpiStatic = {
    kind: "static";
    accountsStart: number;
    accountsLen: number;
    data: Buffer;
};
export type CpiRawPatched = {
    kind: "rawPatched";
    accountsStart: number;
    accountsLen: number;
    data: Buffer;
    patches: PatchList;
};
/** @deprecated Use {@link CpiRawPatched} */
export type CpiGenericPatched = CpiRawPatched;
export type CpiStructured = {
    kind: "structured";
    accountsStart: number;
    accountsLen: number;
    patch: import("./structured-cpi-patch").StructuredCpiPatch;
};
export type Cpi = CpiStatic | CpiRawPatched | CpiStructured;
/** Wire discriminant for [`Cpi`] step variants (matches on-chain `Cpi` tag). */
export declare const CPI_WIRE: {
    readonly static: 0;
    readonly rawPatched: 1;
    readonly structured: 2;
};
/** @deprecated Use {@link CPI_WIRE.rawPatched} */
export declare const CPI_WIRE_LEGACY: {
    readonly genericPatched: 1;
};
type IdlIfElseArgs = IdlTypes<Ifx>["ifElseArgs"];
export type IfElseArgs = Omit<IdlIfElseArgs, "thenArm" | "elseArm"> & {
    thenArm: IfElseArm;
    elseArm: IfElseArm;
};
export declare function cpiRequiresPatchApply(cpi: Cpi): boolean;
export {};
