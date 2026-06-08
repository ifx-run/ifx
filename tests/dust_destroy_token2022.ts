/**
 * L1 example integration — Token-2022 dust destroy via planDustDestroyTx.
 * See sdk/examples/dust-destroy-token2022.ts.
 */
import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  ExtensionType,
  calculateFee,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createInitializeTransferFeeConfigInstruction,
  createTransferCheckedWithFeeInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMintWithExtensions,
  getMintLen,
  getTransferFeeAmount,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { randomBytes } from "crypto";

import { FrameScratch } from "../sdk/src";
import {
  DUST_THRESHOLD_RAW,
  planDustDestroyTx,
} from "../sdk/examples/dust-destroy-token2022";
import { confirmSignature, sendAndConfirm, sendAndConfirmSignersOnly, LABEL_SETUP_CREATE_FRAME, planLocalFrame } from "./helpers";

const DECIMALS = 6;
const DUST_BALANCE = 500;
const SAFE_BALANCE = DUST_THRESHOLD_RAW + 500;
/** Pre-fee transfer into dust ATA — fee stays as withheld on destination (100 bps → fee = amount/100). */
const WITHHELD_SEED_TRANSFER = BigInt(200);

const TRANSFER_FEE_CONFIG = {
  transferFeeBasisPoints: 100,
  maximumFee: BigInt(1_000_000),
  epoch: BigInt(0),
};

async function createTransferFeeMint(
  provider: anchor.AnchorProvider,
  payer: Keypair,
  mintAuthority: Keypair
): Promise<Keypair> {
  const connection = provider.connection;
  const mint = Keypair.generate();
  const extensions = [ExtensionType.TransferFeeConfig];
  const mintLen = getMintLen(extensions);
  const lamports = await getMinimumBalanceForRentExemptMintWithExtensions(
    connection,
    extensions
  );

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferFeeConfigInstruction(
      mint.publicKey,
      mintAuthority.publicKey,
      mintAuthority.publicKey,
      TRANSFER_FEE_CONFIG.transferFeeBasisPoints,
      TRANSFER_FEE_CONFIG.maximumFee,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMint2Instruction(
      mint.publicKey,
      DECIMALS,
      mintAuthority.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    )
  );
  tx.feePayer = payer.publicKey;
  await sendAndConfirmSignersOnly(
    provider,
    tx,
    [payer, mint],
    "setup · Token-2022 transfer-fee mint"
  );
  return mint;
}

