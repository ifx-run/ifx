/**
 * Personal DEX operator onboarding — recommended Frame PDA + pool ALT address list.
 *
 * See [docs/personal-amm.md §5.1](../../docs/personal-amm.md#51-pool-onboarding-and-address-lookup-table-alt).
 */
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";

import {
  DEFAULT_IFX_PROGRAM_ID,
  FrameScratch,
  type CreateIxCreateFrameParams,
} from "../src/index";

export type PersonalDexPoolConfig = {
  frame: PublicKey;
  poolTokenAAta: PublicKey;
  poolTokenBAta: PublicKey;
  mintTokenA: PublicKey;
  mintTokenB: PublicKey;
  ifxProgramId?: PublicKey;
  tokenProgramId?: PublicKey;
  associatedTokenProgramId?: PublicKey;
  /** When true (default), include mint pubkeys in the pool ALT. */
  includeMintsInAlt?: boolean;
};

/**
 * Curated pool-stable addresses for `extendLookupTable` (order is deterministic).
 * Excludes signers (user, pool wallet) and per-user ATAs.
 */
export function personalDexAltAddresses(config: PersonalDexPoolConfig): PublicKey[] {
  const tokenProgram = config.tokenProgramId ?? TOKEN_PROGRAM_ID;
  const ataProgram = config.associatedTokenProgramId ?? ASSOCIATED_TOKEN_PROGRAM_ID;
  const ifxProgram = config.ifxProgramId ?? DEFAULT_IFX_PROGRAM_ID;
  const includeMints = config.includeMintsInAlt !== false;

  const out: PublicKey[] = [
    config.frame,
    config.poolTokenAAta,
    config.poolTokenBAta,
    ifxProgram,
    tokenProgram,
    ataProgram,
  ];
  if (includeMints) {
    out.push(config.mintTokenA, config.mintTokenB);
  }
  return out;
}

export type PlanPersonalDexFrameParams = CreateIxCreateFrameParams;

/** Plan operator-recommended Frame PDA + `ifx_create_frame` ix. */
export function planPersonalDexFrame(params: PlanPersonalDexFrameParams): {
  scratch: FrameScratch;
  ixCreate: TransactionInstruction;
  frame: PublicKey;
  frameBump: number;
} {
  const { scratch, ixCreate, frame, frameBump } =
    FrameScratch.planNewFrame(params);
  return { scratch, ixCreate, frame, frameBump };
}
