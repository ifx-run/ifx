import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

import { encodeLetArgs } from "../sdk/src/codec";
import { FrameScratch } from "../sdk/src/scratch";
import { Ty } from "../sdk/src/ty";

describe("sdk LetIxBuilder", () => {
  it("deduplicates remaining accounts by pubkey", () => {
    const user = Keypair.generate().publicKey;
    const ata = Keypair.generate().publicKey;
    const frame = Keypair.generate().publicKey;
    const scratch = new FrameScratch(frame, 256);
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
    const builder = new FrameScratch(frame, 256).letBuilder();

    builder.lamports({ pubkey: user, isSigner: false, isWritable: false });
    builder.lamports({ pubkey: user, isSigner: false, isWritable: true });

    const { remaining } = builder.finish();
    expect(remaining).to.have.length(1);
    expect(remaining[0].isWritable).to.be.true;
  });

  it("assigns the same account index to multiple loads", () => {
    const token = Keypair.generate().publicKey;
    const frame = Keypair.generate().publicKey;
    const builder = new FrameScratch(frame, 256).letBuilder();

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
    const builder = new FrameScratch(frame, 256).letBuilder();

    builder.splToken2022Amount(token);
    builder.splToken2022TransferFeeWithheld(token);
    const { args } = builder.finish();

    const encoded = encodeLetArgs(args);
    expect(encoded.length).to.be.greaterThan(0);
    expect(builder.remaining).to.have.length(1);
  });

  it("sysvar bindings need no remaining accounts", () => {
    const frame = Keypair.generate().publicKey;
    const builder = new FrameScratch(frame, 256).letBuilder();

    builder.clockSlot();
    builder.clockUnixTimestamp();
    builder.rentMinimumBalance(165);

    const { remaining, args } = builder.finish();
    expect(remaining).to.have.length(0);
    expect(args.bindings).to.have.length(3);
  });

  it("buildIx wires remaining into instruction keys", () => {
    const frame = Keypair.generate().publicKey;
    const user = Keypair.generate().publicKey;
    const builder = new FrameScratch(frame, 256).letBuilder();
    builder.lamports(user);

    const ix = builder.buildIx();
    expect(ix.keys[0].pubkey.equals(frame)).to.be.true;
    expect(ix.keys[1].pubkey.equals(user)).to.be.true;
    expect(ix.keys).to.have.length(2);
  });
});
