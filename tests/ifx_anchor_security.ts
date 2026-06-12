/**
 * Anchor / PDA security negative tests — see audits/SECURITY-CHECKLIST.md (IFX-SEC-I01)
 */
import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { randomBytes } from "crypto";

import { FrameScratch, IFX_ERROR, IFX_LOCALNET_PROGRAM_ID } from "../sdk/src";
import { planLocalFrame, sendAndConfirm, sendAndConfirmTransaction, LABEL_SETUP_CREATE_FRAME } from "./helpers";

describe("ifx anchor security (negative)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  it("ifx_close_frame rejects wrong authority signer", async () => {
    const frameId = randomBytes(32);
    const { scratch, ixCreate } = planLocalFrame({
      payer: payer.publicKey,
      frameId,
      authority: payer.publicKey,
      tapeLen: 512,
    });
    await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

    const impostor = Keypair.generate();
    const tx = new Transaction().add(scratch.ixCloseFrame(impostor.publicKey));
    tx.feePayer = payer.publicKey;

    try {
      await sendAndConfirmTransaction(
        provider,
        tx,
        "ifx · close_frame wrong authority (expect fail)",
        [impostor]
      );
      expect.fail("expected UnauthorizedClose");
    } catch (e: unknown) {
      const msg = String(e);
      expect(msg).to.match(
        new RegExp(`UnauthorizedClose|${IFX_ERROR.UnauthorizedClose}|6002|close authority`, "i")
      );
    }
  });

  it("ifx_create_frame rejects default authority", async () => {
    const frameId = randomBytes(32);

    const tx = new Transaction().add(
      FrameScratch.ixCreateFrame({
        payer: payer.publicKey,
        frameId,
        authority: PublicKey.default,
        tapeLen: 512,
        programId: IFX_LOCALNET_PROGRAM_ID,
      })
    );
    tx.feePayer = payer.publicKey;

    try {
      await sendAndConfirmTransaction(
        provider,
        tx,
        "ifx · create default authority (expect fail)"
      );
      expect.fail("expected InvalidAuthority");
    } catch (e: unknown) {
      const msg = String(e);
      expect(msg).to.match(
        new RegExp(
          `InvalidAuthority|${IFX_ERROR.InvalidAuthority}|6003|authority`,
          "i"
        )
      );
    }
  });
});
