"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LET_BINDING_NEXT_TAG = exports.LET_BINDING_VARIANT_COUNT = exports.LET_BINDING_VARIANT = void 0;
/**
 * Wire tag order for on-chain [`LetBinding`](../../programs/ifx/src/state/types.rs).
 *
 * **Must match the Rust enum declaration exactly** (tags `0`–`24`). When adding a
 * variant: append here, extend `binding`, `codec` switch, program match arms, IDL, docs.
 */
exports.LET_BINDING_VARIANT = [
    "accountDataSlice",
    "accountLamports",
    "eval",
    "sysvarClockSlot",
    "sysvarClockEpochStartTimestamp",
    "sysvarClockEpoch",
    "sysvarClockLeaderScheduleEpoch",
    "sysvarClockUnixTimestamp",
    "sysvarRentMinimumBalance",
    "splTokenAccountAmount",
    "splTokenAccountDelegatedAmount",
    "splTokenAccountState",
    "splMintSupply",
    "splMintDecimals",
    "splToken2022AccountAmount",
    "splToken2022AccountDelegatedAmount",
    "splToken2022AccountState",
    "splToken2022MintSupply",
    "splToken2022MintDecimals",
    "splToken2022AccountTransferFeeWithheld",
    "splToken2022MintTransferFeeBasisPoints",
    "splToken2022MintTransferFeeMaximum",
    "splToken2022MintWithheldAmount",
    "splToken2022MintDefaultAccountState",
    "accountDataLen",
];
exports.LET_BINDING_VARIANT_COUNT = exports.LET_BINDING_VARIANT.length;
/** Next append-only opcode tag (see `docs/typed-let-bindings.md`). */
exports.LET_BINDING_NEXT_TAG = exports.LET_BINDING_VARIANT_COUNT;
