/**
 * L0 example integration — mirrors sdk/examples/minimal-frame.ts.
 */
import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import { Transaction } from "@solana/web3.js";
import { randomBytes } from "crypto";

import { planMinimalFrameBusinessTx } from "../sdk/examples/minimal-frame";
import {
  sendAndConfirmSignersOnly,
  LABEL_SETUP_CREATE_FRAME,
  planLocalFrame,
} from "./helpers";

describe("minimal frame (L0 example)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  it("planMinimalFrameBusinessTx: reset → let u64(1) → assert non-zero", async () => {
    const frameId = randomBytes(32);
    const tapeLen = 256;
    const { scratch, ixCreate } = planLocalFrame({
      payer: payer.publicKey,
      frameId,
      authority: payer.publicKey,
      tapeLen,
    });

    const createTx = new Transaction().add(ixCreate);
    createTx.feePayer = payer.publicKey;
    await sendAndConfirmSignersOnly(provider, createTx, [payer], LABEL_SETUP_CREATE_FRAME);

    const { tx, one } = planMinimalFrameBusinessTx(scratch);
    tx.feePayer = payer.publicKey;
    await sendAndConfirmSignersOnly(
      provider,
      tx,
      [payer],
      "minimal-frame · reset → let u64(1) → assert non-zero"
    );

    const snap = await scratch.fetchDecodedFrame(provider.connection);
    expect(snap.readU64(one)).to.equal(1n);
    expect(snap.cursor).to.be.greaterThan(0);
    expect(snap.indexCount).to.equal(1);
  });
});
