import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import { randomBytes } from "crypto";

import { expr, FrameScratch, IFX_LOCALNET_PROGRAM_ID } from "../sdk/src";
import {
  LABEL_SETUP_CREATE_FRAME,
  planLocalFrame,
  sendAndConfirm,
  waitForNextSlot,
} from "./helpers";

describe("ifx frame generation", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  function randomFrameId(): Buffer {
    return randomBytes(32);
  }

  it("generation is 0 at create and wrapping_add(1) on each reset", async () => {
    const frameId = randomFrameId();
    const { scratch, ixCreate } = planLocalFrame({
      payer: provider.wallet.publicKey,
      frameId,
      authority: provider.wallet.publicKey,
      tapeLen: 512,
    });
    await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

    let snap = await scratch.fetchDecodedFrame(provider.connection);
    expect(snap.generation).to.equal(0n);

    await sendAndConfirm(
      provider,
      "ifx · reset #1 (generation 0 → 1)",
      scratch.ixReset()
    );
    snap = await scratch.fetchDecodedFrame(provider.connection);
    expect(snap.generation).to.equal(1n);
    expect(snap.indexCount).to.equal(0);
    expect(snap.cursor).to.equal(0);

    // Bare reset-only txs are byte-identical under the same blockhash → duplicate signature.
    await waitForNextSlot(provider.connection);

    await sendAndConfirm(
      provider,
      "ifx · reset #2 (generation 1 → 2)",
      scratch.ixReset()
    );
    snap = await scratch.fetchDecodedFrame(provider.connection);
    expect(snap.generation).to.equal(2n);
  });

  it("letFrameGeneration and letFrameIndexCount bind on-chain metadata", async () => {
    const frameId = randomFrameId();
    const { scratch, ixCreate } = planLocalFrame({
      payer: provider.wallet.publicKey,
      frameId,
      authority: provider.wallet.publicKey,
      tapeLen: 512,
    });
    await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

    const resetIx = scratch.ixReset();
    const gen = scratch.letFrameGeneration();
    await sendAndConfirm(
      provider,
      "ifx · reset → let frame.generation",
      resetIx,
      scratch.ixLet(gen)
    );

    let snap = await scratch.fetchDecodedFrame(provider.connection);
    expect(snap.generation).to.equal(1n);
    expect(snap.readU64(gen)).to.equal(1n);

    const resetIx2 = scratch.ixReset();
    const indexCountBinding = scratch.letFrameIndexCount();
    await sendAndConfirm(
      provider,
      "ifx · reset → let frame.index_count (0 before append)",
      resetIx2,
      scratch.ixLet(indexCountBinding)
    );
    snap = await scratch.fetchDecodedFrame(provider.connection);
    expect(snap.readU16(indexCountBinding)).to.equal(0);
    expect(snap.indexCount).to.equal(1);
  });

  it("continuation tx without reset: assert generation via let + assert", async () => {
    const frameId = randomFrameId();
    const { scratch, ixCreate, frame } = planLocalFrame({
      payer: provider.wallet.publicKey,
      frameId,
      authority: provider.wallet.publicKey,
      tapeLen: 512,
    });
    await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

    const resetIx = scratch.ixReset();
    const payload = scratch.letConstU64(42);
    await sendAndConfirm(
      provider,
      "ifx · reset → let const (session 1)",
      resetIx,
      scratch.ixLet(payload)
    );

    const snap = await scratch.fetchDecodedFrame(provider.connection);
    expect(snap.generation).to.equal(1n);
    expect(snap.indexCount).to.equal(1);

    const cont = FrameScratch.fromFrame(
      snap,
      frame,
      IFX_LOCALNET_PROGRAM_ID
    );
    const gen = cont.letFrameGeneration();
    await sendAndConfirm(
      provider,
      "ifx · continue session: let generation → assert eq snapshot",
      cont.ixLet(gen),
      cont.ixAssert(expr.eq(gen, expr.u64(snap.generation)))
    );

    const after = await cont.fetchDecodedFrame(provider.connection);
    expect(after.generation).to.equal(1n);
    expect(after.readU64(gen)).to.equal(1n);
    expect(after.indexCount).to.equal(2);
  });
});
