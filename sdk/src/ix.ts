import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

import {
  ACCOUNT_DISC_FRAME,
  DEFAULT_IFX_PROGRAM_ID,
  IX_DISC_ASSERT,
  IX_DISC_ASSERT_MULTI,
  IX_DISC_CLOSE_FRAME,
  IX_DISC_CREATE_FRAME,
  IX_DISC_IF_ELSE,
  IX_DISC_PATCHED_CPI,
  IX_DISC_LET,
  IX_DISC_RESET_FRAME,
  MAX_ASSERT_MULTI_CONDS,
  MAX_FRAME_TAPE_LEN,
  MIN_TAPE_LEN,
  RECOMMENDED_ASSERT_MULTI_MAX,
  RECOMMENDED_TAPE_LEN_MAX,
} from "./constants";
import {
  encodeCpi,
  encodeIfElseArgs,
  encodeExpr,
  encodeLetArgs,
  encodeAssertMultiArgs,
} from "./codec";
import { prependWriteAuthorityRemaining } from "./frame-authority";
import { framePda } from "./layout";
import type { Expr, IfElseArgs, LetArgs } from "./types";
import type { CpiWireBuildResult } from "./cpi";
import { cpiRequiresPatchApply } from "./types";
import type { Cond } from "./typed";
import { toCond } from "./expr/cond";

export const IX_DISCRIMINATOR = {
  ifxCreateFrame: Buffer.from([IX_DISC_CREATE_FRAME]),
  ifxCloseFrame: Buffer.from([IX_DISC_CLOSE_FRAME]),
  ifxResetFrame: Buffer.from([IX_DISC_RESET_FRAME]),
  ifxLet: Buffer.from([IX_DISC_LET]),
  ifxAssert: Buffer.from([IX_DISC_ASSERT]),
  ifxAssertMulti: Buffer.from([IX_DISC_ASSERT_MULTI]),
  ifxPatchedCpi: Buffer.from([IX_DISC_PATCHED_CPI]),
  ifxIfElse: Buffer.from([IX_DISC_IF_ELSE]),
} as const;

export { ACCOUNT_DISC_FRAME };

export type IxOpts = { programId?: PublicKey };

/** Merge per-ix overrides onto scratch / planner defaults. */
export function mergeIxOpts(
  defaults: IxOpts,
  overrides?: IxOpts
): IxOpts {
  return {
    programId: overrides?.programId ?? defaults.programId ?? DEFAULT_IFX_PROGRAM_ID,
  };
}

export function normalizeRemaining(
  accounts: AccountMeta[] | PublicKey[]
): AccountMeta[] {
  if (accounts.length === 0) return [];
  if (accounts[0] instanceof PublicKey) {
    return (accounts as PublicKey[]).map((pk) => ({
      pubkey: pk,
      isSigner: false,
      isWritable: false,
    }));
  }
  return accounts as AccountMeta[];
}

export interface CreateIxCreateFrameParams extends IxOpts {
  payer: PublicKey;
  frameId: Uint8Array | Buffer;
  authority: PublicKey;
  tapeLen: number;
}

/** Build `ifx_create_frame` instruction (Borsh data; no Anchor Program coder). */
export function createIxCreateFrame(
  params: CreateIxCreateFrameParams
): TransactionInstruction {
  const programId = params.programId ?? DEFAULT_IFX_PROGRAM_ID;
  if (
    params.tapeLen < MIN_TAPE_LEN ||
    params.tapeLen > MAX_FRAME_TAPE_LEN
  ) {
    throw new Error(
      `tapeLen must be in [${MIN_TAPE_LEN}, ${MAX_FRAME_TAPE_LEN}]`
    );
  }
  if (params.frameId.length !== 32) throw new Error("frameId must be 32 bytes");
  if (params.tapeLen > RECOMMENDED_TAPE_LEN_MAX) {
    console.warn(
      `[ifx] create_frame tapeLen=${params.tapeLen} exceeds recommended ` +
        `${RECOMMENDED_TAPE_LEN_MAX} — higher Frame rent and let/reset CU; prefer ` +
        `${RECOMMENDED_TAPE_LEN_MAX} or less unless profiled`
    );
  }
  const [frame] = framePda(params.payer, params.frameId, programId);
  const args = Buffer.alloc(32 + 32 + 4);
  Buffer.from(params.frameId).copy(args, 0);
  params.authority.toBuffer().copy(args, 32);
  args.writeUInt32LE(params.tapeLen, 64);
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.payer, isSigner: true, isWritable: true },
      { pubkey: frame, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([IX_DISCRIMINATOR.ifxCreateFrame, args]),
  });
}

export function createIxCloseFrame(
  frame: PublicKey,
  authority: PublicKey,
  opts: IxOpts = {}
): TransactionInstruction {
  const programId = opts.programId ?? DEFAULT_IFX_PROGRAM_ID;
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: frame, isSigner: false, isWritable: true },
    ],
    data: IX_DISCRIMINATOR.ifxCloseFrame,
  });
}

