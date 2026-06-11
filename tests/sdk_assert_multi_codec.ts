import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";

import { encodeAssertMultiArgs } from "../sdk/src/codec";
import { expr } from "../sdk/src/expr";
import { buildIxAssertMulti, IX_DISCRIMINATOR } from "../sdk/src/ix";
import { IX_DISC_ASSERT_MULTI } from "../sdk/src/constants";

describe("sdk assert_multi codec", () => {
  it("disc=5 and U8LenVec<Expr> payload", () => {
    const frame = PublicKey.unique();
    const guards = [
      expr.eq(expr.u64(1n), expr.u64(1n)),
      expr.eq(expr.u64(2n), expr.u64(2n)),
    ];
    const ix = buildIxAssertMulti(frame, guards);
    expect(ix.data[0]).to.equal(IX_DISC_ASSERT_MULTI);
    expect(ix.data.subarray(0, 1)).to.deep.equal(IX_DISCRIMINATOR.ifxAssertMulti);
    const body = encodeAssertMultiArgs({ conds: guards });
    expect(ix.data.subarray(1)).to.deep.equal(body);
    expect(body[0]).to.equal(2);
  });

  it("rejects empty cond list off-chain", () => {
    const frame = PublicKey.unique();
    expect(() => buildIxAssertMulti(frame, [])).to.throw(/at least one/i);
  });
});
