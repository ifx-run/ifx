import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import {
  createInitializeMint2Instruction,
  getMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { expr, structuredCpi, structuredCpiPatch } from "../sdk/src";
import {
  LABEL_SETUP_CREATE_FRAME,
  planLocalFrame,
  sendAndConfirm,
  sendAndConfirmTransaction,
} from "./helpers";

/**
 * Structured CPI chain e2e (representative happy path).
 *
 * Wire coverage for all 29 patch tags: `tests/sdk_structured_cpi_codec.ts` and
 * `programs/ifx/src/instructions/structured_cpi.rs` unit tests.
 * Program-id guard: `tests/ifx_negative.ts` (InvalidStructuredCpiProgram).
 */
describe("ifx structured CPI initialize mint", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  it("InitializeMint2 with Frame-bound decimals and mint authority", async () => {
    const { scratch, ixCreate } = planLocalFrame({
      payer: payer.publicKey,
      frameId: Buffer.alloc(32, 12),
      authority: payer.publicKey,
      tapeLen: 512,
    });
    await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

    const mintKp = Keypair.generate();
    const mint = mintKp.publicKey;
    const mintRent =
      await provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);

    const resetIx = scratch.ixReset();
    const decimalsValue = scratch.letEval(expr.u8(6));
    const mintAuthorityValue = scratch.letAccountKey(payer.publicKey);

    const initTemplate = createInitializeMint2Instruction(
      mint,
      0,
      payer.publicKey,
      null
    );

    const built = structuredCpi(
      initTemplate,
      structuredCpiPatch.initializeMint2({
        decimals: decimalsValue,
        mintAuthority: mintAuthorityValue,
        freeze: { tag: "none" },
      })
    ).build();

    await sendAndConfirmTransaction(
      provider,
      new Transaction()
        .add(resetIx)
        .add(scratch.ixLet(decimalsValue))
        .add(scratch.ixLet(mintAuthorityValue))
        .add(
          SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mint,
            lamports: mintRent,
            space: MINT_SIZE,
            programId: TOKEN_PROGRAM_ID,
          })
        )
        .add(scratch.ixCpi(built)),
      "structured CPI · InitializeMint2 (Frame pubkey + u8)",
      [mintKp]
    );

    const info = await getMint(provider.connection, mint);
    expect(info.decimals).to.equal(6);
    expect(info.mintAuthority?.equals(payer.publicKey)).to.equal(true);
  });
});
