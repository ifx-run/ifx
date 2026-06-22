/**
 * Personal AMM — wallet pool constant-product swap (no pool/DEX program).
 *
 * Setup: mint TOKEN_A + TOKEN_B, fund pool with both, user starts with TOKEN_A only.
 * Swap: sell A → buy B. See sdk/examples/personal-amm-swap.ts and docs/personal-amm.md.
 */
import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { randomBytes } from "crypto";

import { FrameScratch } from "../sdk/src";
import {
  computeSwapOutput,
  planPersonalAmmSwapInstructions,
  planPersonalAmmSwapTx,
} from "../sdk/examples/personal-amm-swap";
import { personalDexAltAddresses } from "../sdk/examples/personal-dex-onboarding";
import {
  createLookupTableForAddresses,
  logTxSizeComparison,
  measureLegacyTxBytes,
  measureV0TxBytes,
  sendAndConfirmV0,
} from "./alt";
import { confirmSignature, sendAndConfirmSignersOnly, LABEL_SETUP_CREATE_FRAME, planLocalFrame } from "./helpers";

const DECIMALS = 6;
const POOL_TOKEN_A = 100_000_000n;
const POOL_TOKEN_B = 50_000_000n;
const USER_TOKEN_A = 10_000_000n;
const AMOUNT_IN = 1_000_000n;
const FEE_BPS = 30;

