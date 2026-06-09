import { expect } from "chai";
import { Keypair, SystemProgram } from "@solana/web3.js";

import { createIxCpi, rawCpi } from "../sdk/src";

describe("sdk ix guards", () => {
  it("createIxCpi rejects empty patches", () => {
    const frame = Keypair.generate().publicKey;
    const built = rawCpi(
      SystemProgram.transfer({
        fromPubkey: SystemProgram.programId,
        toPubkey: SystemProgram.programId,
        lamports: 1,
      })
    ).build();
    expect(() => createIxCpi(frame, built)).to.throw(
      /requires at least one patch/
    );
  });
});
