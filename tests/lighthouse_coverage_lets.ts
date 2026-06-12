/**
 * On-chain R5 / LB-5: Lighthouse assertion-domain typed lets (tag 45–67).
 */
import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createMint,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { randomBytes } from "crypto";

import { expr, IFX_LOCALNET_PROGRAM_ID } from "../sdk/src";
import {
  confirmSignature,
  expectIfxTxFail,
  provisionLocalFrame,
  sendAndConfirm,
  sendAndConfirmTransaction,
} from "./helpers";
import { createInitializedStakeAccount } from "./helpers/stake";

const BPF_LOADER_UPGRADEABLE_PROGRAM_ID = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

describe("ifx lighthouse coverage lets (R5, on-chain)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  async function setupSplAta(): Promise<{
    mint: PublicKey;
    owner: Keypair;
    ata: PublicKey;
  }> {
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
          createMintToInstruction(mint, ata, payer.publicKey, 1_000n, [], TOKEN_PROGRAM_ID)
        ),
      "setup · SPL ATA (R5)"
    );
    return { mint, owner, ata };
  }

  it("reads AccountInfo metadata on SPL ATA (tag 45–47)", async () => {
    const { owner, ata } = await setupSplAta();

    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const b = scratch.letBuilder();
    const programOwner = b.accountProgramOwner(ata);
    const executable = b.accountExecutable(ata);
    const rentEpoch = b.accountRentEpoch(ata);

    await sendAndConfirm(
      provider,
      "ifx · AccountInfo metadata lets",
      scratch.ixReset(),
      b.buildIx(),
      scratch.ixAssert(
        expr.eq(expr.ref(programOwner), expr.pubkey(TOKEN_PROGRAM_ID))
      ),
      scratch.ixAssert(expr.eq(expr.ref(executable), expr.bool(false)))
    );

    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.readPubkey(programOwner).equals(TOKEN_PROGRAM_ID)).to.equal(true);
    expect(on.readBool(executable)).to.equal(false);
    expect(on.readU64(rentEpoch)).to.be.a("bigint");
  });

  it("reads SPL token account fields + ATA owner-is-derived (tag 48–53)", async () => {
    const { mint, owner, ata } = await setupSplAta();

    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const b = scratch.letBuilder();
    const tapedMint = b.splTokenAccountMint(ata);
    const tapedOwner = b.splTokenAccountOwner(ata);
    const derived = b.splTokenAccountOwnerIsDerived(ata);

    await sendAndConfirm(
      provider,
      "ifx · SPL token account R5 lets",
      scratch.ixReset(),
      b.buildIx(),
      scratch.ixAssert(expr.eq(expr.ref(tapedMint), expr.pubkey(mint))),
      scratch.ixAssert(expr.eq(expr.ref(tapedOwner), expr.pubkey(owner.publicKey))),
      scratch.ixAssert(expr.eq(expr.ref(derived), expr.bool(true)))
    );

    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.readPubkey(tapedMint).equals(mint)).to.equal(true);
    expect(on.readPubkey(tapedOwner).equals(owner.publicKey)).to.equal(true);
    expect(on.readBool(derived)).to.equal(true);
  });

  it("rejects empty COption token fields (SplMintOptionEmpty)", async () => {
    const { ata } = await setupSplAta();

    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    for (const plan of [
      () => scratch.letBuilder().splTokenAccountDelegate(ata),
      () => scratch.letBuilder().splTokenAccountCloseAuthority(ata),
      () => scratch.letBuilder().splTokenAccountIsNative(ata),
    ]) {
      const b = scratch.letBuilder();
      plan();
      await expectIfxTxFail(
        () =>
          sendAndConfirm(
            provider,
            "ifx · empty COption token field (expect fail)",
            scratch.ixReset(),
            b.buildIx()
          ),
        "SplMintOptionEmpty"
      );
    }
  });

  it("reads Initialized stake meta + state tag (tag 60–62)", async () => {
    const custodian = PublicKey.unique();
    const stake = await createInitializedStakeAccount(
      provider,
      { staker: payer.publicKey, withdrawer: payer.publicKey },
      { unixTimestamp: 0n, epoch: 0n, custodian }
    );

    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const b = scratch.letBuilder();
    const stateTag = b.stakeAccountState(stake.publicKey);
    const tapedCustodian = b.stakeLockupCustodian(stake.publicKey);
    const reserve = b.stakeRentExemptReserve(stake.publicKey);

    await sendAndConfirm(
      provider,
      "ifx · stake R5 meta lets",
      scratch.ixReset(),
      b.buildIx(),
      scratch.ixAssert(expr.eq(expr.ref(stateTag), expr.u8(1))),
      scratch.ixAssert(expr.eq(expr.ref(tapedCustodian), expr.pubkey(custodian)))
    );

    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.readU8(stateTag)).to.equal(1);
    expect(on.readPubkey(tapedCustodian).equals(custodian)).to.equal(true);
    expect(on.readU64(reserve) > 0n).to.equal(true);
  });

  it("rejects Stake-only fields on Initialized stake", async () => {
    const stake = await createInitializedStakeAccount(
      provider,
      { staker: payer.publicKey, withdrawer: payer.publicKey },
      { unixTimestamp: 0n, epoch: 0n, custodian: PublicKey.default }
    );

    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    for (const plan of [
      () => scratch.letBuilder().stakeCreditsObserved(stake.publicKey),
      () => scratch.letBuilder().stakeStakeFlags(stake.publicKey),
    ]) {
      const b = scratch.letBuilder();
      plan();
      await expectIfxTxFail(
        () =>
          sendAndConfirm(
            provider,
            "ifx · stake-only field on Initialized (expect fail)",
            scratch.ixReset(),
            b.buildIx()
          ),
        "StakeStateMismatch"
      );
    }
  });

  it("reads upgradeable loader Program + ProgramData (tag 65–67)", async () => {
    const programId = IFX_LOCALNET_PROGRAM_ID;
    const [programData] = PublicKey.findProgramAddressSync(
      [programId.toBuffer()],
      BPF_LOADER_UPGRADEABLE_PROGRAM_ID
    );

    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const b = scratch.letBuilder();
    const dataTag = b.upgradeableProgramDataTag(programData);
    const upgradeAuthority = b.upgradeableProgramDataUpgradeAuthority(programData);
    const programdataAddress = b.upgradeableProgramProgramDataAddress(programId);

    await sendAndConfirm(
      provider,
      "ifx · upgradeable loader R5 lets",
      scratch.ixReset(),
      b.buildIx(),
      scratch.ixAssert(expr.eq(expr.ref(dataTag), expr.u32(3))),
      scratch.ixAssert(
        expr.eq(expr.ref(programdataAddress), expr.pubkey(programData))
      )
    );

    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.readU32(dataTag)).to.equal(3);
    expect(on.readPubkey(programdataAddress).equals(programData)).to.equal(true);
    expect(on.readPubkey(upgradeAuthority).equals(payer.publicKey)).to.equal(true);
  });
});
