import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import { FrameScratch } from "../sdk/src/scratch";

describe("sdk FrameScratch single let", () => {
  it("letLamports uses remaining index 0 without caller passing 0", () => {
    const frame = Keypair.generate().publicKey;
    const user = Keypair.generate().publicKey;
    const scratch = new FrameScratch(frame, 256);

    const userLamports = scratch.letLamports(user);

    expect(userLamports.letRemaining).to.have.length(1);
    expect(userLamports.letRemaining![0].pubkey.equals(user)).to.be.true;
    expect(userLamports.letRemaining![0].isSigner).to.be.false;
    expect(userLamports.letRemaining![0].isWritable).to.be.false;

    const ix = scratch.ixLet(userLamports);
    expect(ix.keys[1].pubkey.equals(user)).to.be.true;
    expect(userLamports.ref.index).to.equal(0);
  });

  it("letConstU64 has empty remaining", () => {
    const frame = Keypair.generate().publicKey;
    const scratch = new FrameScratch(frame, 256);
    const bound = scratch.letConstU64(42);
    expect(bound.letRemaining ?? []).to.have.length(0);
    expect(bound.ref.index).to.equal(0);
  });

  it("letConstU64 uses binding index 0 on a fresh scratch", () => {
    const frame = Keypair.generate().publicKey;
    const scratch = new FrameScratch(frame, 256);
    const first = scratch.letConstU64(1);
    const second = new FrameScratch(frame, 256).letConstU64(2);
    expect(first.ref.index).to.equal(0);
    expect(second.ref.index).to.equal(0);
  });
});
