/**
 * On-chain happy paths for LetBinding variants not covered elsewhere.
 */
import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMintInstruction,
  createMint,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { randomBytes } from "crypto";

import {
  binding,
  buildIxLet,
  expr,
  IFX_LOCALNET_PROGRAM_ID,
} from "../sdk/src";
import {
  confirmSignature,
  expectIfxTxFail,
  provisionLocalFrame,
  sendAndConfirm,
  sendAndConfirmTransaction,
} from "./helpers";

describe("ifx let binding coverage (on-chain)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  it("loads Clock epoch / leader_schedule / epoch_start fields", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      closeAuthority: payer.publicKey,
      tapeLen: 256,
    });

    const b = scratch.letBuilder();
    const slot = b.clockSlot();
    const epochStart = b.clockEpochStartTimestamp();
    const epoch = b.clockEpoch();
    const leaderEpoch = b.clockLeaderScheduleEpoch();
    await sendAndConfirm(
      provider,
      "ifx · Clock tags 3–7",
      scratch.ixReset(),
      b.buildIx()
    );

    const on = await scratch.fetchDecodedFrame(provider.connection);
    const chainSlot = BigInt(await provider.connection.getSlot());
    expect(on.readU64(slot) >= chainSlot).to.equal(true);
    expect(on.readU64(slot) <= chainSlot + 2n).to.equal(true);
    expect(on.readI64(epochStart)).to.be.a("bigint");
    expect(on.readU64(epoch) >= 0n).to.equal(true);
    expect(on.readU64(leaderEpoch) >= 0n).to.equal(true);
  });

  it("dataLen + rentMinimumBalance(165) for SPL token account layout", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      closeAuthority: payer.publicKey,
      tapeLen: 256,
    });

    const mint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      6
    );
    const owner = Keypair.generate();
    await confirmSignature(
      provider.connection,
      await provider.connection.requestAirdrop(owner.publicKey, LAMPORTS_PER_SOL)
    );
    const ata = getAssociatedTokenAddressSync(
      mint,
      owner.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    await sendAndConfirmTransaction(
      provider,
      new Transaction().add(
        createAssociatedTokenAccountIdempotentInstruction(
          payer.publicKey,
          ata,
          owner.publicKey,
          mint
        )
      ),
      "setup · ATA for dataLen + rent"
    );

    const b = scratch.letBuilder();
    const len = b.dataLen(ata);
    const rent165 = b.rentMinimumBalance(165);
    await sendAndConfirm(
      provider,
      "ifx · dataLen + rentMinimumBalance(165)",
      scratch.ixReset(),
      b.buildIx(),
      scratch.ixAssert(expr.eq(len, expr.u32(165))),
      scratch.ixAssert(expr.gt(rent165, expr.u64(0)))
    );

    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.readU32(len)).to.equal(165);
    expect(on.readU64(rent165) > 0n).to.equal(true);
  });

  it("loads all SPL Token account + mint typed fields", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      closeAuthority: payer.publicKey,
      tapeLen: 512,
    });

    const mintKp = Keypair.generate();
    const mint = mintKp.publicKey;
    const owner = Keypair.generate();
    await confirmSignature(
      provider.connection,
      await provider.connection.requestAirdrop(owner.publicKey, LAMPORTS_PER_SOL)
    );

    const mintRent =
      await provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
    const setupMintTx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint,
        lamports: mintRent,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mint,
        9,
        payer.publicKey,
        null,
        TOKEN_PROGRAM_ID
      )
    );
    await sendAndConfirmTransaction(provider, setupMintTx, "setup · SPL mint", [
      mintKp,
    ]);

    const ata = getAssociatedTokenAddressSync(mint, owner.publicKey);
    const mintAmount = 1_000_000n;
    await sendAndConfirmTransaction(
      provider,
      new Transaction()
        .add(
          createAssociatedTokenAccountIdempotentInstruction(
            payer.publicKey,
            ata,
            owner.publicKey,
            mint
          )
        )
        .add(
          createMintToInstruction(mint, ata, payer.publicKey, mintAmount, [], TOKEN_PROGRAM_ID)
        ),
      "setup · SPL ATA + mintTo"
    );

    const mintInfo = await getMint(provider.connection, mint);

    const b = scratch.letBuilder();
    const amount = b.splTokenAmount(ata);
    const delegated = b.splTokenDelegatedAmount(ata);
    const state = b.splTokenAccountState(ata);
    const supply = b.splMintSupply(mint);
    const decimals = b.splMintDecimals(mint);
    await sendAndConfirm(
      provider,
      "ifx · SPL Token tags 9–13",
      scratch.ixReset(),
      b.buildIx()
    );

    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.readU64(amount)).to.equal(mintAmount);
    expect(on.readU64(delegated)).to.equal(0n);
    expect(on.readU8(state)).to.equal(1);
    expect(on.readU64(supply)).to.equal(mintAmount);
    expect(on.readU8(decimals)).to.equal(mintInfo.decimals);
  });

  it("loads Token-2022 base fields on mint + ATA", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      closeAuthority: payer.publicKey,
      tapeLen: 512,
    });

    const mint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      6,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    const owner = Keypair.generate();
    await confirmSignature(
      provider.connection,
      await provider.connection.requestAirdrop(owner.publicKey, LAMPORTS_PER_SOL)
    );
    const ata = getAssociatedTokenAddressSync(
      mint,
      owner.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const raw = 500n;
    await sendAndConfirmTransaction(
      provider,
      new Transaction()
        .add(
          createAssociatedTokenAccountIdempotentInstruction(
            payer.publicKey,
            ata,
            owner.publicKey,
            mint,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        )
        .add(
          createMintToInstruction(
            mint,
            ata,
            payer.publicKey,
            raw,
            [],
            TOKEN_2022_PROGRAM_ID
          )
        ),
      "setup · Token-2022 base ATA"
    );

    const b = scratch.letBuilder();
    const amount = b.splToken2022Amount(ata);
    const delegated = b.splToken2022DelegatedAmount(ata);
    const state = b.splToken2022AccountState(ata);
    const supply = b.splToken2022MintSupply(mint);
    const decimals = b.splToken2022MintDecimals(mint);
    await sendAndConfirm(
      provider,
      "ifx · Token-2022 base tags 14–18",
      scratch.ixReset(),
      b.buildIx()
    );

    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.readU64(amount)).to.equal(raw);
    expect(on.readU64(delegated)).to.equal(0n);
    expect(on.readU8(state)).to.equal(1);
    expect(on.readU64(supply)).to.equal(raw);
    expect(on.readU8(decimals)).to.equal(6);
  });

  it("rejects Token2022ExtensionNotPresent on plain mint", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      closeAuthority: payer.publicKey,
      tapeLen: 256,
    });

    const mint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      6,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · Token2022ExtensionNotPresent (expect fail)",
          scratch.ixReset(),
          buildIxLet(
            scratch.frame,
            {
              bindings: [binding.splToken2022MintTransferFeeBasisPoints(0)],
            },
            [{ pubkey: mint, isSigner: false, isWritable: false }],
            { programId: IFX_LOCALNET_PROGRAM_ID }
          )
        ),
      "Token2022ExtensionNotPresent"
    );
  });

  it("rejects AccountDataTooShort on accountDataSlice past end", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      closeAuthority: payer.publicKey,
      tapeLen: 256,
    });

    const mint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      0
    );

    const badSlice = scratch.letAccountDataSlice(
      mint,
      TOKEN_PROGRAM_ID,
      "u64",
      200
    );

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · AccountDataTooShort (expect fail)",
          scratch.ixReset(),
          scratch.ixLet(badSlice)
        ),
      "AccountDataTooShort"
    );
  });

  it("rejects AccountDataLenMismatch when SPL layout size wrong", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      closeAuthority: payer.publicKey,
      tapeLen: 256,
    });

    const mint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      0
    );

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · AccountDataLenMismatch (expect fail)",
          scratch.ixReset(),
          buildIxLet(
            scratch.frame,
            { bindings: [binding.splTokenAccountAmount(0)] },
            [{ pubkey: mint, isSigner: false, isWritable: false }],
            { programId: IFX_LOCALNET_PROGRAM_ID }
          )
        ),
      "AccountDataLenMismatch"
    );
  });
});
