/**
 * Conditional WSOL wrap: one `if_else` arm with patched transfer + static syncNative.
 *
 * See integration test `tests/ifx_wsol_if_else.ts`.
 */
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

import {
  arm,
  rawCpiPatch,
  ifElseArgs,
  rawCpi,   staticCpi,
  type FrameScratch,
} from "../src";

export type WsolConditionalWrapAccounts = {
  owner: PublicKey;
  /** When true, transfer + syncNative run in one if_else arm. */
  cond: import("../src/typed").Cond;
  wrapLamports: import("../src/typed").Cond;
};

/** Merge remaining metas for transfer (System) + syncNative (Token) CPI steps. */
export function mergeWsolWrapRemaining(
  transferRemaining: import("@solana/web3.js").AccountMeta[],
  syncRemaining: import("@solana/web3.js").AccountMeta[],
  transferStep: { accountsStart: number; accountsLen: number },
  syncStep: { accountsStart: number; accountsLen: number }
): import("@solana/web3.js").AccountMeta[] {
  const syncStart = syncRemaining.findIndex((m) =>
    m.pubkey.equals(TOKEN_PROGRAM_ID)
  );
  const combined = [...transferRemaining, ...syncRemaining.slice(syncStart)];
  const syncOffset = combined.findIndex((m) => m.pubkey.equals(TOKEN_PROGRAM_ID));
  transferStep.accountsStart = 0;
  transferStep.accountsLen = syncOffset;
  syncStep.accountsStart = syncOffset;
  syncStep.accountsLen = combined.length - syncOffset;
  return combined;
}

export function planWsolConditionalWrapTx(
  scratch: FrameScratch,
  accounts: WsolConditionalWrapAccounts
): Transaction {
  const wsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, accounts.owner);
  const tx = new Transaction();
  tx.add(scratch.ixReset());

  const transfer = rawCpi(
    SystemProgram.transfer({
      fromPubkey: accounts.owner,
      toPubkey: wsolAta,
      lamports: 0,
    }),
    { patches: [rawCpiPatch(4, accounts.wrapLamports)] }
  ).build();
  const sync = staticCpi(createSyncNativeInstruction(wsolAta));
  const remaining = mergeWsolWrapRemaining(
    transfer.remaining,
    sync.remaining,
    transfer.cpi,     sync.staticStep
  );

  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      accounts.owner,
      wsolAta,
      accounts.owner,
      NATIVE_MINT
    )
  );
  tx.add(
    scratch.ixIfElse(
      ifElseArgs(
        accounts.cond,
        arm.cpis([transfer.cpi, sync.staticStep]),
        arm.skip()
      ),
      remaining
    )
  );
  return tx;
}
