import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import {
  encodeIfElseArgs,
  encodeCpi,
  CPI_WIRE,
} from "../sdk/src/codec";
import { arm, rawCpi, rawCpiPatch, expr, ifElseArgs, staticCpi } from "../sdk/src";
import { FrameScratch } from "../sdk/src/scratch";
import { systemTransferTemplate } from "../sdk/src/cpi";

describe("sdk if_else raw patched codec", () => {
  it("raw patched step starts with CPI_WIRE.rawPatched", () => {
    const scratch = new FrameScratch(Keypair.generate().publicKey, 256);
    const lamports = scratch.letConstU64(42);
    const built = rawCpi(systemTransferTemplate({ fromPubkey: Keypair.generate().publicKey, toPubkey: Keypair.generate().publicKey }), {
      patches: [rawCpiPatch(4, lamports)],
    }).build();
    const step = encodeCpi(built.cpi);
    expect(step[0]).to.equal(CPI_WIRE.rawPatched);
    const args = encodeIfElseArgs(
      ifElseArgs(expr.bool(true), arm.cpi(built.cpi), arm.skip())
    );
    expect(args.includes(CPI_WIRE.rawPatched)).to.equal(true);
  });

  it("static step starts with CPI_WIRE.static", () => {
    const a = staticCpi(
      systemTransferTemplate({
        fromPubkey: Keypair.generate().publicKey,
        toPubkey: Keypair.generate().publicKey,
      })
    );
    expect(encodeCpi(a.staticStep)[0]).to.equal(CPI_WIRE.static);
  });
});
