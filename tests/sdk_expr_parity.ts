import { PublicKey } from "@solana/web3.js";
import { expect } from "chai";

import { encodeExpr, EXPR_TAG } from "../sdk/src/codec";
import { expr } from "../sdk/src/expr";
import {
  EXPR_NEXT_TAG,
  EXPR_VARIANT,
  EXPR_VARIANT_COUNT,
  type ExprVariantKey,
} from "../sdk/src/expr-variants";
import type { Expr } from "../sdk/src/types";
import idl from "../idl/ifx.json";

function pascalToCamel(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

const U64 = expr.u64(1);
const U128 = expr.u128(2);
const BOOL = expr.bool(true);

/** Minimal wire sample per {@link EXPR_VARIANT} entry (tag = array index). */
function sampleExpr(key: ExprVariantKey): Expr {
  switch (key) {
    case "value":
      return { value: { value: { index: 0 } } };
    case "constBool":
      return expr.bool(false);
    case "constU8":
      return expr.u8(1);
    case "constU16":
      return expr.u16(1);
    case "constU32":
      return expr.u32(1);
    case "constU64":
      return U64;
    case "constU128":
      return U128;
    case "constI8":
      return expr.i8(-1);
    case "constI16":
      return expr.i16(-1);
    case "constI32":
      return expr.i32(-1);
    case "constI64":
      return expr.i64(-1);
    case "constI128":
      return expr.i128(-1);
    case "constF32":
      return expr.f32(1.5);
    case "constF64":
      return expr.f64(1.5);
    case "constPubkey":
      return expr.pubkey(PublicKey.default);
    case "not":
      return expr.not(BOOL);
    case "neg":
      return expr.neg(expr.i64(-3));
    case "isZero":
      return expr.isZero(U64);
    case "nonZero":
      return expr.nonZero(U64);
    case "asU64":
      return expr.asU64(U128);
    case "asU128":
      return expr.asU128(U64);
    case "add":
      return expr.add(U64, U64);
    case "sub":
      return expr.sub(U64, U64);
    case "mul":
      return expr.mul(U64, U64);
    case "div":
      return expr.div(U64, U64);
    case "divFloor":
      return expr.divFloor(U64, U64);
    case "divCeil":
      return expr.divCeil(U64, U64);
    case "min":
      return expr.min(U64, U64);
    case "max":
      return expr.max(U64, U64);
    case "eq":
      return expr.eq(U64, U64);
    case "ne":
      return expr.ne(U64, U64);
    case "gt":
      return expr.gt(U64, U64);
    case "ge":
      return expr.ge(U64, U64);
    case "lt":
      return expr.lt(U64, U64);
    case "le":
      return expr.le(U64, U64);
    case "saturatingSub":
      return expr.saturatingSub(U64, U64);
    case "and":
      return expr.and(BOOL, BOOL);
    case "or":
      return expr.or(BOOL, BOOL);
    case "bpsMulFloor":
      return expr.bpsMulFloor(U64, U64);
    case "bpsMulCeil":
      return expr.bpsMulCeil(U64, U64);
    case "mulDivFloor":
      return expr.mulDivFloor(U64, U64, U64);
    case "mulDivCeil":
      return expr.mulDivCeil(U64, U64, U64);
    case "clamp":
      return expr.clamp(U64, U64, U64);
    case "select":
      return expr.select(BOOL, U64, U64);
    default: {
      const _exhaustive: never = key;
      throw new Error(`missing sample for ${String(_exhaustive)}`);
    }
  }
}

describe("sdk Expr wire parity", () => {
  it("EXPR_VARIANT matches IDL enum order (tags 0..43)", () => {
    const def = idl.types.find((t) => t.name === "Expr");
    expect(def?.type.kind).to.equal("enum");
    const idlKeys = def!.type.variants.map((v) => pascalToCamel(v.name));
    expect(idlKeys).to.deep.equal([...EXPR_VARIANT]);
    expect(EXPR_VARIANT_COUNT).to.equal(44);
    expect(EXPR_NEXT_TAG).to.equal(44);
  });

  it("EXPR_TAG indices are contiguous 0..43", () => {
    for (let tag = 0; tag < EXPR_VARIANT.length; tag++) {
      const key = EXPR_VARIANT[tag];
      expect(EXPR_TAG[key]).to.equal(tag);
    }
  });

  it("encodeExpr writes tag = EXPR_VARIANT index for every variant", () => {
    for (let tag = 0; tag < EXPR_VARIANT.length; tag++) {
      const key = EXPR_VARIANT[tag];
      const encoded = encodeExpr(sampleExpr(key));
      expect(encoded[0]).to.equal(tag, `variant ${key}`);
    }
  });
});
