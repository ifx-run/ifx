import { expect } from "chai";

import { encodeExpr, EXPR_TAG } from "../sdk/src/codec";
import { expr } from "../sdk/src/expr";

describe("sdk flat Expr codec", () => {
  it("uses single-byte tags (no unary/binary shells)", () => {
    const add = encodeExpr(expr.add(expr.u64(1), expr.u64(2)));
    expect(add[0]).to.equal(EXPR_TAG.add);
    expect(add.length).to.equal(19);

    const ge = encodeExpr(expr.ge(expr.u64(3), expr.u64(1)));
    expect(ge[0]).to.equal(EXPR_TAG.ge);

    const nz = encodeExpr(expr.nonZero(expr.u64(1)));
    expect(nz[0]).to.equal(EXPR_TAG.nonZero);
  });

  it("encodes P0/P1 variants", () => {
    expect(encodeExpr(expr.asU64(expr.u128(42)))[0]).to.equal(EXPR_TAG.asU64);
    expect(
      encodeExpr(expr.mulDivFloor(expr.u64(100), expr.u64(50), expr.u64(10)))[0]
    ).to.equal(EXPR_TAG.mulDivFloor);
    expect(
      encodeExpr(expr.bpsMulFloor(expr.u64(1_000_000), expr.u64(50)))[0]
    ).to.equal(EXPR_TAG.bpsMulFloor);
    expect(
      encodeExpr(expr.clamp(expr.u64(5), expr.u64(0), expr.u64(10)))[0]
    ).to.equal(EXPR_TAG.clamp);
    expect(
      encodeExpr(
        expr.select(expr.bool(true), expr.u64(1), expr.u64(2))
      )[0]
    ).to.equal(EXPR_TAG.select);
  });
});
