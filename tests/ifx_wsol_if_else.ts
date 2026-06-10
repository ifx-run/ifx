/**
 * Conditional WSOL wrap — integration test for sdk/examples/wsol-conditional-wrap.ts.
 */
import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import {
  getAssociatedTokenAddressSync,
  getAccount,
  NATIVE_MINT,
} from "@solana/spl-token";
import { randomBytes } from "crypto";

import { expr } from "../sdk/src";
import { planWsolConditionalWrapTx } from "../sdk/examples/wsol-conditional-wrap";
import { provisionLocalFrame, sendAndConfirmSignersOnly } from "./helpers";

describe("ifx if_else · WSOL conditional wrap (example)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  it("wraps SOL when cond is true (one if_else, two steps)", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 256,
    });

    const wsolAta = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      payer.publicKey
    );

    const wrapLamports = 50_000_000;
    const amount = scratch.letConstU64(wrapLamports);

    let beforeAmount = 0n;
    try {
      beforeAmount = (await getAccount(provider.connection, wsolAta)).amount;
    } catch {
      // ATA may not exist until createAssociatedTokenAccountIdempotent runs.
    }

    const tx = planWsolConditionalWrapTx(scratch, {
      owner: payer.publicKey,
      cond: expr.bool(true),
      wrapLamports: amount,
    });
    tx.feePayer = payer.publicKey;
    await sendAndConfirmSignersOnly(
      provider,
      tx,
      [payer],
      "ifx · if_else wrap (transfer + syncNative)"
    );

    const acct = await getAccount(provider.connection, wsolAta);
    expect(Number(acct.amount - beforeAmount)).to.equal(wrapLamports);
  });

  it("skip arm leaves WSOL balance zero", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 256,
    });

    const wsolAta = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      payer.publicKey
    );

    const wrapLamports = 50_000_000;
    const amount = scratch.letConstU64(wrapLamports);
    const before = await getAccount(provider.connection, wsolAta);

    const tx = planWsolConditionalWrapTx(scratch, {
      owner: payer.publicKey,
      cond: expr.bool(false),
      wrapLamports: amount,
    });
    tx.feePayer = payer.publicKey;
    await sendAndConfirmSignersOnly(
      provider,
      tx,
      [payer],
      "ifx · if_else wrap skip"
    );

    const acct = await getAccount(provider.connection, wsolAta);
    expect(Number(acct.amount - before.amount)).to.equal(0);
  });
});
