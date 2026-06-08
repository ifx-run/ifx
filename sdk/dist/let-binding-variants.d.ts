/**
 * Wire tag order for on-chain [`LetBinding`](../../programs/ifx/src/state/types.rs).
 *
 * **Must match the Rust enum declaration exactly** (tags `0`–`24`). When adding a
 * variant: append here, extend `binding`, `codec` switch, program match arms, IDL, docs.
 */
export declare const LET_BINDING_VARIANT: readonly ["accountDataSlice", "accountLamports", "eval", "sysvarClockSlot", "sysvarClockEpochStartTimestamp", "sysvarClockEpoch", "sysvarClockLeaderScheduleEpoch", "sysvarClockUnixTimestamp", "sysvarRentMinimumBalance", "splTokenAccountAmount", "splTokenAccountDelegatedAmount", "splTokenAccountState", "splMintSupply", "splMintDecimals", "splToken2022AccountAmount", "splToken2022AccountDelegatedAmount", "splToken2022AccountState", "splToken2022MintSupply", "splToken2022MintDecimals", "splToken2022AccountTransferFeeWithheld", "splToken2022MintTransferFeeBasisPoints", "splToken2022MintTransferFeeMaximum", "splToken2022MintWithheldAmount", "splToken2022MintDefaultAccountState", "accountDataLen"];
export type LetBindingVariantKey = (typeof LET_BINDING_VARIANT)[number];
export declare const LET_BINDING_VARIANT_COUNT: 25;
/** Next append-only opcode tag (see `docs/typed-let-bindings.md`). */
export declare const LET_BINDING_NEXT_TAG: 25;
