import { TransactionInstruction } from "@solana/web3.js";
import type { StructuredCpiPatch } from "./structured-cpi-patch";
export type StructuredCpiPatchTagName = StructuredCpiPatch["tag"];
/**
 * Infer `StructuredCpiPatch.tag` from an official SDK instruction template.
 * Returns null when the program / opcode is not in the structured registry.
 */
export declare function inferStructuredCpiPatchTag(template: TransactionInstruction): StructuredCpiPatchTagName | null;
export declare function isStructuredCpiPatch(value: unknown): value is StructuredCpiPatch;
/** Merge inferred tag with a patch body that omits `tag`. */
export declare function resolveStructuredCpiPatch(template: TransactionInstruction, input: StructuredCpiPatch | Record<string, unknown>): StructuredCpiPatch;
