import { expect } from "chai";
import { SystemProgram } from "@solana/web3.js";

import {
  encodeIfElseArgs,
  encodePatchList,
  encodeCpi,
  IF_ELSE_ARM,
  CPI_WIRE,
  patchListStatic,
} from "../sdk/src/codec";
import { arm, expr, ifElseArgs, staticCpi } from "../sdk/src";

describe("sdk if_else + PatchList codec", () => {
  it("PatchList static is u16(0)", () => {
    expect(encodePatchList(patchListStatic())).to.deep.equal(
      Buffer.from([0x00, 0x00])
    );
  });

  it("encodes skip / revert arm tags", () => {
    const skipSkip = encodeIfElseArgs(
      ifElseArgs(expr.bool(true), arm.skip(), arm.skip())
    );
    expect(skipSkip.subarray(skipSkip.length - 2)).to.deep.equal(
      Buffer.from([IF_ELSE_ARM.skip, IF_ELSE_ARM.skip])
    );

    const revertSkip = encodeIfElseArgs(
      ifElseArgs(expr.bool(false), arm.revert(), arm.skip())
    );
    expect(revertSkip[revertSkip.length - 2]).to.equal(IF_ELSE_ARM.revert);
  });

  it("two-step arm tag is 0x02; static steps use CPI_WIRE.static tag", () => {
    const a = staticCpi(
      SystemProgram.transfer({
        fromPubkey: SystemProgram.programId,
        toPubkey: SystemProgram.programId,
        lamports: 1,
      })
    );
    const b = staticCpi(
      SystemProgram.transfer({
        fromPubkey: SystemProgram.programId,
        toPubkey: SystemProgram.programId,
        lamports: 2,
      })
    );
    const encoded = encodeIfElseArgs(
      ifElseArgs(
        expr.bool(true),
        arm.cpis([a.staticStep, b.staticStep]),
        arm.skip()
      )
    );
    const step1 = encodeCpi(a.staticStep);
    const step2 = encodeCpi(b.staticStep);
    const thenArmLen = 1 + step1.length + step2.length;
    const elseArmLen = 1; // skip
    const thenArmStart = encoded.length - elseArmLen - thenArmLen;
    expect(encoded[thenArmStart]).to.equal(2);
    expect(encoded[thenArmStart + 1]).to.equal(CPI_WIRE.static);
    expect(encoded[thenArmStart + 1 + step1.length]).to.equal(CPI_WIRE.static);
  });
});
