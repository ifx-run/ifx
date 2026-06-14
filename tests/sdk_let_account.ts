import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";

import { FrameScratch, toLetAccountMeta } from "../sdk/src";

/** Simulates a PublicKey from another `@solana/web3.js` install (different constructor). */
function foreignPublicKey(): PublicKey {
  const inner = PublicKey.unique();
  return {
    toBase58: () => inner.toBase58(),
    toBytes: () => inner.toBytes(),
    toBuffer: () => inner.toBuffer(),
  } as unknown as PublicKey;
}

describe("let account input", () => {
  it("toLetAccountMeta accepts foreign PublicKey-like objects", () => {
    const foreign = foreignPublicKey();
    const meta = toLetAccountMeta(foreign);
    expect(meta.isSigner).to.be.false;
    expect(meta.isWritable).to.be.false;
    expect(meta.pubkey.toBase58()).to.equal(
      (foreign as unknown as { toBase58(): string }).toBase58()
    );
  });

  it("letBuilder.lamports accepts foreign PublicKey", () => {
    const frame = PublicKey.unique();
    const scratch = new FrameScratch(frame, 512);
    const user = foreignPublicKey();
    const b = scratch.letBuilder();
    const binding = b.lamports(user);
    expect(binding.ref.index).to.equal(0);
    const { remaining } = b.finish();
    expect(remaining).to.have.length(1);
    expect(remaining[0]!.pubkey.toBase58()).to.equal(
      (user as unknown as { toBase58(): string }).toBase58()
    );
  });

  it("FrameScratch.letLamports accepts foreign PublicKey", () => {
    const frame = PublicKey.unique();
    const scratch = new FrameScratch(frame, 512);
    const user = foreignPublicKey();
    const binding = scratch.letLamports(user);
    expect(binding.ref.index).to.equal(0);
    expect(binding.letRemaining).to.have.length(1);
  });

  it("prefers AccountMeta when pubkey/isSigner/isWritable are present", () => {
    const pk = PublicKey.unique();
    const meta = toLetAccountMeta({
      pubkey: pk,
      isSigner: true,
      isWritable: true,
    });
    expect(meta.isSigner).to.be.true;
    expect(meta.isWritable).to.be.true;
    expect(meta.pubkey.equals(pk)).to.be.true;
  });
});
