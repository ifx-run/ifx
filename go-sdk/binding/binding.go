// Package binding builds LetBinding wire values.
package binding

import (
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
)

// Node is a sealed LetBinding AST node.
type Node interface {
	isLetBinding()
}

type AccountDataSlice struct {
	ValueTypeTag         uint8
	AccountIndex         uint8
	Offset               uint32
	ExpectedProgramOwner uint8
}

func (AccountDataSlice) isLetBinding() {}

type AccountIndex struct {
	Tag          uint8
	AccountIndex uint8
}

func (AccountIndex) isLetBinding() {}

type Eval struct {
	Expr expr.Node
}

func (Eval) isLetBinding() {}

type RentMinimumBalance struct {
	DataLen uint32
}

func (RentMinimumBalance) isLetBinding() {}

type Empty struct{ Tag uint8 }

func (Empty) isLetBinding() {}

type ConstPubkey struct {
	Bytes [32]byte
}

func (ConstPubkey) isLetBinding() {}

func AccountDataSliceU64(accountIndex, offset, expectedProgramOwner uint8) Node {
	return AccountDataSlice{
		ValueTypeTag:         constants.ValueTypeU64,
		AccountIndex:         accountIndex,
		Offset:               uint32(offset),
		ExpectedProgramOwner: expectedProgramOwner,
	}
}

func AccountLamports(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagAccountLamports, AccountIndex: accountIndex}
}

func AccountDataLen(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagAccountDataLen, AccountIndex: accountIndex}
}

func AccountKey(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagAccountKey, AccountIndex: accountIndex}
}

func ConstPubkeyLiteral(bytes [32]byte) Node {
	return ConstPubkey{Bytes: bytes}
}

func FrameGeneration() Node {
	return Empty{Tag: constants.LetTagFrameGeneration}
}

func FrameIndexCount() Node {
	return Empty{Tag: constants.LetTagFrameIndexCount}
}

func AccountIsSigner(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagAccountIsSigner, AccountIndex: accountIndex}
}

func AccountIsWritable(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagAccountIsWritable, AccountIndex: accountIndex}
}

func StakeDelegationStake(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagStakeDelegationStake, AccountIndex: accountIndex}
}
func StakeDelegationActivationEpoch(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagStakeDelegationActivationEpoch, AccountIndex: accountIndex}
}
func StakeDelegationDeactivationEpoch(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagStakeDelegationDeactivationEpoch, AccountIndex: accountIndex}
}
func StakeLockupUnixTimestamp(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagStakeLockupUnixTimestamp, AccountIndex: accountIndex}
}
func StakeLockupEpoch(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagStakeLockupEpoch, AccountIndex: accountIndex}
}
func StakeAuthorizedStaker(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagStakeAuthorizedStaker, AccountIndex: accountIndex}
}
func StakeAuthorizedWithdrawer(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagStakeAuthorizedWithdrawer, AccountIndex: accountIndex}
}
func StakeDelegationVoter(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagStakeDelegationVoter, AccountIndex: accountIndex}
}

func SplMintIsInitialized(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplMintIsInitialized, AccountIndex: accountIndex}
}
func SplMintMintAuthority(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplMintMintAuthority, AccountIndex: accountIndex}
}
func SplMintFreezeAuthority(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplMintFreezeAuthority, AccountIndex: accountIndex}
}
func SplToken2022MintIsInitialized(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022MintIsInitialized, AccountIndex: accountIndex}
}
func SplToken2022MintMintAuthority(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022MintMintAuthority, AccountIndex: accountIndex}
}
func SplToken2022MintFreezeAuthority(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022MintFreezeAuthority, AccountIndex: accountIndex}
}

