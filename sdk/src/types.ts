import type { IdlTypes } from "@anchor-lang/core";
import type { IfElseArm } from "./expr/arm";
import type { PatchList } from "./patch-list";
import type { Ifx } from "./idl/ifx";

export type ValueType = IdlTypes<Ifx>["valueType"];
export type Expr = IdlTypes<Ifx>["expr"];
export type LetBinding = IdlTypes<Ifx>["letBinding"];
export type RawCpiPatch = IdlTypes<Ifx>["rawCpiPatch"];

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
export const CPI_WIRE = {
  static: 0,
  rawPatched: 1,
  structured: 2,
} as const;

/** @deprecated Use {@link CPI_WIRE.rawPatched} */
export const CPI_WIRE_LEGACY = { genericPatched: CPI_WIRE.rawPatched } as const;

type IdlIfElseArgs = IdlTypes<Ifx>["ifElseArgs"];

export type IfElseArgs = Omit<IdlIfElseArgs, "thenArm" | "elseArm"> & {
  thenArm: IfElseArm;
  elseArm: IfElseArm;
};

export type Value = IdlTypes<Ifx>["value"];

export function cpiRequiresPatchApply(cpi: Cpi): boolean {
  switch (cpi.kind) {
    case "static":
      return false;
    case "rawPatched":
      return cpi.patches.length > 0;
    case "structured":
      return true;
  }
}
