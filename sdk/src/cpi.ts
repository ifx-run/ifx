import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

import type { Cpi, RawCpiPatch } from "./types";
import { patchListPatched } from "./patch-list";
export { rawCpiPatch } from "./patch";

function normalizeRemaining(
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

/** Result of {@link RawCpiBuilder.build} / {@link StructuredCpiBuilder.build} for `ixCpi`. */
export type CpiWireBuildResult = {
  cpi: Cpi;
  remaining: AccountMeta[];
};

export type CpiBuildResult = CpiWireBuildResult & {
  /** Static step for `ifx_if_else`. */
  staticStep: Cpi;
};

/**
 * Derive `accountsStart` / `accountsLen` + validate CPI account slice in `remaining`.
 *
 * Default `remaining`: `[programId, ...template.keys]`. Pass a longer list when merging
 * multiple CPI steps (e.g. transfer + syncNative in one `ifx_if_else` arm).
 */
export function resolveCpiRemaining(
  programId: PublicKey,
  ixKeys: AccountMeta[],
  remaining?: AccountMeta[] | PublicKey[]
): { accountsStart: number; accountsLen: number; remaining: AccountMeta[] } {
  const metas =
    remaining === undefined
      ? [
          {
            pubkey: programId,
            isSigner: false,
            isWritable: false,
          },
          ...ixKeys,
        ]
      : normalizeRemaining(remaining);

  const accountsStart = metas.findIndex((m) => m.pubkey.equals(programId));
  if (accountsStart < 0) {
    throw new Error("remaining must include the CPI program id");
  }

  const slice = metas.slice(accountsStart);
  if (slice.length < 1 + ixKeys.length) {
    throw new Error(
      `remaining slice too short: need program + ${ixKeys.length} account(s)`
    );
  }

  for (let i = 0; i < ixKeys.length; i++) {
    const exp = ixKeys[i];
    const got = slice[1 + i];
    if (!got.pubkey.equals(exp.pubkey)) {
      throw new Error(
        `account mismatch at remaining[${accountsStart + 1 + i}]: expected ${exp.pubkey.toBase58()}`
      );
    }
  }

  return {
    accountsStart,
    accountsLen: slice.length,
    remaining: metas,
  };
}

/**
 * Raw patched CPI: clone template `data`, apply {@link rawCpiPatch} byte overlays at build time.
 * Escape hatch for DEX / custom layouts — prefer {@link structuredCpi} for official ix.
 */
export class RawCpiBuilder {
  private readonly programId: PublicKey;
  private readonly ixKeys: AccountMeta[];
  private readonly data: Buffer;
  private readonly patches: RawCpiPatch[];

  private constructor(
    template: TransactionInstruction,
    patches: RawCpiPatch[]
  ) {
    this.programId = template.programId;
    this.ixKeys = template.keys.map((k) => ({
      pubkey: k.pubkey,
      isSigner: k.isSigner,
      isWritable: k.isWritable,
    }));
    this.data = Buffer.from(template.data);
    this.patches = patches;
  }

  /** Start from any instruction (e.g. `SystemProgram.transfer` with lamports `0`). */
  static fromInstruction(
    template: TransactionInstruction,
    options?: { patches?: RawCpiPatch[] }
  ): RawCpiBuilder {
    return new RawCpiBuilder(template, options?.patches ?? []);
  }

  build(remaining?: AccountMeta[] | PublicKey[]): CpiBuildResult {
    const { accountsStart, accountsLen, remaining: metas } = resolveCpiRemaining(
      this.programId,
      this.ixKeys,
      remaining
    );

    const stepBase = {
      accountsStart,
      accountsLen,
      data: this.data,
    };

    return {
      cpi: {
        kind: "rawPatched",
        ...stepBase,
        patches: patchListPatched(this.patches),
      },
      staticStep: {
        kind: "static",
        ...stepBase,
      },
      remaining: metas,
    };
  }
}

/** @deprecated Use {@link RawCpiBuilder} */
export const CpiBuilder = RawCpiBuilder;

/** Shorthand for {@link RawCpiBuilder.fromInstruction}. */
export function rawCpi(
  template: TransactionInstruction,
  options?: { patches?: RawCpiPatch[] }
): RawCpiBuilder {
  return RawCpiBuilder.fromInstruction(template, options);
}

/** @deprecated Use {@link rawCpi} */
export const cpi = rawCpi;

/** Static CPI step for `ifx_if_else`. */
export function staticCpi(
  template: TransactionInstruction,
  remaining?: AccountMeta[] | PublicKey[]
): Pick<CpiBuildResult, "staticStep" | "remaining"> {
  const built = RawCpiBuilder.fromInstruction(template).build(remaining);
  return {
    staticStep: built.staticStep,
    remaining: built.remaining,
  };
}

/** System Program `Transfer` ix data; lamports at byte offset 4 (for `rawCpiPatch`). */
export function systemTransferDataTemplate(
  lamports: number | bigint = 0
): Buffer {
  const buf = Buffer.alloc(12);
  buf.writeUInt32LE(2, 0);
  buf.writeBigUInt64LE(BigInt(lamports), 4);
  return buf;
}

/** Convenience: template transfer with `lamports: 0` for raw patching. */
export function systemTransferTemplate(params: {
  fromPubkey: PublicKey;
  toPubkey: PublicKey;
}): TransactionInstruction {
  return SystemProgram.transfer({
    fromPubkey: params.fromPubkey,
    toPubkey: params.toPubkey,
    lamports: 0,
  });
}
