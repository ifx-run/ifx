import { AccountMeta, PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { Cpi, RawCpiPatch } from "./types";
export { rawCpiPatch } from "./patch";
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
export declare function resolveCpiRemaining(programId: PublicKey, ixKeys: AccountMeta[], remaining?: AccountMeta[] | PublicKey[]): {
    accountsStart: number;
    accountsLen: number;
    remaining: AccountMeta[];
};
/**
 * Raw patched CPI: clone template `data`, apply {@link rawCpiPatch} byte overlays at build time.
 * Escape hatch for DEX / custom layouts — prefer {@link structuredCpi} for official ix.
 */
export declare class RawCpiBuilder {
    private readonly programId;
    private readonly ixKeys;
    private readonly data;
    private readonly patches;
    private constructor();
    /** Start from any instruction (e.g. `SystemProgram.transfer` with lamports `0`). */
    static fromInstruction(template: TransactionInstruction, options?: {
        patches?: RawCpiPatch[];
    }): RawCpiBuilder;
    build(remaining?: AccountMeta[] | PublicKey[]): CpiBuildResult;
}
/** @deprecated Use {@link RawCpiBuilder} */
export declare const CpiBuilder: typeof RawCpiBuilder;
/** Shorthand for {@link RawCpiBuilder.fromInstruction}. */
export declare function rawCpi(template: TransactionInstruction, options?: {
    patches?: RawCpiPatch[];
}): RawCpiBuilder;
/** @deprecated Use {@link rawCpi} */
export declare const cpi: typeof rawCpi;
/** Static CPI step for `ifx_if_else`. */
export declare function staticCpi(template: TransactionInstruction, remaining?: AccountMeta[] | PublicKey[]): Pick<CpiBuildResult, "staticStep" | "remaining">;
/** System Program `Transfer` ix data; lamports at byte offset 4 (for `rawCpiPatch`). */
export declare function systemTransferDataTemplate(lamports?: number | bigint): Buffer;
/** Convenience: template transfer with `lamports: 0` for raw patching. */
export declare function systemTransferTemplate(params: {
    fromPubkey: PublicKey;
    toPubkey: PublicKey;
}): TransactionInstruction;
