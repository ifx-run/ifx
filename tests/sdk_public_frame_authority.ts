import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";

import {
  DEFAULT_IFX_PROGRAM_ID,
  IFX_DEVNET_PROGRAM_ID,
  FrameScratch,
  framePda,
  isPublicFrameAuthority,
  publicFrameAuthority,
} from "../sdk/src";

describe("public frame authority", () => {
  it("publicFrameAuthority returns the Frame PDA", () => {
    const payer = PublicKey.unique();
    const frameId = Buffer.alloc(32, 3);
    const [frame] = framePda(payer, frameId, IFX_DEVNET_PROGRAM_ID);
    expect(
      publicFrameAuthority(payer, frameId, IFX_DEVNET_PROGRAM_ID).equals(frame)
    ).to.be.true;
  });

  it("isPublicFrameAuthority matches self-referential authority only", () => {
    const frame = PublicKey.unique();
    expect(isPublicFrameAuthority(frame, frame)).to.be.true;
    expect(isPublicFrameAuthority(PublicKey.unique(), frame)).to.be.false;
    expect(isPublicFrameAuthority(DEFAULT_IFX_PROGRAM_ID, frame)).to.be.false;
  });

  it("program id is not treated as public frame authority", () => {
    const payer = PublicKey.unique();
    const frameId = Buffer.alloc(32, 5);
    const [frame] = framePda(payer, frameId);
    expect(isPublicFrameAuthority(DEFAULT_IFX_PROGRAM_ID, frame)).to.be.false;
  });

  it("planPublicFrame sets authority to frame PDA", () => {
    const payer = PublicKey.unique();
    const frameId = Buffer.alloc(32, 11);
    const { ixCreate, frame } = FrameScratch.planPublicFrame({
      payer,
      frameId,
      tapeLen: 512,
    });
    const authority = new PublicKey(
      ixCreate.data.subarray(1 + 32, 1 + 32 + 32)
    );
    expect(authority.equals(frame)).to.be.true;
    expect(isPublicFrameAuthority(authority, frame)).to.be.true;
  });
});