func AccountProgramOwner(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagAccountProgramOwner, AccountIndex: accountIndex}
}
func AccountExecutable(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagAccountExecutable, AccountIndex: accountIndex}
}
func AccountRentEpoch(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagAccountRentEpoch, AccountIndex: accountIndex}
}
func SplTokenAccountMint(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplTokenAccountMint, AccountIndex: accountIndex}
}
func SplTokenAccountOwner(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplTokenAccountOwner, AccountIndex: accountIndex}
}
func SplTokenAccountDelegate(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplTokenAccountDelegate, AccountIndex: accountIndex}
}
func SplTokenAccountCloseAuthority(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplTokenAccountCloseAuthority, AccountIndex: accountIndex}
}
func SplTokenAccountIsNative(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplTokenAccountIsNative, AccountIndex: accountIndex}
}
func SplTokenAccountOwnerIsDerived(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplTokenAccountOwnerIsDerived, AccountIndex: accountIndex}
}
func SplToken2022AccountMint(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022AccountMint, AccountIndex: accountIndex}
}
func SplToken2022AccountOwner(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022AccountOwner, AccountIndex: accountIndex}
}
func SplToken2022AccountDelegate(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022AccountDelegate, AccountIndex: accountIndex}
}
func SplToken2022AccountCloseAuthority(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022AccountCloseAuthority, AccountIndex: accountIndex}
}
func SplToken2022AccountIsNative(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022AccountIsNative, AccountIndex: accountIndex}
}
func SplToken2022AccountOwnerIsDerived(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022AccountOwnerIsDerived, AccountIndex: accountIndex}
}
func StakeAccountState(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagStakeAccountState, AccountIndex: accountIndex}
}
func StakeLockupCustodian(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagStakeLockupCustodian, AccountIndex: accountIndex}
}
func StakeRentExemptReserve(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagStakeRentExemptReserve, AccountIndex: accountIndex}
}
func StakeCreditsObserved(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagStakeCreditsObserved, AccountIndex: accountIndex}
}
func StakeStakeFlags(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagStakeStakeFlags, AccountIndex: accountIndex}
}
func UpgradeableProgramDataTag(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagUpgradeableProgramDataTag, AccountIndex: accountIndex}
}
func UpgradeableProgramDataUpgradeAuthority(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagUpgradeableProgramDataUpgradeAuthority, AccountIndex: accountIndex}
}
func UpgradeableProgramProgramDataAddress(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagUpgradeableProgramProgramDataAddress, AccountIndex: accountIndex}
}

func EvalExpr(e expr.Node) Node { return Eval{Expr: e} }

func SysvarClockSlot() Node {
	return Empty{Tag: constants.LetTagSysvarClockSlot}
}
func SysvarClockEpochStartTimestamp() Node {
	return Empty{Tag: constants.LetTagSysvarClockEpochStartTimestamp}
}
func SysvarClockEpoch() Node { return Empty{Tag: constants.LetTagSysvarClockEpoch} }
func SysvarClockLeaderScheduleEpoch() Node {
	return Empty{Tag: constants.LetTagSysvarClockLeaderScheduleEpoch}
}
func SysvarClockUnixTimestamp() Node {
	return Empty{Tag: constants.LetTagSysvarClockUnixTimestamp}
}

func SysvarRentMinimumBalance(dataLen uint32) Node {
	return RentMinimumBalance{DataLen: dataLen}
}

func SplTokenAccountAmount(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplTokenAccountAmount, AccountIndex: accountIndex}
}
func SplTokenAccountDelegatedAmount(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplTokenAccountDelegatedAmount, AccountIndex: accountIndex}
}
func SplTokenAccountState(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplTokenAccountState, AccountIndex: accountIndex}
}
func SplMintSupply(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplMintSupply, AccountIndex: accountIndex}
}
func SplMintDecimals(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplMintDecimals, AccountIndex: accountIndex}
}
func SplToken2022AccountAmount(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022AccountAmount, AccountIndex: accountIndex}
}
func SplToken2022AccountDelegatedAmount(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022AccountDelegatedAmount, AccountIndex: accountIndex}
}
func SplToken2022AccountState(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022AccountState, AccountIndex: accountIndex}
}
func SplToken2022MintSupply(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022MintSupply, AccountIndex: accountIndex}
}
func SplToken2022MintDecimals(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022MintDecimals, AccountIndex: accountIndex}
}
func SplToken2022AccountTransferFeeWithheld(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022AccountTransferFeeWithheld, AccountIndex: accountIndex}
}
func SplToken2022MintTransferFeeBasisPoints(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022MintTransferFeeBasisPoints, AccountIndex: accountIndex}
}
func SplToken2022MintTransferFeeMaximum(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022MintTransferFeeMaximum, AccountIndex: accountIndex}
}
func SplToken2022MintWithheldAmount(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022MintWithheldAmount, AccountIndex: accountIndex}
}
func SplToken2022MintDefaultAccountState(accountIndex uint8) Node {
	return AccountIndex{Tag: constants.LetTagSplToken2022MintDefaultAccountState, AccountIndex: accountIndex}
}

