import type { IdlTypes } from "@anchor-lang/core";
import type { IfElseArm } from "./expr/arm";
import type { PatchList } from "./patch-list";
import type { Ifx } from "./idl/ifx";

export type ValueType = IdlTypes<Ifx>["valueType"];
export type Expr = IdlTypes<Ifx>["expr"];
export type LetBinding = IdlTypes<Ifx>["letBinding"];
export type CpiPatch = IdlTypes<Ifx>["cpiPatch"];

/** Wire: u16 LE element count + items. IDL `U16LenVec` is an empty marker struct. */
export type U16LenVec<T> = T[];

/** Wire: u8 element count + items (max 255 per `ifx_let`). */
export type U8LenVec<T> = T[];

type IdlLetArgs = IdlTypes<Ifx>["letArgs"];
type IdlCpi = IdlTypes<Ifx>["cpi"];

export type LetArgs = Omit<IdlLetArgs, "bindings"> & {
  bindings: U8LenVec<LetBinding>;
};

export type Cpi = Omit<IdlCpi, "data" | "patches"> & {
  data: Buffer;
  patches: PatchList;
};

type IdlIfElseArgs = IdlTypes<Ifx>["ifElseArgs"];

export type IfElseArgs = Omit<IdlIfElseArgs, "thenArm" | "elseArm"> & {
  thenArm: IfElseArm;
  elseArm: IfElseArm;
};

export type Value = IdlTypes<Ifx>["value"];
