/**
 * Writes /tmp/ifx-dust-fixture.json for go-sdk integration tests.
 * Mirrors tests/dust_destroy_token2022.ts setup (TransferFee mint + withheld seed).
 */
import * as anchor from "@anchor-lang/core";
import { randomBytes } from "crypto";
import fs from "fs";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
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
  LABEL_SETUP_CREATE_FRAME,
  planLocalFrame,
  sendAndConfirmSignersOnly,
} from "../../tests/helpers";

const OUT = process.env.IFX_DUST_FIXTURE ?? "/tmp/ifx-dust-fixture.json";
const DUST_BALANCE = 500;
const DECIMALS = 6;
const WITHHELD_SEED_TRANSFER = BigInt(200);

const TRANSFER_FEE_CONFIG = {
  transferFeeBasisPoints: 100,
  maximumFee: BigInt(1_000_000),
  epoch: BigInt(0),
};

async function createTransferFeeMint(
  provider: anchor.AnchorProvider,
  payer: Keypair
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
      payer.publicKey,
      payer.publicKey,
      TRANSFER_FEE_CONFIG.transferFeeBasisPoints,
      TRANSFER_FEE_CONFIG.maximumFee,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMint2Instruction(
      mint.publicKey,
      DECIMALS,
      payer.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    )
  );
  tx.feePayer = payer.publicKey;
  await sendAndConfirmSignersOnly(
    provider,
    tx,
    [payer, mint],
    "fixture · Token-2022 transfer-fee mint"
  );
  return mint;
}

async function seedWithheldOnAta(
  provider: anchor.AnchorProvider,
  payer: Keypair,
  mint: PublicKey,
  destination: PublicKey
): Promise<void> {
  const preFeeAmount = WITHHELD_SEED_TRANSFER;
  const fee = calculateFee(TRANSFER_FEE_CONFIG, preFeeAmount);
  if (fee <= 0n) {
    throw new Error("expected transfer fee > 0");
  }

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
      "fixture · payer source ATA"
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
    "fixture · seed withheld on dust ATA"
  );

  const dest = await getAccount(
    provider.connection,
    destination,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  const withheld = getTransferFeeAmount(dest)?.withheldAmount ?? 0n;
  if (withheld !== fee) {
    throw new Error(`withheld ${withheld} != fee ${fee}`);
  }
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = provider.wallet.payer;

  const owner = Keypair.generate();
  const rentDestination = Keypair.generate();
  const frameId = randomBytes(32);

  const fundOwner = await provider.connection.requestAirdrop(
    owner.publicKey,
    LAMPORTS_PER_SOL
  );
  await provider.connection.confirmTransaction(fundOwner, "confirmed");
  const fundRent = await provider.connection.requestAirdrop(
    rentDestination.publicKey,
    LAMPORTS_PER_SOL / 10
  );
  await provider.connection.confirmTransaction(fundRent, "confirmed");

  const mintKp = await createTransferFeeMint(provider, payer);
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
    "fixture · dust owner ATA"
  );

  await mintTo(
    provider.connection,
    payer,
    mint,
    tokenAccount,
    payer,
    DUST_BALANCE,
    [],
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  await seedWithheldOnAta(provider, payer, mint, tokenAccount);

  const { ixCreate } = planLocalFrame({
    payer: payer.publicKey,
    frameId,
    closeAuthority: payer.publicKey,
    tapeLen: 256,
  });
  const createTx = new Transaction().add(ixCreate);
  createTx.feePayer = payer.publicKey;
  await sendAndConfirmSignersOnly(
    provider,
    createTx,
    [payer],
    LABEL_SETUP_CREATE_FRAME
  );

  const fixture = {
    payer: payer.publicKey.toBase58(),
    frameId: Buffer.from(frameId).toString("hex"),
    mint: mint.toBase58(),
    tokenAccount: tokenAccount.toBase58(),
    owner: owner.publicKey.toBase58(),
    ownerSecret: Buffer.from(owner.secretKey).toString("base64"),
    rentDestination: rentDestination.publicKey.toBase58(),
    dustBalance: DUST_BALANCE,
  };
  fs.writeFileSync(OUT, JSON.stringify(fixture, null, 2));
  console.log("wrote", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
