import { PublicKey } from "@solana/web3.js";
/** Localnet / default repo build (`keys/localnet-program-keypair.json`). */
export declare const IFX_LOCALNET_PROGRAM_ID: PublicKey;
/** Devnet deployment (`keys/devnet.program-id`; keypair not in git). */
export declare const IFX_DEVNET_PROGRAM_ID: PublicKey;
/**
 * Default program id when `programId` is omitted from SDK builders.
 *
 * Priority (highest wins): **mainnet → testnet → devnet → localnet**.
 * Until mainnet is deployed, this equals {@link IFX_DEVNET_PROGRAM_ID}.
 *
 * Repo integration tests and local Surfpool must pass
 * {@link IFX_LOCALNET_PROGRAM_ID} explicitly (`planLocalFrame`, constructor, or `IxOpts`).
 */
export declare const DEFAULT_IFX_PROGRAM_ID: PublicKey;
export declare const FRAME_SEED: Buffer<ArrayBuffer>;
/** Minimum `tape_len` at `ifx_create_frame` (matches on-chain `MIN_TAPE_LEN`). */
export declare const MIN_TAPE_LEN = 1;
/** Maximum `Frame::tape` length (bytes). */
export declare const MAX_FRAME_TAPE_LEN = 65535;
/** Maximum bindings on wire (`Value.index` is `u8`: indices `0..=255`). */
export declare const MAX_BINDING_INDEX = 256;
/** Upper bound on `payload_at` table length at create: `min(256, floor(tape_len / 2))`. */
export declare function indexCapForTapeLen(tapeLen: number): number;
/** @deprecated Use {@link MIN_TAPE_LEN}. */
export declare const MIN_MEMORY_LEN = 1;
/** @deprecated Use {@link MAX_FRAME_TAPE_LEN}. */
export declare const MAX_FRAME_MEMORY_LEN = 65535;
/** 1-byte instruction discriminators (must match on-chain `constants.rs`). */
export declare const IX_DISC_CREATE_FRAME = 0;
export declare const IX_DISC_CLOSE_FRAME = 1;
export declare const IX_DISC_RESET_FRAME = 2;
export declare const IX_DISC_LET = 3;
export declare const IX_DISC_ASSERT = 4;
export declare const IX_DISC_ASSERT_MULTI = 5;
export declare const IX_DISC_PATCHED_CPI = 6;
export declare const IX_DISC_IF_ELSE = 7;
/** 1-byte `Frame` account type discriminator. */
export declare const ACCOUNT_DISC_FRAME = 6;
