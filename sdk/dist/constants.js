"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCOUNT_DISC_FRAME = exports.IX_DISC_IF_ELSE = exports.IX_DISC_PATCHED_CPI = exports.IX_DISC_ASSERT_MULTI = exports.IX_DISC_ASSERT = exports.IX_DISC_LET = exports.IX_DISC_RESET_FRAME = exports.IX_DISC_CLOSE_FRAME = exports.IX_DISC_CREATE_FRAME = exports.MAX_FRAME_MEMORY_LEN = exports.MIN_MEMORY_LEN = exports.MAX_BINDING_INDEX = exports.MAX_FRAME_TAPE_LEN = exports.MIN_TAPE_LEN = exports.FRAME_SEED = exports.DEFAULT_IFX_PROGRAM_ID = exports.IFX_DEVNET_PROGRAM_ID = exports.IFX_LOCALNET_PROGRAM_ID = void 0;
exports.indexCapForTapeLen = indexCapForTapeLen;
const web3_js_1 = require("@solana/web3.js");
/** Localnet / default repo build (`keys/localnet-program-keypair.json`). */
exports.IFX_LOCALNET_PROGRAM_ID = new web3_js_1.PublicKey("ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD");
/** Devnet deployment (`keys/devnet.program-id`; keypair not in git). */
exports.IFX_DEVNET_PROGRAM_ID = new web3_js_1.PublicKey("ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc");
/**
 * Default program id when `programId` is omitted from SDK builders.
 *
 * Priority (highest wins): **mainnet → testnet → devnet → localnet**.
 * Until mainnet is deployed, this equals {@link IFX_DEVNET_PROGRAM_ID}.
 *
 * Repo integration tests and local Surfpool must pass
 * {@link IFX_LOCALNET_PROGRAM_ID} explicitly (`planLocalFrame`, constructor, or `IxOpts`).
 */
exports.DEFAULT_IFX_PROGRAM_ID = exports.IFX_DEVNET_PROGRAM_ID;
exports.FRAME_SEED = Buffer.from("frame");
/** Minimum `tape_len` at `ifx_create_frame` (matches on-chain `MIN_TAPE_LEN`). */
exports.MIN_TAPE_LEN = 1;
/** Maximum `Frame::tape` length (bytes). */
exports.MAX_FRAME_TAPE_LEN = 65535;
/** Maximum bindings on wire (`Value.index` is `u8`: indices `0..=255`). */
exports.MAX_BINDING_INDEX = 256;
/** Upper bound on `payload_at` table length at create: `min(256, floor(tape_len / 2))`. */
function indexCapForTapeLen(tapeLen) {
    if (!Number.isInteger(tapeLen) || tapeLen < exports.MIN_TAPE_LEN) {
        throw new Error(`tapeLen must be an integer >= ${exports.MIN_TAPE_LEN}`);
    }
    const optimistic = Math.floor(tapeLen / 2);
    return Math.min(exports.MAX_BINDING_INDEX, optimistic);
}
/** @deprecated Use {@link MIN_TAPE_LEN}. */
exports.MIN_MEMORY_LEN = exports.MIN_TAPE_LEN;
/** @deprecated Use {@link MAX_FRAME_TAPE_LEN}. */
exports.MAX_FRAME_MEMORY_LEN = exports.MAX_FRAME_TAPE_LEN;
/** 1-byte instruction discriminators (must match on-chain `constants.rs`). */
exports.IX_DISC_CREATE_FRAME = 0;
exports.IX_DISC_CLOSE_FRAME = 1;
exports.IX_DISC_RESET_FRAME = 2;
exports.IX_DISC_LET = 3;
exports.IX_DISC_ASSERT = 4;
exports.IX_DISC_ASSERT_MULTI = 5;
exports.IX_DISC_PATCHED_CPI = 6;
exports.IX_DISC_IF_ELSE = 7;
/** 1-byte `Frame` account type discriminator. */
exports.ACCOUNT_DISC_FRAME = 6;
