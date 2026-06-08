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

// Sample returns the minimal parity sample for wire tag 0..24 (tests/sdk_let_binding_parity.ts).
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
	default:
		panic("invalid let binding sample tag")
	}
}
