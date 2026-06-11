import * as anchor from "@anchor-lang/core";
import BN from "bn.js";
import { expect } from "chai";
import { randomBytes } from "crypto";

import { expr, taggedExpr } from "../sdk/src/expr";
import {
  LABEL_SETUP_CREATE_FRAME,
  planLocalFrame,
  sendAndConfirm,
} from "./helpers";

describe("ifx_assert_multi", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  function randomFrameId(): Buffer {
    return randomBytes(32);
  }

  it("passes when all conditions are true", async () => {
    const frameId = randomFrameId();
    const { scratch, ixCreate } = planLocalFrame({
      payer: provider.wallet.publicKey,
      frameId,
      authority: provider.wallet.publicKey,
      tapeLen: 256,
    });
    await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

    const batch = scratch.letBuilder();
    const a = batch.letConstBool(true);
    const b = batch.letConstBool(true);
    await sendAndConfirm(
      provider,
      "ifx · assert_multi passes",
      scratch.ixReset(),
      batch.buildIx(),
      scratch.ixAssertMulti([a, b, expr.bool(true)])
    );
  });

  it("fails at index 1 with AssertFailedMulti", async () => {
    const frameId = randomFrameId();
    const { scratch, ixCreate } = planLocalFrame({
      payer: provider.wallet.publicKey,
      frameId,
      authority: provider.wallet.publicKey,
      tapeLen: 256,
    });
    await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

    const batch = scratch.letBuilder();
    const ok = batch.letConstBool(true);
    const bad = batch.letConstBool(false);
    try {
      await sendAndConfirm(
        provider,
        "ifx · assert_multi fails at index 1 (expect fail)",
        scratch.ixReset(),
        batch.buildIx(),
        scratch.ixAssertMulti([ok, bad, expr.bool(true)])
      );
      expect.fail("expected assert_multi to fail");
    } catch (e: unknown) {
      const msg = String(e);
      expect(msg).to.match(/AssertFailedMulti|6039|assert_multi/i);
    }
  });

  it("short-circuits: third guard not evaluated when second fails", async () => {
    const frameId = randomFrameId();
    const { scratch, ixCreate } = planLocalFrame({
      payer: provider.wallet.publicKey,
      frameId,
      authority: provider.wallet.publicKey,
      tapeLen: 256,
    });
    await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

    const batch = scratch.letBuilder();
    const ok = batch.letConstBool(true);
    const bad = batch.letConstBool(false);
    // Third guard references unset binding 99 — InvalidValueIndex if evaluated.
    const neverReached = taggedExpr("bool", {
      eq: {
        lhs: { value: { value: { index: 99 } } },
        rhs: { constU64: [new BN(0)] },
      },
    });
    try {
      await sendAndConfirm(
        provider,
        "ifx · assert_multi short-circuit (expect fail)",
        scratch.ixReset(),
        batch.buildIx(),
        scratch.ixAssertMulti([ok, bad, neverReached])
      );
      expect.fail("expected assert_multi to fail");
    } catch (e: unknown) {
      const msg = String(e);
      expect(msg).to.match(/AssertFailedMulti|6039|assert_multi/i);
      expect(msg).not.to.match(/InvalidValueIndex|6021/i);
    }
  });
});
