import { expect } from "chai";
import { Keypair } from "@solana/web3.js";
import { randomBytes } from "crypto";

import { expr, FrameScratch, IFX_LOCALNET_PROGRAM_ID } from "../sdk/src";
import { planLocalFrame, provisionLocalFrame, sendAndConfirm } from "./helpers";
import * as anchor from "@anchor-lang/core";

describe("FrameScratch off-chain limits", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  const framePayer = Keypair.generate().publicKey;

  it("throws when binding index cap would be exceeded", () => {
    const { scratch } = planLocalFrame({
      payer: framePayer,
      frameId: randomBytes(32),
      closeAuthority: framePayer,
      tapeLen: 20,
    });

    for (let i = 0; i < 10; i++) {
      scratch.letEval(expr.u8(1));
    }
    expect(() => scratch.letEval(expr.u8(1))).to.throw(/index cap/i);
  });

  it("throws when planned tape bytes would be exceeded", () => {
    const { scratch } = planLocalFrame({
      payer: framePayer,
      frameId: randomBytes(32),
      closeAuthority: framePayer,
      tapeLen: 20,
    });

    scratch.letConstU64(1);
    scratch.letConstU64(2);
    expect(() => scratch.letConstU64(3)).to.throw(/exceed tape/i);
  });

  it("planNewFrame binds programId and tapeLen on scratch", () => {
    const frameId = randomBytes(32);
    const { scratch, frame, frameBump } = FrameScratch.planNewFrame({
      payer: framePayer,
      frameId,
      closeAuthority: framePayer,
      tapeLen: 128,
      programId: IFX_LOCALNET_PROGRAM_ID,
    });
    expect(scratch.programId.equals(IFX_LOCALNET_PROGRAM_ID)).to.be.true;
    expect(scratch.frame.equals(frame)).to.be.true;
    expect(frameBump).to.be.a("number");
    expect(frameBump >= 0 && frameBump <= 255).to.equal(true);
    expect(scratch.letConstU64(1).ref.index).to.equal(0);
  });

  it("refreshFromChain syncs cursor and indexCount from on-chain frame", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      closeAuthority: payer.publicKey,
      tapeLen: 128,
    });

    const val = scratch.letConstU64(99);
    await sendAndConfirm(
      provider,
      "sdk · refreshFromChain setup let",
      scratch.ixReset(),
      scratch.ixLet(val)
    );

    scratch.cursor = 0;
    scratch.syncIndexCount(0);

    const decoded = await scratch.refreshFromChain(provider.connection);
    expect(decoded.readU64(val)).to.equal(99n);
    expect(scratch.cursor).to.equal(decoded.cursor);
    expect(scratch.peekIndex()).to.equal(decoded.indexCount);
  });
});