describe("personal AMM swap (program-free wallet pool)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  async function createMintLocal(label: string) {
    const mint = Keypair.generate();
    const lamports = await getMinimumBalanceForRentExemptMint(provider.connection);
    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mint.publicKey,
        DECIMALS,
        payer.publicKey,
        null,
        TOKEN_PROGRAM_ID
      )
    );
    tx.feePayer = payer.publicKey;
    await sendAndConfirmSignersOnly(provider, tx, [payer, mint], label);
    return mint.publicKey;
  }

  async function mintToLocal(
    mint: PublicKey,
    destination: PublicKey,
    amount: bigint,
    label: string
  ) {
    const tx = new Transaction().add(
      createMintToInstruction(mint, destination, payer.publicKey, amount)
    );
    tx.feePayer = payer.publicKey;
    await sendAndConfirmSignersOnly(provider, tx, [payer], label);
  }

  async function setupPoolAndUser() {
    const user = Keypair.generate();
    const pool = Keypair.generate();
    const frameId = randomBytes(32);
    const { scratch, ixCreate } = planLocalFrame({
      payer: payer.publicKey,
      frameId,
      authority: payer.publicKey,
      tapeLen: 512,
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

    const mintTokenA = await createMintLocal("setup · personal-amm mint TOKEN_A");
    const mintTokenB = await createMintLocal("setup · personal-amm mint TOKEN_B");

    const userTokenAAta = getAssociatedTokenAddressSync(
      mintTokenA,
      user.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const userTokenBAta = getAssociatedTokenAddressSync(
      mintTokenB,
      user.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const poolTokenAAta = getAssociatedTokenAddressSync(
      mintTokenA,
      pool.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const poolTokenBAta = getAssociatedTokenAddressSync(
      mintTokenB,
      pool.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const setupTx = new Transaction();
    for (const [mint, owner] of [
      [mintTokenA, user.publicKey],
      [mintTokenB, user.publicKey],
      [mintTokenA, pool.publicKey],
      [mintTokenB, pool.publicKey],
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
      "setup · personal-amm mint ATAs and fund pool"
    );

    await mintToLocal(mintTokenA, poolTokenAAta, POOL_TOKEN_A, "setup · fund pool TOKEN_A");
    await mintToLocal(mintTokenB, poolTokenBAta, POOL_TOKEN_B, "setup · fund pool TOKEN_B");
    await mintToLocal(mintTokenA, userTokenAAta, USER_TOKEN_A, "setup · fund user TOKEN_A");

    return {
      user,
      pool,
      scratch,
      mintTokenA,
      mintTokenB,
      userTokenAAta,
      userTokenBAta,
      poolTokenAAta,
      poolTokenBAta,
    };
  }

  function swapAccounts(ctx: Awaited<ReturnType<typeof setupPoolAndUser>>) {
    return {
      user: ctx.user.publicKey,
      pool: ctx.pool.publicKey,
      userTokenAAta: ctx.userTokenAAta,
      poolTokenAAta: ctx.poolTokenAAta,
      userTokenBAta: ctx.userTokenBAta,
      poolTokenBAta: ctx.poolTokenBAta,
    };
  }

  it("swaps TOKEN_A for TOKEN_B with on-chain constant product + slippage assert", async () => {
    const ctx = await setupPoolAndUser();
    const expectedOut = computeSwapOutput(
      POOL_TOKEN_A,
      POOL_TOKEN_B,
      AMOUNT_IN,
      FEE_BPS
    );

    const businessTx = planPersonalAmmSwapTx(ctx.scratch, swapAccounts(ctx), {
      amountIn: AMOUNT_IN,
      minOut: expectedOut,
    });
    businessTx.feePayer = payer.publicKey;
    await sendAndConfirmSignersOnly(
      provider,
      businessTx,
      [payer, ctx.pool, ctx.user],
      "personal-amm · swap TOKEN_A→TOKEN_B (30 bps fee, happy path)"
    );

    expect(
      BigInt(
        (await provider.connection.getTokenAccountBalance(ctx.userTokenAAta))
          .value.amount
      )
    ).to.equal(USER_TOKEN_A - AMOUNT_IN);
    expect(
      BigInt(
        (await provider.connection.getTokenAccountBalance(ctx.userTokenBAta)).value
          .amount
      )
    ).to.equal(expectedOut);
    expect(
      BigInt(
        (await provider.connection.getTokenAccountBalance(ctx.poolTokenAAta))
          .value.amount
      )
    ).to.equal(POOL_TOKEN_A + AMOUNT_IN);
    expect(
      BigInt(
        (await provider.connection.getTokenAccountBalance(ctx.poolTokenBAta)).value
          .amount
      )
    ).to.equal(POOL_TOKEN_B - expectedOut);

    const onChain = await ctx.scratch.fetchDecodedFrame(provider.connection);
    expect(onChain.cursor).to.be.greaterThan(0);
  });

  it("feeBps 0 skips bpsMulFloor and matches gross constant product", async () => {
    const gross = computeSwapOutput(
      POOL_TOKEN_A,
      POOL_TOKEN_B,
      AMOUNT_IN,
      0
    );
    expect(gross).to.equal(495_049n);

    const ctx = await setupPoolAndUser();
    const businessTx = planPersonalAmmSwapTx(ctx.scratch, swapAccounts(ctx), {
      amountIn: AMOUNT_IN,
      minOut: gross,
      feeBps: 0,
    });
    businessTx.feePayer = payer.publicKey;
    await sendAndConfirmSignersOnly(
      provider,
      businessTx,
      [payer, ctx.pool, ctx.user],
      "personal-amm · swap with feeBps=0 (no fee)"
    );
  });

  it("reverts when min_out exceeds computed output", async () => {
    const ctx = await setupPoolAndUser();
    const expectedOut = computeSwapOutput(
      POOL_TOKEN_A,
      POOL_TOKEN_B,
      AMOUNT_IN,
      FEE_BPS
    );

    const businessTx = planPersonalAmmSwapTx(ctx.scratch, swapAccounts(ctx), {
      amountIn: AMOUNT_IN,
      minOut: expectedOut + 1n,
    });
    businessTx.feePayer = payer.publicKey;

    let failed = false;
    try {
      await sendAndConfirmSignersOnly(
        provider,
        businessTx,
        [payer, ctx.pool, ctx.user],
        "personal-amm · slippage revert (min_out too high, expect fail)"
      );
    } catch {
      failed = true;
    }
    expect(failed).to.equal(true);

    expect(
      BigInt(
        (await provider.connection.getTokenAccountBalance(ctx.userTokenAAta))
          .value.amount
      )
    ).to.equal(USER_TOKEN_A);
  });

  it("v0 + pool ALT sends the same swap with smaller serialized tx", async () => {
    const ctx = await setupPoolAndUser();
    const expectedOut = computeSwapOutput(
      POOL_TOKEN_A,
      POOL_TOKEN_B,
      AMOUNT_IN,
      FEE_BPS
    );

    const altAddresses = personalDexAltAddresses({
      frame: ctx.scratch.frame,
      poolTokenAAta: ctx.poolTokenAAta,
      poolTokenBAta: ctx.poolTokenBAta,
      mintTokenA: ctx.mintTokenA,
      mintTokenB: ctx.mintTokenB,
    });
    const lut = await createLookupTableForAddresses(
      provider,
      payer,
      altAddresses
    );

    const { instructions } = planPersonalAmmSwapInstructions(
      ctx.scratch,
      swapAccounts(ctx),
      { amountIn: AMOUNT_IN, minOut: expectedOut }
    );

    const { blockhash } = await provider.connection.getLatestBlockhash(
      "confirmed"
    );
    const legacyBytes = measureLegacyTxBytes(
      instructions,
      payer.publicKey,
      blockhash,
      [ctx.pool, ctx.user]
    );
    const v0Bytes = measureV0TxBytes(
      instructions,
      payer.publicKey,
      blockhash,
      lut,
      [ctx.pool, ctx.user]
    );
    logTxSizeComparison(legacyBytes, v0Bytes, altAddresses.length);
    expect(v0Bytes).to.be.lessThan(legacyBytes);

    await sendAndConfirmV0(
      provider,
      instructions,
      lut,
      [ctx.pool, ctx.user],
      "personal-amm · swap TOKEN_A→TOKEN_B (v0 + pool ALT)"
    );

    expect(
      BigInt(
        (await provider.connection.getTokenAccountBalance(ctx.userTokenBAta)).value
          .amount
      )
    ).to.equal(expectedOut);
  });
});
