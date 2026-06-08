package constants

// LetBinding wire tags 0..24 — must match programs/ifx and sdk/src/let-binding-variants.ts.
const (
	LetTagAccountDataSlice = iota
	LetTagAccountLamports
	LetTagEval
	LetTagSysvarClockSlot
	LetTagSysvarClockEpochStartTimestamp
	LetTagSysvarClockEpoch
	LetTagSysvarClockLeaderScheduleEpoch
	LetTagSysvarClockUnixTimestamp
	LetTagSysvarRentMinimumBalance
	LetTagSplTokenAccountAmount
	LetTagSplTokenAccountDelegatedAmount
	LetTagSplTokenAccountState
	LetTagSplMintSupply
	LetTagSplMintDecimals
	LetTagSplToken2022AccountAmount
	LetTagSplToken2022AccountDelegatedAmount
	LetTagSplToken2022AccountState
	LetTagSplToken2022MintSupply
	LetTagSplToken2022MintDecimals
	LetTagSplToken2022AccountTransferFeeWithheld
	LetTagSplToken2022MintTransferFeeBasisPoints
	LetTagSplToken2022MintTransferFeeMaximum
	LetTagSplToken2022MintWithheldAmount
	LetTagSplToken2022MintDefaultAccountState
	LetTagAccountDataLen
)

const LetBindingVariantCount = 25

// ValueType wire tags for AccountDataSlice.ty (Borsh enum order).
const (
	ValueTypeBool = iota
	ValueTypeU8
	ValueTypeU16
	ValueTypeU32
	ValueTypeU64
	ValueTypeU128
	ValueTypeI8
	ValueTypeI16
	ValueTypeI32
	ValueTypeI64
	ValueTypeI128
	ValueTypeF32
	ValueTypeF64
)
