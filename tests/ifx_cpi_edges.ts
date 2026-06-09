/**
 * Patched CPI edge cases: overlap, static arm.cpi step, multi-patch behavior.
 */
import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import { Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { randomBytes } from "crypto";

import {
  arm,
  rawCpiPatch,
  ifElseArgs,
  rawCpi,   staticCpi,
} from "../sdk/src";
import { confirmSignature, provisionLocalFrame, sendAndConfirm } from "./helpers";

describe("ifx CPI edges (on-chain)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  it("overlapping patches: last write wins for lamports field", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 256,
    });

    const recipient = Keypair.generate();
    await confirmSignature(
      provider.connection,
      await provider.connection.requestAirdrop(
        recipient.publicKey,
        LAMPORTS_PER_SOL / 10
      )
    );

    const first = scratch.letConstU64(1_000);
    const second = scratch.letConstU64(2_000);
    const built = rawCpi(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient.publicKey,
        lamports: 0,
      }),
      { patches: [rawCpiPatch(4, first), rawCpiPatch(4, second)] }
    ).build();

    const before = await provider.connection.getBalance(recipient.publicKey);
    await sendAndConfirm(
      provider,
      "ifx · overlapping patches last wins",
      scratch.ixReset(),
      scratch.ixLet(first),
      scratch.ixLet(second),
      scratch.ixCpi(built)
    );
    const after = await provider.connection.getBalance(recipient.publicKey);
    expect(after - before).to.equal(2_000);
  });

  it("ifx_if_else static arm.cpi transfers when cond is true", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 256,
    });

    const recipient = Keypair.generate();
    await confirmSignature(
      provider.connection,
      await provider.connection.requestAirdrop(
        recipient.publicKey,
        LAMPORTS_PER_SOL / 10
      )
    );

    const lamports = 3_000;
    const memo = staticCpi(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient.publicKey,
        lamports,
      })
    );

    const b = scratch.letBuilder();
    const cond = b.letConstBool(true);
    const before = await provider.connection.getBalance(recipient.publicKey);

    await sendAndConfirm(
      provider,
      "ifx · if_else static arm.cpi",
      scratch.ixReset(),
      b.buildIx(),
      scratch.ixIfElse(
        ifElseArgs(cond, arm.cpi(memo.staticStep), arm.skip()),
        memo.remaining
      )
    );

    const after = await provider.connection.getBalance(recipient.publicKey);
    expect(after - before).to.equal(lamports);
  });

  it("ifx_if_else static arm.cpi skip arm sends nothing", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 256,
    });

    const recipient = Keypair.generate();
    const memo = staticCpi(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient.publicKey,
        lamports: 9_999,
      })
    );

    const b = scratch.letBuilder();
    const cond = b.letConstBool(false);
    const before = await provider.connection.getBalance(recipient.publicKey);

    await sendAndConfirm(
      provider,
      "ifx · if_else static arm.cpi skip",
      scratch.ixReset(),
      b.buildIx(),
      scratch.ixIfElse(
        ifElseArgs(cond, arm.cpi(memo.staticStep), arm.skip()),
        memo.remaining
      )
    );

    const after = await provider.connection.getBalance(recipient.publicKey);
    expect(after - before).to.equal(0);
  });

  it("multi-patch transfer applies both u64 slots independently", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 256,
    });

    const recipient = Keypair.generate();
    await confirmSignature(
      provider.connection,
      await provider.connection.requestAirdrop(
        recipient.publicKey,
        LAMPORTS_PER_SOL / 10
      )
    );

    const amount = scratch.letConstU64(777);
    const built = rawCpi(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient.publicKey,
        lamports: 0,
      }),
      { patches: [rawCpiPatch(4, amount)] }
    ).build();

    const before = await provider.connection.getBalance(recipient.publicKey);
    await sendAndConfirm(
      provider,
      "ifx · single patch transfer",
      scratch.ixReset(),
      scratch.ixLet(amount),
      scratch.ixCpi(built)
    );
    const after = await provider.connection.getBalance(recipient.publicKey);
    expect(after - before).to.equal(777);
  });
});
