/** Ifx instruction names in discriminator order (must match on-chain `constants.rs`). */
export declare const IFX_IX_NAMES: readonly ["ifx_create_frame", "ifx_close_frame", "ifx_reset_frame", "ifx_let", "ifx_assert", "ifx_assert_multi", "ifx_patched_cpi", "ifx_if_else"];
export type IfxIxName = (typeof IFX_IX_NAMES)[number];
/** Result of {@link decodeIfxInstruction}. */
export type DecodedIfxInstruction = {
    name: IfxIxName;
    discriminator: number;
    /** Full instruction data (including 1-byte discriminator). */
    data: Buffer;
    /** Bytes after the discriminator. */
    payload: Buffer;
};
/**
 * Decode the 1-byte Ifx instruction discriminator from wire `data`.
 * Does not fully deserialize args — use for inspection / debugging.
 */
export declare function decodeIfxInstruction(data: Buffer | Uint8Array): DecodedIfxInstruction;
/** Short hint string for logs / tx inspectors (e.g. `ifx_let`). */
export declare function ifxIxHint(data: Buffer | Uint8Array): string | undefined;
