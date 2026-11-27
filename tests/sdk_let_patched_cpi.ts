import { expect } from "chai";
import { Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";

import {
  FrameScratch,
  IX_DISC_LET_PATCHED_CPI,
  createIxLetPatchedCpi,
  decodeIfxInstruction,
  staticCpi,
} from "../sdk/src";

function echoLike(data: Buffer): TransactionInstruction {
  return new TransactionInstruction({
    programId: Keypair.generate().publicKey,
    keys: [],
    data,
  });
}

describe("ifx_let_patched_cpi sdk", () => {
  const payload = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);

  it("reserves one tape index per return-data let", () => {
    const frame = Keypair.generate().publicKey;
    const authority = Keypair.generate().publicKey;
    const scratch = new FrameScratch(frame, 512, 0, 0, undefined, authority);
    const built = staticCpi(echoLike(payload));
    const { ix, values } = scratch.ixLetPatchedCpi(
      { cpi: built.staticStep, remaining: built.remaining },
      [
        { ty: "u64", offset: 0 },
        { ty: "u32", offset: 8 },
      ]
    );
    expect(ix.data[0]).to.equal(IX_DISC_LET_PATCHED_CPI);
    expect(decodeIfxInstruction(ix.data).name).to.equal("ifx_let_patched_cpi");
    expect(values.map((v) => v.ref.index)).to.deep.equal([0, 1]);
    expect(ix.keys[0]!.pubkey.equals(frame)).to.equal(true);
    expect(ix.keys[0]!.isWritable).to.equal(true);
    expect(ix.keys[1]!.pubkey.equals(authority)).to.equal(true);
    expect(ix.keys[1]!.isSigner).to.equal(true);
    expect(ix.keys[2]!.pubkey.equals(built.remaining[0]!.pubkey)).to.equal(true);
    expect(ix.data[14]).to.equal(2);
    expect(ix.data[15]).to.equal(4);
  });

  it("public Frame does not prepend an authority signer", () => {
    const program = Keypair.generate().publicKey;
    const [frame] = PublicKey.findProgramAddressSync([Buffer.from("let-cpi")], program);
    const scratch = FrameScratch.forPublicFrame({ framePubkey: frame, tapeLen: 512 });
    const built = staticCpi(echoLike(payload));
    const ix = createIxLetPatchedCpi(
      frame,
      frame,
      { cpi: built.staticStep, remaining: built.remaining },
      [
        { ty: { u64: {} }, offset: 0 },
        { ty: { u64: {} }, offset: 8 },
      ]
    );
    expect(ix.keys).to.have.length(2);
    expect(ix.keys[1]!.isSigner).to.equal(false);
  });

  it("rejects an empty let list and an offset past return data", () => {
    const frame = Keypair.generate().publicKey;
    const built = staticCpi(echoLike(payload));
    expect(() =>
      createIxLetPatchedCpi(frame, frame, { cpi: built.staticStep, remaining: built.remaining }, [])
    ).to.throw(/1\.\.=255/);
    expect(() =>
      createIxLetPatchedCpi(
        frame,
        frame,
        { cpi: built.staticStep, remaining: built.remaining },
        [{ ty: { u64: {} }, offset: 1020 }]
      )
    ).to.throw(/exceeds 1024/);
  });
});
