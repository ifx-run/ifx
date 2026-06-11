/**
 * Upgradeable loader guard — assert program owner + ProgramData upgrade authority.
 *
 * ≈ Lighthouse upgradeable-loader asserts.
 *
 * Optional orchestration: gate a follow-up upgrade CPI with
 * `if_else(authorityRevoked, arm.skip(), arm.cpi(upgradeStep))` where
 * `authorityRevoked = expr.eq(upgradeAuthority, expr.pubkey(PublicKey.default))`.
 */
import { PublicKey, Transaction } from "@solana/web3.js";

import { expr, type FrameScratch } from "../src/index";

/** BPF Upgradeable Loader program id. */
export const BPF_LOADER_UPGRADEABLE_PROGRAM_ID = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

export type UpgradeableProgramGuardAccounts = {
  programId: PublicKey;
  programData: PublicKey;
  /** Expected upgrade authority; use `PublicKey.default` when program is immutable. */
  expectedUpgradeAuthority: PublicKey;
};

/**
 * reset → lets → assert owner + ProgramData tag + upgrade authority match →
 */
export function planUpgradeableProgramGuardTx(
  scratch: FrameScratch,
  accounts: UpgradeableProgramGuardAccounts
): Transaction {
  const { programId, programData, expectedUpgradeAuthority } = accounts;

  const b = scratch.letBuilder();
  const owner = b.accountProgramOwner(programId);
  const dataTag = b.upgradeableProgramDataTag(programData);
  const upgradeAuthority = b.upgradeableProgramDataUpgradeAuthority(programData);
  const programdataAddress = b.upgradeableProgramProgramDataAddress(programId);

  const tx = new Transaction();
  tx.add(scratch.ixReset());
  tx.add(b.buildIx());

  tx.add(
    scratch.ixAssert(
      expr.eq(expr.ref(owner), expr.pubkey(BPF_LOADER_UPGRADEABLE_PROGRAM_ID))
    )
  );
  tx.add(scratch.ixAssert(expr.eq(expr.ref(dataTag), expr.u32(3))));
  tx.add(
    scratch.ixAssert(
      expr.eq(expr.ref(programdataAddress), expr.pubkey(programData))
    )
  );
  tx.add(
    scratch.ixAssert(
      expr.eq(expr.ref(upgradeAuthority), expr.pubkey(expectedUpgradeAuthority))
    )
  );

  return tx;
}