export function createIxResetFrame(
  frame: PublicKey,
  authority: PublicKey,
  opts: IxOpts = {}
): TransactionInstruction {
  const programId = opts.programId ?? DEFAULT_IFX_PROGRAM_ID;
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: frame, isSigner: false, isWritable: true },
      ...prependWriteAuthorityRemaining(authority),
    ],
    data: IX_DISCRIMINATOR.ifxResetFrame,
  });
}

export function isIxOpts(value: unknown): value is IxOpts {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "programId" in value &&
    !("pubkey" in value)
  );
}

/** Build `ifx_let` (used by {@link FrameScratch.ixLet}). */
export function buildIxLet(
  frame: PublicKey,
  authority: PublicKey,
  args: LetArgs,
  remainingAccounts: AccountMeta[] | PublicKey[] = [],
  opts: IxOpts = {}
): TransactionInstruction {
  const programId = opts.programId ?? DEFAULT_IFX_PROGRAM_ID;
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: frame, isSigner: false, isWritable: true },
      ...prependWriteAuthorityRemaining(
        authority,
        normalizeRemaining(remainingAccounts)
      ),
    ],
    data: Buffer.concat([IX_DISCRIMINATOR.ifxLet, encodeLetArgs(args)]),
  });
}

export const buildIxResetFrame = createIxResetFrame;

export function buildIxAssert(
  frame: PublicKey,
  cond: Cond,
  opts: IxOpts = {}
): TransactionInstruction {
  const programId = opts.programId ?? DEFAULT_IFX_PROGRAM_ID;
  return new TransactionInstruction({
    programId,
    keys: [{ pubkey: frame, isSigner: false, isWritable: false }],
    data: Buffer.concat([IX_DISCRIMINATOR.ifxAssert, encodeExpr(toCond(cond))]),
  });
}

/**
 * Build `ifx_assert_multi` — at least one condition; short-circuits on first failure.
 *
 * Wire allows up to {@link MAX_ASSERT_MULTI_CONDS} conditions; prefer
 * **3–10** per ix to limit tx CU (no on-chain cap). Split larger guard lists across
 * multiple ix or use N× {@link buildIxAssert}.
 */
export function buildIxAssertMulti(
  frame: PublicKey,
  conds: readonly Cond[],
  opts: IxOpts = {}
): TransactionInstruction {
  if (conds.length === 0) {
    throw new Error("ifx_assert_multi requires at least one condition");
  }
  if (conds.length > MAX_ASSERT_MULTI_CONDS) {
    throw new Error(
      `ifx_assert_multi supports at most ${MAX_ASSERT_MULTI_CONDS} conditions (got ${conds.length})`
    );
  }
  if (conds.length > RECOMMENDED_ASSERT_MULTI_MAX) {
    console.warn(
      `[ifx] ifx_assert_multi: ${conds.length} conditions exceeds recommended ` +
        `${RECOMMENDED_ASSERT_MULTI_MAX} per ix — split guards or expect higher tx CU`
    );
  }
  const programId = opts.programId ?? DEFAULT_IFX_PROGRAM_ID;
  return new TransactionInstruction({
    programId,
    keys: [{ pubkey: frame, isSigner: false, isWritable: false }],
    data: Buffer.concat([
      IX_DISCRIMINATOR.ifxAssertMulti,
      encodeAssertMultiArgs({ conds: conds.map((c) => toCond(c)) }),
    ]),
  });
}

/** Unconditional patched CPI (`ifx_patched_cpi`); use {@link cpi}(…).build(). */
export function createIxCpi(
  frame: PublicKey,
  built: CpiWireBuildResult,
  opts: IxOpts = {}
): TransactionInstruction {
  if (!cpiRequiresPatchApply(built.cpi)) {
    throw new Error(
      "ifx_patched_cpi requires at least one patch; for static CPI add the target instruction to the transaction directly, or use arm.cpi(staticCpi(...).staticStep) inside ifx_if_else"
    );
  }
  const programId = opts.programId ?? DEFAULT_IFX_PROGRAM_ID;
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: frame, isSigner: false, isWritable: false },
      ...built.remaining,
    ],
    data: Buffer.concat([
      IX_DISCRIMINATOR.ifxPatchedCpi,
      encodeCpi(built.cpi),
    ]),
  });
}

export function createIxIfElse(
  frame: PublicKey,
  args: IfElseArgs,
  remainingAccounts: AccountMeta[] | PublicKey[] = [],
  opts: IxOpts = {}
): TransactionInstruction {
  const programId = opts.programId ?? DEFAULT_IFX_PROGRAM_ID;
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: frame, isSigner: false, isWritable: false },
      ...normalizeRemaining(remainingAccounts),
    ],
    data: Buffer.concat([IX_DISCRIMINATOR.ifxIfElse, encodeIfElseArgs(args)]),
  });
}
