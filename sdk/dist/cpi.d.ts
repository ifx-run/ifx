import { AccountMeta, PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { Cpi, CpiPatch } from "./types";
export { cpiPatch } from "./patch";
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
export declare class CpiBuilder {
    private readonly programId;
    private readonly ixKeys;
    private readonly data;
    private readonly patches;
    private constructor();
    /** Start from any instruction (e.g. `SystemProgram.transfer` with lamports `0`). */
    static fromInstruction(template: TransactionInstruction, options?: {
        patches?: CpiPatch[];
    }): CpiBuilder;
    /**
     * Finalize wire args + ifx `remaining` account list.
     *
     * With no args: `[programId, ...template.keys]` from the template instruction (preferred).
     * Custom `remaining` only when the CPI slice sits inside a longer list; must include
     * `programId` then `template.keys` in order. Avoid `PublicKey[]` — signer/writable are lost.
     */
    build(remaining?: AccountMeta[] | PublicKey[]): CpiBuildResult;
}
/** Shorthand for {@link CpiBuilder.fromInstruction}. */
export declare function cpi(template: TransactionInstruction, options?: {
    patches?: CpiPatch[];
}): CpiBuilder;
/** Static CPI step for `ifx_if_else` — empty `PatchList` (`U16LenVec` count 0). */
export declare function staticCpi(template: TransactionInstruction, remaining?: AccountMeta[] | PublicKey[]): Pick<CpiBuildResult, "staticStep" | "remaining">;
/** System Program `Transfer` ix data; lamports at byte offset 4 (for `cpiPatch`). */
export declare function systemTransferDataTemplate(lamports?: number | bigint): Buffer;
/** Convenience: template transfer with `lamports: 0` for patching. */
export declare function systemTransferTemplate(params: {
    fromPubkey: PublicKey;
    toPubkey: PublicKey;
}): TransactionInstruction;