// Sample returns the minimal parity sample for wire tag 0..67 (tests/sdk_let_binding_parity.ts).
func Sample(tag int) Node {
	switch tag {
	case constants.LetTagAccountDataSlice:
		return AccountDataSliceU64(0, 0, 0)
	case constants.LetTagAccountLamports:
		return AccountLamports(0)
	case constants.LetTagAccountDataLen:
		return AccountDataLen(0)
	case constants.LetTagEval:
		return EvalExpr(expr.U64(1))
	case constants.LetTagSysvarClockSlot:
		return SysvarClockSlot()
	case constants.LetTagSysvarClockEpochStartTimestamp:
		return SysvarClockEpochStartTimestamp()
	case constants.LetTagSysvarClockEpoch:
		return SysvarClockEpoch()
	case constants.LetTagSysvarClockLeaderScheduleEpoch:
		return SysvarClockLeaderScheduleEpoch()
	case constants.LetTagSysvarClockUnixTimestamp:
		return SysvarClockUnixTimestamp()
	case constants.LetTagSysvarRentMinimumBalance:
		return SysvarRentMinimumBalance(165)
	case constants.LetTagSplTokenAccountAmount:
		return SplTokenAccountAmount(0)
	case constants.LetTagSplTokenAccountDelegatedAmount:
		return SplTokenAccountDelegatedAmount(0)
	case constants.LetTagSplTokenAccountState:
		return SplTokenAccountState(0)
	case constants.LetTagSplMintSupply:
		return SplMintSupply(0)
	case constants.LetTagSplMintDecimals:
		return SplMintDecimals(0)
	case constants.LetTagSplToken2022AccountAmount:
		return SplToken2022AccountAmount(0)
	case constants.LetTagSplToken2022AccountDelegatedAmount:
		return SplToken2022AccountDelegatedAmount(0)
	case constants.LetTagSplToken2022AccountState:
		return SplToken2022AccountState(0)
	case constants.LetTagSplToken2022MintSupply:
		return SplToken2022MintSupply(0)
	case constants.LetTagSplToken2022MintDecimals:
		return SplToken2022MintDecimals(0)
	case constants.LetTagSplToken2022AccountTransferFeeWithheld:
		return SplToken2022AccountTransferFeeWithheld(0)
	case constants.LetTagSplToken2022MintTransferFeeBasisPoints:
		return SplToken2022MintTransferFeeBasisPoints(0)
	case constants.LetTagSplToken2022MintTransferFeeMaximum:
		return SplToken2022MintTransferFeeMaximum(0)
	case constants.LetTagSplToken2022MintWithheldAmount:
		return SplToken2022MintWithheldAmount(0)
	case constants.LetTagSplToken2022MintDefaultAccountState:
		return SplToken2022MintDefaultAccountState(0)
	case constants.LetTagAccountKey:
		return AccountKey(0)
	case constants.LetTagConstPubkey:
		return ConstPubkeyLiteral([32]byte{})
	case constants.LetTagFrameGeneration:
		return FrameGeneration()
	case constants.LetTagFrameIndexCount:
		return FrameIndexCount()
	case constants.LetTagAccountIsSigner:
		return AccountIsSigner(0)
	case constants.LetTagAccountIsWritable:
		return AccountIsWritable(0)
	case constants.LetTagStakeDelegationStake:
		return StakeDelegationStake(0)
	case constants.LetTagStakeDelegationActivationEpoch:
		return StakeDelegationActivationEpoch(0)
	case constants.LetTagStakeDelegationDeactivationEpoch:
		return StakeDelegationDeactivationEpoch(0)
	case constants.LetTagStakeLockupUnixTimestamp:
		return StakeLockupUnixTimestamp(0)
	case constants.LetTagStakeLockupEpoch:
		return StakeLockupEpoch(0)
	case constants.LetTagStakeAuthorizedStaker:
		return StakeAuthorizedStaker(0)
	case constants.LetTagStakeAuthorizedWithdrawer:
		return StakeAuthorizedWithdrawer(0)
	case constants.LetTagStakeDelegationVoter:
		return StakeDelegationVoter(0)
	case constants.LetTagSplMintIsInitialized:
		return SplMintIsInitialized(0)
	case constants.LetTagSplMintMintAuthority:
		return SplMintMintAuthority(0)
	case constants.LetTagSplMintFreezeAuthority:
		return SplMintFreezeAuthority(0)
	case constants.LetTagSplToken2022MintIsInitialized:
		return SplToken2022MintIsInitialized(0)
	case constants.LetTagSplToken2022MintMintAuthority:
		return SplToken2022MintMintAuthority(0)
	case constants.LetTagSplToken2022MintFreezeAuthority:
		return SplToken2022MintFreezeAuthority(0)
	case constants.LetTagAccountProgramOwner:
		return AccountProgramOwner(0)
	case constants.LetTagAccountExecutable:
		return AccountExecutable(0)
	case constants.LetTagAccountRentEpoch:
		return AccountRentEpoch(0)
	case constants.LetTagSplTokenAccountMint:
		return SplTokenAccountMint(0)
	case constants.LetTagSplTokenAccountOwner:
		return SplTokenAccountOwner(0)
	case constants.LetTagSplTokenAccountDelegate:
		return SplTokenAccountDelegate(0)
	case constants.LetTagSplTokenAccountCloseAuthority:
		return SplTokenAccountCloseAuthority(0)
	case constants.LetTagSplTokenAccountIsNative:
		return SplTokenAccountIsNative(0)
	case constants.LetTagSplTokenAccountOwnerIsDerived:
		return SplTokenAccountOwnerIsDerived(0)
	case constants.LetTagSplToken2022AccountMint:
		return SplToken2022AccountMint(0)
	case constants.LetTagSplToken2022AccountOwner:
		return SplToken2022AccountOwner(0)
	case constants.LetTagSplToken2022AccountDelegate:
		return SplToken2022AccountDelegate(0)
	case constants.LetTagSplToken2022AccountCloseAuthority:
		return SplToken2022AccountCloseAuthority(0)
	case constants.LetTagSplToken2022AccountIsNative:
		return SplToken2022AccountIsNative(0)
	case constants.LetTagSplToken2022AccountOwnerIsDerived:
		return SplToken2022AccountOwnerIsDerived(0)
	case constants.LetTagStakeAccountState:
		return StakeAccountState(0)
	case constants.LetTagStakeLockupCustodian:
		return StakeLockupCustodian(0)
	case constants.LetTagStakeRentExemptReserve:
		return StakeRentExemptReserve(0)
	case constants.LetTagStakeCreditsObserved:
		return StakeCreditsObserved(0)
	case constants.LetTagStakeStakeFlags:
		return StakeStakeFlags(0)
	case constants.LetTagUpgradeableProgramDataTag:
		return UpgradeableProgramDataTag(0)
	case constants.LetTagUpgradeableProgramDataUpgradeAuthority:
		return UpgradeableProgramDataUpgradeAuthority(0)
	case constants.LetTagUpgradeableProgramProgramDataAddress:
		return UpgradeableProgramProgramDataAddress(0)
	default:
		panic("invalid let binding sample tag")
	}
}
