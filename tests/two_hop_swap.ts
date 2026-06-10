/**
 * Two-hop token swap — localnet integration with mock SPL transfers as stand-in DEX swaps.
 *
 * Flow: pool credits USDC (hop1) → ifx_let reads user USDC → patched debit (hop2) → pool sends B.
 * Proves A→USDC→B same-tx orchestration. See sdk/examples/two-hop-token-swap.ts.
 */
import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import {
  createAssociatedTokenAccountInstruction,
  createMint,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { randomBytes } from "crypto";

import { FrameScratch } from "../sdk/src";
import { planTwoHopTokenSwapTx } from "../sdk/examples/two-hop-token-swap";
import { confirmSignature, sendAndConfirmSignersOnly, LABEL_SETUP_CREATE_FRAME, planLocalFrame } from "./helpers";

const MOCK_HOP1_USDC_OUT = 2_000_000; // 2 USDC @ 6 decimals
const MOCK_HOP2_B_OUT = 5_000_000;

describe("two-hop token swap (ifx orchestration)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  it("chains hop1 → let USDC → patched hop2 via same-tx orchestration", async () => {
    const user = Keypair.generate();
    const pool = Keypair.generate();
    const frameId = randomBytes(32);
    const { scratch, ixCreate } = planLocalFrame({
      payer: payer.publicKey,
      frameId,
      authority: payer.publicKey,
      tapeLen: 256,
    });

    const createFrameTx = new Transaction().add(ixCreate);
    createFrameTx.feePayer = payer.publicKey;
    await sendAndConfirmSignersOnly(
      provider,
      createFrameTx,
      [payer],
      LABEL_SETUP_CREATE_FRAME
    );

    for (const kp of [user, pool]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        LAMPORTS_PER_SOL
      );
      await confirmSignature(provider.connection, sig);
    }

    const mintUsdc = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      6
    );
    const mintB = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      6
    );

    const userUsdcAta = getAssociatedTokenAddressSync(
      mintUsdc,
      user.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const userBAta = getAssociatedTokenAddressSync(
      mintB,
      user.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const poolUsdcAta = getAssociatedTokenAddressSync(
      mintUsdc,
      pool.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const poolBAta = getAssociatedTokenAddressSync(
      mintB,
      pool.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const setupTx = new Transaction();
    for (const [mint, owner] of [
      [mintUsdc, user.publicKey],
      [mintB, user.publicKey],
      [mintUsdc, pool.publicKey],
      [mintB, pool.publicKey],
    ] as const) {
      setupTx.add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          getAssociatedTokenAddressSync(
            mint,
            owner,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          ),
          owner,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }
    setupTx.feePayer = payer.publicKey;
    await sendAndConfirmSignersOnly(
      provider,
      setupTx,
      [payer],
      "setup · two-hop mint ATAs"
    );

    await mintTo(
      provider.connection,
      payer,
      mintUsdc,
      poolUsdcAta,
      payer,
      10_000_000
    );
    await mintTo(
      provider.connection,
      payer,
      mintB,
      poolBAta,
      payer,
      10_000_000
    );

    const hop1 = createTransferInstruction(
      poolUsdcAta,
      userUsdcAta,
      pool.publicKey,
      MOCK_HOP1_USDC_OUT,
      [],
      TOKEN_PROGRAM_ID
    );
    const hop2Template = createTransferInstruction(
      userUsdcAta,
      poolUsdcAta,
      user.publicKey,
      0,
      [],
      TOKEN_PROGRAM_ID
    );
    const hop2Deliver = createTransferInstruction(
      poolBAta,
      userBAta,
      pool.publicKey,
      MOCK_HOP2_B_OUT,
      [],
      TOKEN_PROGRAM_ID
    );

    const businessTx = planTwoHopTokenSwapTx(
      scratch,
      { userUsdcAta },
      {
        hop1,
        hop2Template,
        hop2Deliver,
      }
    );
    businessTx.feePayer = payer.publicKey;
    await sendAndConfirmSignersOnly(
      provider,
      businessTx,
      [payer, pool, user],
      "two-hop swap · A→USDC→B (hop1 CPI → let USDC → patched hop2)"
    );

    const usdcAfter = (
      await provider.connection.getTokenAccountBalance(userUsdcAta)
    ).value.amount;
    expect(usdcAfter).to.equal("0");

    const bAfter = (
      await provider.connection.getTokenAccountBalance(userBAta)
    ).value.amount;
    expect(bAfter).to.equal(String(MOCK_HOP2_B_OUT));

    const onChain = await scratch.fetchDecodedFrame(provider.connection);
    expect(onChain.cursor).to.be.greaterThan(0);
  });
});
