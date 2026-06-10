import {
  AccountMeta,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";

import { resolveCpiRemaining, type CpiWireBuildResult } from "./cpi";
import type { StructuredCpiPatch } from "./structured-cpi-patch";
import {
  encodeStructuredCpiPatch,
  structuredCpiPatchWireTag,
} from "./structured-cpi-patch";
import {
  isStructuredCpiPatch,
  resolveStructuredCpiPatch,
} from "./structured-cpi-infer";
import type { CpiStructured } from "./types";

/** Low-level wire step — prefer {@link structuredCpi} from an official instruction. */
export type StructuredCpiWireInput = {
  accountsStart: number;
  accountsLen: number;
  patch: StructuredCpiPatch;
};

/** Build a structured CPI wire step (manual account slice — for codec tests). */
export function structuredCpiStep(input: StructuredCpiWireInput): CpiStructured {
  return {
    kind: "structured",
    accountsStart: input.accountsStart,
    accountsLen: input.accountsLen,
    patch: input.patch,
  };
}

export type StructuredCpiOptions = {
  /** Full patch or body without `tag` (tag inferred from template ix). */
  patch: StructuredCpiPatch | Record<string, unknown>;
};

/** Patch, `{ patch }`, or untagged body (e.g. `{ amountDecimals: … }`). */
export type StructuredCpiInput =
  | StructuredCpiPatch
  | StructuredCpiOptions
  | Record<string, unknown>;

function normalizeStructuredCpiPatch(
  template: TransactionInstruction,
  input: StructuredCpiInput
): StructuredCpiPatch {
  if (isStructuredCpiPatch(input)) {
    return input;
  }
  if (typeof input === "object" && input !== null && "patch" in input) {
    const inner = (input as StructuredCpiOptions).patch;
    return isStructuredCpiPatch(inner)
      ? inner
      : resolveStructuredCpiPatch(template, inner);
  }
  return resolveStructuredCpiPatch(template, input);
}

/**
 * Structured CPI from an official SDK instruction — same account ergonomics as {@link cpi}.
 *
 * @example
 * ```ts
 * const built = structuredCpi(transferCheckedIx, {
 *   patch: structuredCpiPatch.tokenTransferChecked.amountOnly(amount, 9),
 * }).build();
 * tx.add(scratch.ixCpi(built));
 * ```
 */
export class StructuredCpiBuilder {
  private readonly programId: PublicKey;
  private readonly ixKeys: AccountMeta[];
  private readonly patch: StructuredCpiPatch;

  private constructor(
    template: TransactionInstruction,
    input: StructuredCpiInput
  ) {
    this.programId = template.programId;
    this.ixKeys = template.keys.map((k) => ({
      pubkey: k.pubkey,
      isSigner: k.isSigner,
      isWritable: k.isWritable,
    }));
    this.patch = normalizeStructuredCpiPatch(template, input);
  }

  static fromInstruction(
    template: TransactionInstruction,
    input: StructuredCpiInput
  ): StructuredCpiBuilder {
    return new StructuredCpiBuilder(template, input);
  }

  build(remaining?: AccountMeta[] | PublicKey[]): CpiWireBuildResult {
    const { accountsStart, accountsLen, remaining: metas } = resolveCpiRemaining(
      this.programId,
      this.ixKeys,
      remaining
    );

    const cpi: CpiStructured = {
      kind: "structured",
      accountsStart,
      accountsLen,
      patch: this.patch,
    };

    return { cpi, remaining: metas };
  }
}

/** Shorthand for {@link StructuredCpiBuilder.fromInstruction}. */
export function structuredCpi(
  template: TransactionInstruction,
  input: StructuredCpiInput
): StructuredCpiBuilder {
  return StructuredCpiBuilder.fromInstruction(template, input);
}

export {
  inferStructuredCpiPatchTag,
  isStructuredCpiPatch,
  resolveStructuredCpiPatch,
} from "./structured-cpi-infer";
export type { StructuredCpiPatchTagName } from "./structured-cpi-infer";

export function encodeStructuredCpiWire(step: CpiStructured): Buffer {
  return Buffer.concat([
    Buffer.from([2, step.accountsStart, step.accountsLen]),
    encodeStructuredCpiPatch(step.patch),
  ]);
}

export {
  structuredCpiPatch,
  asValue,
  encodeStructuredCpiPatch,
  encodeStructuredCpiPatchPayload,
  structuredCpiPatchWireTag,
  STRUCTURED_CPI_PATCH_WIRE,
} from "./structured-cpi-patch";
export type { StructuredCpiPatch } from "./structured-cpi-patch";
