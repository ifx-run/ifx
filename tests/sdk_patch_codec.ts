import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import { encodeRawCpiPatch } from "../sdk/src/codec";
import { FrameScratch } from "../sdk/src/scratch";
import { rawCpiPatch } from "../sdk/src/patch";

describe("sdk patch codec", () => {
  const frame = Keypair.generate().publicKey;

  it("encodes data_offset u16 LE + Value.index u8", () => {
    const scratch = new FrameScratch(frame, 512);
    const lamports = scratch.letConstU64(1);
    const buf = encodeRawCpiPatch(rawCpiPatch(4, lamports));
    expect(buf).to.deep.equal(
      Buffer.from([4, 0, lamports.ref.index])
    );
  });
});
