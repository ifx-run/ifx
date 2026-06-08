import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

import type { Cpi, CpiPatch } from "./types";
import { patchListPatched, patchListStatic } from "./patch-list";
export { cpiPatch } from "./patch";

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

export type CpiBuildResult = {
  /** Wire step with patches applied at invoke time. */
  cpi: Cpi;
  /** Static step (empty `PatchList`) for `ifx_if_else`. */
  staticStep: Cpi;
  /** Remaining accounts for `createIxCpi` / `createIxIfElse` (program first in slice). */
  remaining: AccountMeta[];
};

/**
 * Semi-built CPI: clone `data` from a template {@link TransactionInstruction},
 * apply {@link cpiPatch} at `build()` time, and derive account layout for ifx remaining.
 */
export class CpiBuilder {
  private readonly programId: PublicKey;
  private readonly ixKeys: AccountMeta[];
  private readonly data: Buffer;
  private readonly patches: CpiPatch[];

  private constructor(
    template: TransactionInstruction,
    patches: CpiPatch[]
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
    options?: { patches?: CpiPatch[] }
  ): CpiBuilder {
    return new CpiBuilder(template, options?.patches ?? []);
  }

  /**
   * Finalize wire args + ifx `remaining` account list.
   *
   * With no args: `[programId, ...template.keys]` from the template instruction (preferred).
   * Custom `remaining` only when the CPI slice sits inside a longer list; must include
   * `programId` then `template.keys` in order. Avoid `PublicKey[]` — signer/writable are lost.
   */
  build(remaining?: AccountMeta[] | PublicKey[]): CpiBuildResult {
    const metas =
      remaining === undefined
        ? [
            {
              pubkey: this.programId,
              isSigner: false,
              isWritable: false,
            },
            ...this.ixKeys,
          ]
        : normalizeRemaining(remaining);

    const accountsStart = metas.findIndex((m) =>
      m.pubkey.equals(this.programId)
    );
    if (accountsStart < 0) {
      throw new Error("remaining must include the CPI program id");
    }

    const slice = metas.slice(accountsStart);
    if (slice.length < 1 + this.ixKeys.length) {
      throw new Error(
        `remaining slice too short: need program + ${this.ixKeys.length} account(s)`
      );
    }

    for (let i = 0; i < this.ixKeys.length; i++) {
      const exp = this.ixKeys[i];
      const got = slice[1 + i];
      if (!got.pubkey.equals(exp.pubkey)) {
        throw new Error(
          `account mismatch at remaining[${accountsStart + 1 + i}]: expected ${exp.pubkey.toBase58()}`
        );
      }
    }

    const accountsLen = slice.length;
    const stepBase = {
      accountsStart,
      accountsLen,
      data: this.data,
    };

    return {
      cpi: {
        ...stepBase,
        patches: patchListPatched(this.patches),
      },
      staticStep: {
        ...stepBase,
        patches: patchListStatic(),
      },
      remaining: metas,
    };
  }
}

/** Shorthand for {@link CpiBuilder.fromInstruction}. */
export function cpi(
  template: TransactionInstruction,
  options?: { patches?: CpiPatch[] }
): CpiBuilder {
  return CpiBuilder.fromInstruction(template, options);
}

/** Static CPI step for `ifx_if_else` — empty `PatchList` (`U16LenVec` count 0). */
export function staticCpi(
  template: TransactionInstruction,
  remaining?: AccountMeta[] | PublicKey[]
): Pick<CpiBuildResult, "staticStep" | "remaining"> {
  const built = CpiBuilder.fromInstruction(template).build(remaining);
  return {
    staticStep: built.staticStep,
    remaining: built.remaining,
  };
}

/** System Program `Transfer` ix data; lamports at byte offset 4 (for `cpiPatch`). */
export function systemTransferDataTemplate(
  lamports: number | bigint = 0
): Buffer {
  const buf = Buffer.alloc(12);
  buf.writeUInt32LE(2, 0);
  buf.writeBigUInt64LE(BigInt(lamports), 4);
  return buf;
}

/** Convenience: template transfer with `lamports: 0` for patching. */
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
