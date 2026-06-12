/**
 * On-chain typed SPL mint LetBindings (LB-3).
 */
import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import { createMint } from "@solana/spl-token";
import { randomBytes } from "crypto";

import { expr } from "../sdk/src";
import { provisionLocalFrame, sendAndConfirm } from "./helpers";

describe("ifx mint typed lets (on-chain)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  it("reads classic SPL mint meta fields", async () => {
    const mint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      6
    );

    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const b = scratch.letBuilder();
    const initialized = b.splMintIsInitialized(mint);
    const mintAuthority = b.splMintMintAuthority(mint);
    const freezeAuthority = b.splMintFreezeAuthority(mint);

    await sendAndConfirm(
      provider,
      "ifx · SPL mint meta lets",
      scratch.ixReset(),
      b.buildIx()
    );

    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.readBool(initialized)).to.equal(true);
    expect(on.readPubkey(mintAuthority).equals(payer.publicKey)).to.equal(true);
    expect(on.readPubkey(freezeAuthority).equals(payer.publicKey)).to.equal(
      true
    );
  });

  it("asserts mint authority matches expected pubkey", async () => {
    const mint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      0
    );

    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const b = scratch.letBuilder();
    const mintAuthority = b.splMintMintAuthority(mint);
    await sendAndConfirm(
      provider,
      "ifx · mint authority guard",
      scratch.ixReset(),
      b.buildIx(),
      scratch.ixAssert(
        expr.eq(expr.ref(mintAuthority), expr.pubkey(payer.publicKey))
      )
    );
  });
});
