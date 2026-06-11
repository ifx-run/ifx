/**
 * On-chain typed stake LetBindings (R2).
 */
import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";
import { randomBytes } from "crypto";

import {
  expectIfxTxFail,
  provisionLocalFrame,
  sendAndConfirm,
} from "./helpers";
import { createInitializedStakeAccount } from "./helpers/stake";

describe("ifx stake typed lets (on-chain)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  it("reads Initialized stake meta fields", async () => {
    const staker = PublicKey.unique();
    const withdrawer = PublicKey.unique();
    const custodian = PublicKey.unique();
    const lockupUnix = 1_700_000_000n;
    const lockupEpoch = 42n;

    const stake = await createInitializedStakeAccount(
      provider,
      { staker, withdrawer },
      { unixTimestamp: lockupUnix, epoch: lockupEpoch, custodian }
    );

    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const b = scratch.letBuilder();
    const tapedStaker = b.stakeAuthorizedStaker(stake.publicKey);
    const tapedWithdrawer = b.stakeAuthorizedWithdrawer(stake.publicKey);
    const tapedLockupUnix = b.stakeLockupUnixTimestamp(stake.publicKey);
    const tapedLockupEpoch = b.stakeLockupEpoch(stake.publicKey);

    await sendAndConfirm(
      provider,
      "ifx · stake meta lets",
      scratch.ixReset(),
      b.buildIx()
    );

    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.readPubkey(tapedStaker).equals(staker)).to.equal(true);
    expect(on.readPubkey(tapedWithdrawer).equals(withdrawer)).to.equal(true);
    expect(on.readI64(tapedLockupUnix)).to.equal(lockupUnix);
    expect(on.readU64(tapedLockupEpoch)).to.equal(lockupEpoch);
  });

  it("rejects delegation fields on Initialized stake (StakeStateMismatch)", async () => {
    const stake = await createInitializedStakeAccount(
      provider,
      { staker: payer.publicKey, withdrawer: payer.publicKey },
      {
        unixTimestamp: 0n,
        epoch: 0n,
        custodian: PublicKey.default,
      }
    );

    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 256,
    });

    const b = scratch.letBuilder();
    b.stakeDelegationStake(stake.publicKey);

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · stake delegation on Initialized (expect fail)",
          scratch.ixReset(),
          b.buildIx()
        ),
      "StakeStateMismatch"
    );
  });

  it("rejects wrong owner (AccountOwnerMismatch)", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 256,
    });

    const b = scratch.letBuilder();
    b.stakeAuthorizedStaker(payer.publicKey);

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · stake binding on system account (expect fail)",
          scratch.ixReset(),
          b.buildIx()
        ),
      "AccountOwnerMismatch"
    );
  });
});