/** Credit dust ATA via TransferCheckedWithFee so `TransferFeeAmount.withheld` > 0. */
async function seedWithheldOnAta(
  provider: anchor.AnchorProvider,
  payer: Keypair,
  mint: PublicKey,
  destination: PublicKey,
  preFeeAmount: bigint = WITHHELD_SEED_TRANSFER
): Promise<bigint> {
  const fee = calculateFee(TRANSFER_FEE_CONFIG, preFeeAmount);
  expect(fee > 0n).to.be.true;

  const source = getAssociatedTokenAddressSync(
    mint,
    payer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const setupTx = new Transaction();
  const sourceInfo = await provider.connection.getAccountInfo(source);
  if (sourceInfo === null) {
    setupTx.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        source,
        payer.publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }
  if (setupTx.instructions.length > 0) {
    setupTx.feePayer = payer.publicKey;
    await sendAndConfirmSignersOnly(
      provider,
      setupTx,
      [payer],
      "setup · dust test payer source ATA"
    );
  }

  const fundAmount = preFeeAmount + fee + BigInt(10_000);
  await mintTo(
    provider.connection,
    payer,
    mint,
    source,
    payer,
    fundAmount,
    [],
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  const xferTx = new Transaction().add(
    createTransferCheckedWithFeeInstruction(
      source,
      mint,
      destination,
      payer.publicKey,
      preFeeAmount,
      DECIMALS,
      fee,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );
  xferTx.feePayer = payer.publicKey;
  await sendAndConfirmSignersOnly(
    provider,
    xferTx,
    [payer],
    "setup · seed withheld transfer fee on dust ATA"
  );

  const dest = await getAccount(
    provider.connection,
    destination,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  const withheld = getTransferFeeAmount(dest)?.withheldAmount ?? 0n;
  expect(withheld === fee).to.be.true;
  return withheld;
}

describe("dust destroy token2022 (L1 example)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  async function setupDustAta(
    owner: Keypair,
    balance: number,
    options?: { seedWithheld?: boolean }
  ): Promise<{
    scratch: FrameScratch;
    mint: PublicKey;
    tokenAccount: PublicKey;
    rentDestination: Keypair;
  }> {
    const frameId = randomBytes(32);
    const { scratch, ixCreate } = planLocalFrame({
      payer: payer.publicKey,
      frameId,
      closeAuthority: payer.publicKey,
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

    const fundSig = await provider.connection.requestAirdrop(
      owner.publicKey,
      LAMPORTS_PER_SOL
    );
    await confirmSignature(provider.connection, fundSig);

    const mintKp = await createTransferFeeMint(provider, payer, payer);
    const mint = mintKp.publicKey;

    const tokenAccount = getAssociatedTokenAddressSync(
      mint,
      owner.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const setupTx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        tokenAccount,
        owner.publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    setupTx.feePayer = payer.publicKey;
    await sendAndConfirmSignersOnly(
      provider,
      setupTx,
      [payer],
      "setup · dust test owner Token-2022 ATA"
    );

    await mintTo(
      provider.connection,
      payer,
      mint,
      tokenAccount,
      payer,
      balance,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    if (options?.seedWithheld) {
      await seedWithheldOnAta(
        provider,
        payer,
        mint,
        tokenAccount,
        WITHHELD_SEED_TRANSFER
      );
    }

    const rentDestination = Keypair.generate();
    const rentFund = await provider.connection.requestAirdrop(
      rentDestination.publicKey,
      LAMPORTS_PER_SOL / 10
    );
    await confirmSignature(provider.connection, rentFund);

    return { scratch, mint, tokenAccount, rentDestination };
  }

  it("planDustDestroyTx burns dust, harvests withheld, and closes the Token-2022 ATA", async () => {
    const owner = Keypair.generate();
    const { scratch, mint, tokenAccount, rentDestination } =
      await setupDustAta(owner, DUST_BALANCE, { seedWithheld: true });

    const destBefore = await getAccount(
      provider.connection,
      tokenAccount,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    const withheldBefore = getTransferFeeAmount(destBefore)!.withheldAmount;
    expect(withheldBefore > 0n).to.be.true;
    expect(destBefore.amount < BigInt(DUST_THRESHOLD_RAW)).to.be.true;

    const letBatch = scratch.letBuilder();
    const amount = letBatch.splToken2022Amount(tokenAccount);
    const withheld = letBatch.splToken2022TransferFeeWithheld(tokenAccount);
    const decimals = letBatch.splToken2022MintDecimals(mint);
    const feeBps = letBatch.splToken2022MintTransferFeeBasisPoints(mint);
    const feeMax = letBatch.splToken2022MintTransferFeeMaximum(mint);
    const mintWithheld = letBatch.splToken2022MintWithheldAmount(mint);
    await sendAndConfirm(
      provider,
      "dust destroy · verify Token-2022 let bindings",
      scratch.ixReset(),
      letBatch.buildIx()
    );
    const letSnap = await scratch.fetchDecodedFrame(provider.connection);
    expect(letSnap.readU64(amount)).to.equal(destBefore.amount);
    expect(letSnap.readU64(withheld)).to.equal(withheldBefore);
    expect(letSnap.readU8(decimals)).to.equal(DECIMALS);
    expect(letSnap.readU16(feeBps)).to.equal(
      TRANSFER_FEE_CONFIG.transferFeeBasisPoints
    );
    expect(letSnap.readU64(feeMax)).to.equal(TRANSFER_FEE_CONFIG.maximumFee);
    expect(letSnap.readU64(mintWithheld) >= 0n).to.equal(true);

    const beforeSupply = (
      await provider.connection.getTokenSupply(mint)
    ).value.amount;

    const businessTx = planDustDestroyTx(scratch, {
      mint,
      tokenAccount,
      owner: owner.publicKey,
      rentDestination: rentDestination.publicKey,
    });
    businessTx.feePayer = payer.publicKey;
    await sendAndConfirmSignersOnly(
      provider,
      businessTx,
      [payer, owner],
      "dust destroy · burn + harvest + close (dust + withheld)"
    );

    const afterSupply = (
      await provider.connection.getTokenSupply(mint)
    ).value.amount;
    expect(BigInt(afterSupply)).to.equal(
      BigInt(beforeSupply) - destBefore.amount
    );
  });

  it("planDustDestroyTx skips when balance >= DUST_THRESHOLD_RAW", async () => {
    const owner = Keypair.generate();
    const { scratch, mint, tokenAccount, rentDestination } =
      await setupDustAta(owner, SAFE_BALANCE);

    const businessTx = planDustDestroyTx(scratch, {
      mint,
      tokenAccount,
      owner: owner.publicKey,
      rentDestination: rentDestination.publicKey,
    });
    businessTx.feePayer = payer.publicKey;
    await sendAndConfirmSignersOnly(
      provider,
      businessTx,
      [payer, owner],
      "dust destroy · skip when balance ≥ threshold"
    );
    const bal = await provider.connection.getTokenAccountBalance(tokenAccount);
    expect(bal.value.amount).to.equal(String(SAFE_BALANCE));
  });
});
