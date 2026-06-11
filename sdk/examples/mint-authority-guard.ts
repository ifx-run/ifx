/**
 * Mint authority guard — absolute assert (≈ Lighthouse AssertMintAccount).
 *
 * Reads `mint_authority` after reset and hard-fails unless it matches `expectedAuthority`.
 * For mints with revoked authority, use `AccountDataSlice` on the COption tag byte instead.
 */
import { PublicKey, Transaction } from "@solana/web3.js";

import { expr, type FrameScratch } from "../src/index";

export type MintAuthorityGuardAccounts = {
  mint: PublicKey;
  expectedAuthority: PublicKey;
};

/** Business tx: reset → let(mint_authority) → assert eq expected. */
export function planMintAuthorityGuardTx(
  scratch: FrameScratch,
  accounts: MintAuthorityGuardAccounts
): Transaction {
  const b = scratch.letBuilder();
  const mintAuthority = b.splMintMintAuthority(accounts.mint);

  const tx = new Transaction();
  tx.add(scratch.ixReset());
  tx.add(b.buildIx());
  tx.add(
    scratch.ixAssert(
      expr.eq(expr.ref(mintAuthority), expr.pubkey(accounts.expectedAuthority))
    )
  );
  return tx;
}
