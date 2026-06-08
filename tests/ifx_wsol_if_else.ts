/**
 * Conditional WSOL wrap: patched System transfer + static syncNative in one if_else arm.
 */
import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  getAccount,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { randomBytes } from "crypto";

import {
  arm,
  cpiPatch,
  expr,
  ifElseArgs,
  cpi,
  staticCpi,
} from "../sdk/src";
import { confirmSignature, provisionLocalFrame, sendAndConfirm } from "./helpers";

describe("ifx if_else · patched transfer + syncNative", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  it("wraps SOL when cond is true (one if_else, two steps)", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      closeAuthority: payer.publicKey,
      tapeLen: 256,
    });

    const wsolAta = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      payer.publicKey
    );

    const wrapLamports = 50_000_000;
    const amount = scratch.letConstU64(wrapLamports);

    const transfer = cpi(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: wsolAta,
        lamports: 0,
      }),
      { patches: [cpiPatch(4, amount)] }
    ).build();

    const sync = staticCpi(createSyncNativeInstruction(wsolAta));

    const combinedRemaining = [
      ...transfer.remaining,
      ...sync.remaining.slice(sync.remaining.findIndex((m) =>
        m.pubkey.equals(TOKEN_PROGRAM_ID)
      )),
    ];

    const syncStart = combinedRemaining.findIndex((m) =>
      m.pubkey.equals(TOKEN_PROGRAM_ID)
    );
    transfer.cpi.accountsStart = 0;
    transfer.cpi.accountsLen = syncStart;
    sync.staticStep.accountsStart = syncStart;
    sync.staticStep.accountsLen = combinedRemaining.length - syncStart;

    let beforeAmount = 0n;
    try {
      beforeAmount = (await getAccount(provider.connection, wsolAta)).amount;
    } catch {
      // ATA may not exist until createAssociatedTokenAccountIdempotent runs.
    }

    await sendAndConfirm(
      provider,
      "ifx · if_else wrap (transfer + syncNative)",
      scratch.ixReset(),
      scratch.ixLet(amount),
      createAssociatedTokenAccountIdempotentInstruction(
        payer.publicKey,
        wsolAta,
        payer.publicKey,
        NATIVE_MINT
      ),
      scratch.ixIfElse(
        ifElseArgs(
          expr.bool(true),
          arm.cpis([transfer.cpi, sync.staticStep]),
          arm.skip()
        ),
        combinedRemaining
      )
    );

    const acct = await getAccount(provider.connection, wsolAta);
    expect(Number(acct.amount - beforeAmount)).to.equal(wrapLamports);
  });

  it("skip arm leaves WSOL balance zero", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      closeAuthority: payer.publicKey,
      tapeLen: 256,
    });

    const wsolAta = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      payer.publicKey
    );

    const wrapLamports = 50_000_000;
    const amount = scratch.letConstU64(wrapLamports);
    const transfer = cpi(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: wsolAta,
        lamports: 0,
      }),
      { patches: [cpiPatch(4, amount)] }
    ).build();
    const sync = staticCpi(createSyncNativeInstruction(wsolAta));
    const combinedRemaining = [
      ...transfer.remaining,
      ...sync.remaining.slice(
        sync.remaining.findIndex((m) => m.pubkey.equals(TOKEN_PROGRAM_ID))
      ),
    ];
    const syncStart = combinedRemaining.findIndex((m) =>
      m.pubkey.equals(TOKEN_PROGRAM_ID)
    );
    transfer.cpi.accountsStart = 0;
    transfer.cpi.accountsLen = syncStart;
    sync.staticStep.accountsStart = syncStart;
    sync.staticStep.accountsLen = combinedRemaining.length - syncStart;

    const before = await getAccount(provider.connection, wsolAta);

    await sendAndConfirm(
      provider,
      "ifx · if_else wrap skip",
      scratch.ixReset(),
      scratch.ixLet(amount),
      createAssociatedTokenAccountIdempotentInstruction(
        payer.publicKey,
        wsolAta,
        payer.publicKey,
        NATIVE_MINT
      ),
      scratch.ixIfElse(
        ifElseArgs(
          expr.bool(false),
          arm.cpis([transfer.cpi, sync.staticStep]),
          arm.skip()
        ),
        combinedRemaining
      )
    );

    const acct = await getAccount(provider.connection, wsolAta);
    expect(Number(acct.amount - before.amount)).to.equal(0);
  });
});
