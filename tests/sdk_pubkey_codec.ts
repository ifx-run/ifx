import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";

import { binding } from "../sdk/src/binding";
import { encodeExpr, encodeLetBinding } from "../sdk/src/codec";
import { expr } from "../sdk/src/expr";
import { valueTypeToTag } from "../sdk/src/tape-layout";
import { Ty } from "../sdk/src/ty";

describe("sdk Pubkey wire", () => {
  it("encodeLetBinding accountKey and constPubkey", () => {
    const key = encodeLetBinding(binding.accountKey(3));
    expect(key).to.deep.equal(Buffer.from([25, 3]));

    const pk = Buffer.alloc(32, 9);
    const lit = encodeLetBinding(binding.constPubkey(pk));
    expect(lit[0]).to.equal(26);
    expect(lit.subarray(1)).to.deep.equal(pk);
  });

  it("encodeExpr constPubkey and eq", () => {
    const pk = PublicKey.unique();
    const lit = encodeExpr(expr.pubkey(pk));
    expect(lit[0]).to.equal(43);
    expect(lit.subarray(1, 33)).to.deep.equal(pk.toBuffer());

    const cmp = encodeExpr(expr.eq(expr.pubkey(pk), { value: { value: { index: 1 } } }));
    expect(cmp[0]).to.equal(28);
  });

  it("ValueType pubkey tag is 13", () => {
    expect(valueTypeToTag(Ty.pubkey())).to.equal(13);
  });
});
