import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import { randomBytes } from "crypto";

import { expr } from "../sdk/src";
import {
  LABEL_SETUP_CREATE_FRAME,
  planLocalFrame,
  sendAndConfirm,
} from "./helpers";

describe("ifx pubkey", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  it("AccountKey + ConstPubkey on tape; assert eq", async () => {
    const { scratch, ixCreate } = planLocalFrame({
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });
    await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

    const wallet = payer.publicKey;
    const keyValue = scratch.letAccountKey(wallet);
    const litValue = scratch.letConstPubkey(wallet);

    const resetIx = scratch.ixReset();
    await sendAndConfirm(
      provider,
      "pubkey · let + assert",
      resetIx,
      scratch.ixLet(keyValue),
      scratch.ixLet(litValue),
      scratch.ixAssert(expr.eq(keyValue, litValue))
    );

    const decoded = await scratch.fetchDecodedFrame(provider.connection);
    expect(decoded.readPubkey(keyValue).equals(wallet)).to.equal(true);
    expect(decoded.readPubkey(litValue).equals(wallet)).to.equal(true);
  });
});
