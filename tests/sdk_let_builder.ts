import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import { randomBytes } from "crypto";

import { DEFAULT_IFX_PROGRAM_ID } from "../sdk/src/constants";
import { encodeLetArgs } from "../sdk/src/codec";
import { frameAuthorityRequiresSigner } from "../sdk/src/frame-authority";
import { framePda } from "../sdk/src/layout";
import { FrameScratch } from "../sdk/src/scratch";
import { Ty } from "../sdk/src/ty";

function publicFrameScratch(tapeLen = 512): {
  scratch: FrameScratch;
  frame: PublicKey;
} {
  const payer = Keypair.generate().publicKey;
  const frameId = randomBytes(32);
  const [frame] = framePda(payer, frameId, DEFAULT_IFX_PROGRAM_ID);
  const scratch = new FrameScratch(
    frame,
    tapeLen,
    0,
    0,
    DEFAULT_IFX_PROGRAM_ID,
    frame
  );
  expect(frameAuthorityRequiresSigner(frame)).to.be.false;
  return { scratch, frame };
}

describe("sdk LetIxBuilder", () => {
  it("deduplicates remaining accounts by pubkey", () => {
    const user = Keypair.generate().publicKey;
    const ata = Keypair.generate().publicKey;
    const frame = Keypair.generate().publicKey;
    const scratch = new FrameScratch(frame, 512);
    const builder = scratch.letBuilder();

    builder.lamports(user);
    builder.lamports(user);
    builder.lamports(ata);

    const { remaining } = builder.finish();
    expect(remaining).to.have.length(2);
    expect(remaining[0].pubkey.equals(user)).to.be.true;
    expect(remaining[1].pubkey.equals(ata)).to.be.true;
  });

  it("merges writable flag when the same account is registered twice", () => {
    const user = Keypair.generate().publicKey;
    const frame = Keypair.generate().publicKey;
    const builder = new FrameScratch(frame, 512).letBuilder();

    builder.lamports({ pubkey: user, isSigner: false, isWritable: false });
    builder.lamports({ pubkey: user, isSigner: false, isWritable: true });

    const { remaining } = builder.finish();
    expect(remaining).to.have.length(1);
    expect(remaining[0].isWritable).to.be.true;
  });

  it("assigns the same account index to multiple loads", () => {
    const token = Keypair.generate().publicKey;
    const frame = Keypair.generate().publicKey;
    const builder = new FrameScratch(frame, 512).letBuilder();

    const tokenAmount = builder.splTokenAmount(token);
    const delegatedAmount = builder.splTokenDelegatedAmount(token);
    const { args } = builder.finish();

    const encoded = encodeLetArgs(args);
    expect(encoded.length).to.be.greaterThan(0);
    expect(tokenAmount.ref.index).to.not.equal(delegatedAmount.ref.index);
    expect(builder.remaining).to.have.length(1);
  });

  it("assigns the same account index to multiple Token-2022 loads", () => {
    const token = Keypair.generate().publicKey;
    const frame = Keypair.generate().publicKey;
    const builder = new FrameScratch(frame, 512).letBuilder();

    builder.splToken2022Amount(token);
    builder.splToken2022TransferFeeWithheld(token);
    const { args } = builder.finish();

    const encoded = encodeLetArgs(args);
    expect(encoded.length).to.be.greaterThan(0);
    expect(builder.remaining).to.have.length(1);
  });

  it("sysvar bindings need no remaining accounts", () => {
    const frame = Keypair.generate().publicKey;
    const builder = new FrameScratch(frame, 512).letBuilder();

    builder.clockSlot();
    builder.clockUnixTimestamp();
    builder.rentMinimumBalance(165);

    const { remaining, args } = builder.finish();
    expect(remaining).to.have.length(0);
    expect(args.bindings).to.have.length(3);
  });

  it("buildIx wires remaining into instruction keys", () => {
    const user = Keypair.generate().publicKey;
    const { scratch, frame } = publicFrameScratch();
    const builder = scratch.letBuilder();
    builder.lamports(user);

    const ix = builder.buildIx();
    expect(ix.keys[0].pubkey.equals(frame)).to.be.true;
    expect(ix.keys[1].pubkey.equals(user)).to.be.true;
    expect(ix.keys).to.have.length(2);
  });

  it("buildIx prepends authority to remaining for private frames", () => {
    const frame = Keypair.generate().publicKey;
    const user = Keypair.generate().publicKey;
    const authority = Keypair.generate().publicKey;
    expect(frameAuthorityRequiresSigner(authority)).to.be.true;
    const scratch = new FrameScratch(
      frame,
      512,
      0,
      0,
      DEFAULT_IFX_PROGRAM_ID,
      authority
    );
    const builder = scratch.letBuilder();
    builder.lamports(user);

    const ix = builder.buildIx();
    expect(ix.keys[0].pubkey.equals(frame)).to.be.true;
    expect(ix.keys[1].pubkey.equals(authority)).to.be.true;
    expect(ix.keys[1].isSigner).to.be.true;
    expect(ix.keys[2].pubkey.equals(user)).to.be.true;
    expect(ix.keys).to.have.length(3);
  });
});
