import {
  IX_DISC_ASSERT,
  IX_DISC_ASSERT_MULTI,
  IX_DISC_CLOSE_FRAME,
  IX_DISC_CREATE_FRAME,
  IX_DISC_IF_ELSE,
  IX_DISC_LET,
  IX_DISC_PATCHED_CPI,
  IX_DISC_RESET_FRAME,
} from "./constants";

/** Ifx instruction names in discriminator order (must match on-chain `constants.rs`). */
export const IFX_IX_NAMES = [
  "ifx_create_frame",
  "ifx_close_frame",
  "ifx_reset_frame",
  "ifx_let",
  "ifx_assert",
  "ifx_assert_multi",
  "ifx_patched_cpi",
  "ifx_if_else",
] as const;

export type IfxIxName = (typeof IFX_IX_NAMES)[number];

const DISC_TO_NAME: ReadonlyMap<number, IfxIxName> = new Map([
  [IX_DISC_CREATE_FRAME, "ifx_create_frame"],
  [IX_DISC_CLOSE_FRAME, "ifx_close_frame"],
  [IX_DISC_RESET_FRAME, "ifx_reset_frame"],
  [IX_DISC_LET, "ifx_let"],
  [IX_DISC_ASSERT, "ifx_assert"],
  [IX_DISC_ASSERT_MULTI, "ifx_assert_multi"],
  [IX_DISC_PATCHED_CPI, "ifx_patched_cpi"],
  [IX_DISC_IF_ELSE, "ifx_if_else"],
]);

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
export function decodeIfxInstruction(
  data: Buffer | Uint8Array
): DecodedIfxInstruction {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (buf.length < 1) {
    throw new Error("Ifx instruction data is empty");
  }
  const discriminator = buf[0]!;
  const name = DISC_TO_NAME.get(discriminator);
  if (!name) {
    throw new Error(`unknown Ifx instruction discriminator: ${discriminator}`);
  }
  return {
    name,
    discriminator,
    data: buf,
    payload: buf.subarray(1),
  };
}

/** Short hint string for logs / tx inspectors (e.g. `ifx_let`). */
export function ifxIxHint(data: Buffer | Uint8Array): string | undefined {
  try {
    return decodeIfxInstruction(data).name;
  } catch {
    return undefined;
  }
}
