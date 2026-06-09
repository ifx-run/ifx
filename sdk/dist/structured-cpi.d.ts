import { AccountMeta, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { type CpiWireBuildResult } from "./cpi";
import type { StructuredCpiPatch } from "./structured-cpi-patch";
import type { CpiStructured } from "./types";
/** Low-level wire step — prefer {@link structuredCpi} from an official instruction. */
export type StructuredCpiWireInput = {
    accountsStart: number;
    accountsLen: number;
    patch: StructuredCpiPatch;
};
/** Build a structured CPI wire step (manual account slice — for codec tests). */
export declare function structuredCpiStep(input: StructuredCpiWireInput): CpiStructured;
export type StructuredCpiOptions = {
    /** Full patch or body without `tag` (tag inferred from template ix). */
    patch: StructuredCpiPatch | Record<string, unknown>;
};
/** Patch, `{ patch }`, or untagged body (e.g. `{ amountDecimals: … }`). */
export type StructuredCpiInput = StructuredCpiPatch | StructuredCpiOptions | Record<string, unknown>;
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
export declare class StructuredCpiBuilder {
    private readonly programId;
    private readonly ixKeys;
    private readonly patch;
    private constructor();
    static fromInstruction(template: TransactionInstruction, input: StructuredCpiInput): StructuredCpiBuilder;
    build(remaining?: AccountMeta[] | PublicKey[]): CpiWireBuildResult;
}
/** Shorthand for {@link StructuredCpiBuilder.fromInstruction}. */
export declare function structuredCpi(template: TransactionInstruction, input: StructuredCpiInput): StructuredCpiBuilder;
export { inferStructuredCpiPatchTag, isStructuredCpiPatch, resolveStructuredCpiPatch, } from "./structured-cpi-infer";
export type { StructuredCpiPatchTagName } from "./structured-cpi-infer";
export declare function encodeStructuredCpiWire(step: CpiStructured): Buffer;
export { structuredCpiPatch, asValue, encodeStructuredCpiPatchPayload, structuredCpiPatchWireTag, STRUCTURED_CPI_PATCH_WIRE, } from "./structured-cpi-patch";
export type { StructuredCpiPatch } from "./structured-cpi-patch";
