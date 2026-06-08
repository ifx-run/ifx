/**
 * Token-2022 dust cleanup: burn (patched CPI) → harvest → close (static CPI).
 *
 * Product rule: raw balance < DUST_THRESHOLD_RAW → destroy; otherwise skip all steps.
 * Assumes you already provisioned a Frame and know this ATA is Token-2022 + TransferFee.
 *
 * Wire `accounts` from your app (mint, tokenAccount, owner, rentDestination).
 * Harvest ix: use your Token-2022 stack — e.g. spl-token
 * `createHarvestWithheldTokensToMintInstruction(mint, [tokenAccount], TOKEN_2022_PROGRAM_ID)`.
 */
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import {
  createBurnCheckedInstruction,
  createCloseAccountInstruction,
  createHarvestWithheldTokensToMintInstruction,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

import {
  arm,
  cpiPatch,
  expr,
  ifElseArgs,
  cpi,
  staticCpi,
  type FrameScratch,
} from "../src/index";

/** Raw base units — NOT UI amount. Example: 6 decimals → 1000 raw = 0.001 whole tokens. */
export const DUST_THRESHOLD_RAW = 1000;

export type DustDestroyAccounts = {
  mint: PublicKey;
  tokenAccount: PublicKey;
  owner: PublicKey;
  rentDestination: PublicKey;
};

/** Token-2022 TransferFee harvest — delegates to `@solana/spl-token`. */
export function buildHarvestWithheldToMintIx(params: {
  mint: PublicKey;
  sources: PublicKey[];
  programId?: PublicKey;
}): TransactionInstruction {
  return createHarvestWithheldTokensToMintInstruction(
    params.mint,
    params.sources,
    params.programId ?? TOKEN_2022_PROGRAM_ID
  );
}

/** Business tx: reset + let + three conditional if_else steps. Frame must already exist. */
export function planDustDestroyTx(
  scratch: FrameScratch,
  accounts: DustDestroyAccounts
): Transaction {
  const { mint, tokenAccount, owner, rentDestination } = accounts;

  const tx = new Transaction();
  tx.add(scratch.ixReset());

  const letBatch = scratch.letBuilder();
  const amount = letBatch.splToken2022Amount(tokenAccount);
  const withheld = letBatch.splToken2022TransferFeeWithheld(tokenAccount);
  const decimals = letBatch.splToken2022MintDecimals(mint);
  tx.add(letBatch.buildIx());

  const dust = expr.lt(amount, expr.u64(DUST_THRESHOLD_RAW));

  // spl-token BurnChecked `data` (10 bytes):
  //   byte 0       u8  instruction tag (15 = BurnChecked)
  //   bytes 1..8   u64 amount (LE)  ← cpiPatch(1, amount)
  //   byte 9       u8  decimals      ← cpiPatch(9, decimals)
  // Template zeros are overwritten by Ifx before invoke.
  const burn = cpi(
    createBurnCheckedInstruction(
      tokenAccount,
      mint,
      owner,
      0, // amount placeholder → byte 1
      0, // decimals placeholder → byte 9
      [],
      TOKEN_2022_PROGRAM_ID
    ),
    {
      patches: [
        cpiPatch(1, amount),
        cpiPatch(9, decimals),
      ],
    }
  ).build();
  tx.add(
    scratch.ixIfElse(
      ifElseArgs(
        expr.and(dust, expr.nonZero(amount)),
        arm.cpi(burn.cpi)
      ),
      burn.remaining
    )
  );

  // #2 static CPI — harvest when tx-start withheld > 0
  const harvest = staticCpi(
    buildHarvestWithheldToMintIx({
      mint,
      sources: [tokenAccount],
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );
  tx.add(
    scratch.ixIfElse(
      ifElseArgs(
        expr.and(dust, expr.nonZero(withheld)),
        arm.cpi(harvest.staticStep)
      ),
      harvest.remaining
    )
  );

  // #3 static CPI — close empty ATA
  const close = staticCpi(
    createCloseAccountInstruction(
      tokenAccount,
      rentDestination,
      owner,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );
  tx.add(
    scratch.ixIfElse(ifElseArgs(dust, arm.cpi(close.staticStep)), close.remaining)
  );

  return tx;
}
