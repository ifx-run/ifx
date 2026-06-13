import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";

import {
  DEFAULT_IFX_PROGRAM_ID,
  IFX_DEVNET_PROGRAM_ID,
  IFX_LOCALNET_PROGRAM_ID,
  IFX_MAINNET_PROGRAM_ID,
  FrameScratch,
} from "../sdk/src";

describe("FrameScratch programId", () => {
  const frame = PublicKey.unique();
  const tapeLen = 512;

  it("defaults to DEFAULT_IFX_PROGRAM_ID (= mainnet)", () => {
    const scratch = new FrameScratch(frame, tapeLen);
    expect(scratch.programId.equals(DEFAULT_IFX_PROGRAM_ID)).to.be.true;
    expect(scratch.programId.equals(IFX_MAINNET_PROGRAM_ID)).to.be.true;
    expect(scratch.ixReset().programId.equals(DEFAULT_IFX_PROGRAM_ID)).to.be
      .true;
  });

  it("planNewFrame binds programId on scratch and returns frame + bump", () => {
    const payer = PublicKey.unique();
    const frameId = Buffer.alloc(32, 7);
    const { scratch, frame: plannedFrame, frameBump } = FrameScratch.planNewFrame(
      {
        payer,
        frameId,
        authority: payer,
        tapeLen,
        programId: IFX_DEVNET_PROGRAM_ID,
      }
    );
    expect(scratch.programId.equals(IFX_DEVNET_PROGRAM_ID)).to.be.true;
    expect(scratch.frame.equals(plannedFrame)).to.be.true;
    expect(frameBump).to.be.a("number");
    expect(scratch.ixReset().programId.equals(IFX_DEVNET_PROGRAM_ID)).to.be
      .true;
  });

  it("localnet must pass IFX_LOCALNET_PROGRAM_ID explicitly", () => {
    const payer = PublicKey.unique();
    const frameId = Buffer.alloc(32, 9);
    const { scratch } = FrameScratch.planNewFrame({
      payer,
      frameId,
      authority: payer,
      tapeLen,
      programId: IFX_LOCALNET_PROGRAM_ID,
    });
    expect(scratch.programId.equals(IFX_LOCALNET_PROGRAM_ID)).to.be.true;
  });

  it("IxOpts.programId overrides scratch default", () => {
    const scratch = new FrameScratch(frame, tapeLen);
    expect(
      scratch
        .ixReset({ programId: IFX_LOCALNET_PROGRAM_ID })
        .programId.equals(IFX_LOCALNET_PROGRAM_ID)
    ).to.be.true;
  });
});
