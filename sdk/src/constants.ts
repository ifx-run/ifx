import {PublicKey} from "@solana/web3.js";

/** Localnet / default repo build (`keys/localnet-program-keypair.json`). */
export const IFX_LOCALNET_PROGRAM_ID = new PublicKey(
    "ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD"
);

/** Devnet deployment (`keys/devnet.program-id`; keypair not in git). */
export const IFX_DEVNET_PROGRAM_ID = new PublicKey(
  "ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc"
);

/**
 * Default program id when `programId` is omitted from SDK builders.
 *
 * Priority (highest wins): **mainnet → testnet → devnet → localnet**.
 * Until mainnet is deployed, this equals {@link IFX_DEVNET_PROGRAM_ID}.
 *
 * Repo integration tests and local Surfpool must pass
 * {@link IFX_LOCALNET_PROGRAM_ID} explicitly (`planLocalFrame`, constructor, or `IxOpts`).
 */
export const DEFAULT_IFX_PROGRAM_ID = IFX_DEVNET_PROGRAM_ID;

export const FRAME_SEED = Buffer.from("frame");

/** Minimum `tape_len` at `ifx_create_frame` (matches on-chain `MIN_TAPE_LEN`). */
export const MIN_TAPE_LEN = 1;
/** Maximum `Frame::tape` length (bytes). */
export const MAX_FRAME_TAPE_LEN = 65_535;
/** Maximum bindings on wire (`Value.index` is `u8`: indices `0..=255`). */
export const MAX_BINDING_INDEX = 256;

/** Upper bound on `payload_at` table length at create: `min(256, floor(tape_len / 2))`. */
export function indexCapForTapeLen(tapeLen: number): number {
    if (!Number.isInteger(tapeLen) || tapeLen < MIN_TAPE_LEN) {
        throw new Error(`tapeLen must be an integer >= ${MIN_TAPE_LEN}`);
    }
    const optimistic = Math.floor(tapeLen / 2);
    return Math.min(MAX_BINDING_INDEX, optimistic);
}

/** @deprecated Use {@link MIN_TAPE_LEN}. */
export const MIN_MEMORY_LEN = MIN_TAPE_LEN;
/** @deprecated Use {@link MAX_FRAME_TAPE_LEN}. */
export const MAX_FRAME_MEMORY_LEN = MAX_FRAME_TAPE_LEN;

/** 1-byte instruction discriminators (must match on-chain `constants.rs`). */
export const IX_DISC_CREATE_FRAME = 0;
export const IX_DISC_CLOSE_FRAME = 1;
export const IX_DISC_RESET_FRAME = 2;
export const IX_DISC_LET = 3;
export const IX_DISC_ASSERT = 4;
export const IX_DISC_ASSERT_MULTI = 5;
export const IX_DISC_PATCHED_CPI = 6;
export const IX_DISC_IF_ELSE = 7;

/** 1-byte `Frame` account type discriminator. */
export const ACCOUNT_DISC_FRAME = 6;
