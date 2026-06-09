// Package typed mirrors @ifx-run/sdk typed.ts — IfxTy, ScratchValue, type inference.
package typed

import (
	"fmt"

	"github.com/ifx-run/ifx/go-sdk/binding"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
)

// IfxTy is a compile-time value kind (mirrors on-chain ValueType).
type IfxTy string

const (
	TyBool IfxTy = "bool"
	TyU8   IfxTy = "u8"
	TyU16  IfxTy = "u16"
	TyU32  IfxTy = "u32"
	TyU64  IfxTy = "u64"
	TyU128 IfxTy = "u128"
	TyI8   IfxTy = "i8"
	TyI16  IfxTy = "i16"
	TyI32  IfxTy = "i32"
	TyI64  IfxTy = "i64"
	TyI128 IfxTy = "i128"
	TyF32  IfxTy = "f32"
	TyF64  IfxTy = "f64"
	TyPubkey IfxTy = "pubkey"
)

// ScratchValue is one planned ifx_let binding plus its frame index.
type ScratchValue struct {
	Binding   binding.Node
	Index     uint8
	Ty        IfxTy
	Remaining []AccountMeta // optional single-let remaining slice
}

// AccountMeta is a deduped remaining account entry.
type AccountMeta struct {
	Pubkey     string // base58
	IsSigner   bool
	IsWritable bool
}

// ValueTypeTag maps IfxTy to wire tag for tape layout.
func ValueTypeTag(ty IfxTy) (uint8, error) {
	switch ty {
	case TyBool:
		return constants.ValueTypeBool, nil
	case TyU8:
		return constants.ValueTypeU8, nil
	case TyU16:
		return constants.ValueTypeU16, nil
	case TyU32:
		return constants.ValueTypeU32, nil
	case TyU64:
		return constants.ValueTypeU64, nil
	case TyU128:
		return constants.ValueTypeU128, nil
	case TyI8:
		return constants.ValueTypeI8, nil
	case TyI16:
		return constants.ValueTypeI16, nil
	case TyI32:
		return constants.ValueTypeI32, nil
	case TyI64:
		return constants.ValueTypeI64, nil
	case TyI128:
		return constants.ValueTypeI128, nil
	case TyF32:
		return constants.ValueTypeF32, nil
	case TyF64:
		return constants.ValueTypeF64, nil
	case TyPubkey:
		return constants.ValueTypePubkey, nil
	default:
		return 0, fmt.Errorf("unknown IfxTy %q", ty)
	}
}

// InferBindingTy returns the frame tape type for a LetBinding.
func InferBindingTy(b binding.Node, indexTypes map[uint8]IfxTy) (IfxTy, error) {
	switch v := b.(type) {
	case binding.AccountDataSlice:
		return valueTypeFromTag(v.ValueTypeTag)
	case binding.Eval:
		return InferExprTy(v.Expr, indexTypes)
	case binding.ConstPubkey:
		return TyPubkey, nil
	case binding.AccountIndex:
		return inferAccountIndexTy(v.Tag)
	case binding.RentMinimumBalance:
		return TyU64, nil
	case binding.Empty:
		return inferEmptyTy(v.Tag)
	default:
		return "", fmt.Errorf("unknown LetBinding %T", b)
	}
}

func inferAccountIndexTy(tag uint8) (IfxTy, error) {
	switch tag {
	case constants.LetTagAccountLamports,
		constants.LetTagSplTokenAccountAmount,
		constants.LetTagSplTokenAccountDelegatedAmount,
		constants.LetTagSplMintSupply,
		constants.LetTagSplToken2022AccountAmount,
		constants.LetTagSplToken2022AccountDelegatedAmount,
		constants.LetTagSplToken2022MintSupply,
		constants.LetTagSplToken2022AccountTransferFeeWithheld,
		constants.LetTagSplToken2022MintTransferFeeMaximum,
		constants.LetTagSplToken2022MintWithheldAmount:
		return TyU64, nil
	case constants.LetTagAccountDataLen:
		return TyU32, nil
	case constants.LetTagSplTokenAccountState,
		constants.LetTagSplMintDecimals,
		constants.LetTagSplToken2022AccountState,
		constants.LetTagSplToken2022MintDecimals,
		constants.LetTagSplToken2022MintDefaultAccountState:
		return TyU8, nil
	case constants.LetTagSplToken2022MintTransferFeeBasisPoints:
		return TyU16, nil
	case constants.LetTagAccountKey:
		return TyPubkey, nil
	default:
		return "", fmt.Errorf("unknown account binding tag %d", tag)
	}
}

func inferEmptyTy(tag uint8) (IfxTy, error) {
	switch tag {
	case constants.LetTagSysvarClockSlot,
		constants.LetTagSysvarClockEpoch,
		constants.LetTagSysvarClockLeaderScheduleEpoch,
		constants.LetTagSysvarRentMinimumBalance:
		return TyU64, nil
	case constants.LetTagSysvarClockEpochStartTimestamp,
		constants.LetTagSysvarClockUnixTimestamp:
		return TyI64, nil
	case constants.LetTagFrameGeneration:
		return TyU64, nil
	case constants.LetTagFrameIndexCount:
		return TyU16, nil
	default:
		return "", fmt.Errorf("unknown sysvar binding tag %d", tag)
	}
}

func valueTypeFromTag(tag uint8) (IfxTy, error) {
	switch tag {
	case constants.ValueTypeBool:
		return TyBool, nil
	case constants.ValueTypeU8:
		return TyU8, nil
	case constants.ValueTypeU16:
		return TyU16, nil
	case constants.ValueTypeU32:
		return TyU32, nil
	case constants.ValueTypeU64:
		return TyU64, nil
	case constants.ValueTypeU128:
		return TyU128, nil
	case constants.ValueTypeI8:
		return TyI8, nil
	case constants.ValueTypeI16:
		return TyI16, nil
	case constants.ValueTypeI32:
		return TyI32, nil
	case constants.ValueTypeI64:
		return TyI64, nil
	case constants.ValueTypeI128:
		return TyI128, nil
	case constants.ValueTypeF32:
		return TyF32, nil
	case constants.ValueTypeF64:
		return TyF64, nil
	case constants.ValueTypePubkey:
		return TyPubkey, nil
	default:
		return "", fmt.Errorf("unknown ValueType tag %d", tag)
	}
}

// InferExprTy infers expression result type (mirrors inferIfxTyFromExpr).
func InferExprTy(n expr.Node, indexTypes map[uint8]IfxTy) (IfxTy, error) {
	switch v := n.(type) {
	case expr.ValueRef:
		ty, ok := indexTypes[v.Index]
		if !ok {
			return "", fmt.Errorf("cannot infer type for Frame ref at index %d; plan with let* first", v.Index)
		}
		return ty, nil
	case expr.ConstBool:
		return TyBool, nil
	case expr.ConstU8:
		return TyU8, nil
	case expr.ConstU16:
		return TyU16, nil
	case expr.ConstU32:
		return TyU32, nil
	case expr.ConstU64:
		return TyU64, nil
	case expr.ConstU128:
		return TyU128, nil
	case expr.ConstI8:
		return TyI8, nil
	case expr.ConstI16:
		return TyI16, nil
	case expr.ConstI32:
		return TyI32, nil
	case expr.ConstI64:
		return TyI64, nil
	case expr.ConstI128:
		return TyI128, nil
	case expr.ConstF32:
		return TyF32, nil
	case expr.ConstF64:
		return TyF64, nil
	case expr.ConstPubkey:
		return TyPubkey, nil
	case expr.Unary:
		switch v.Tag {
		case constants.ExprTagNot, constants.ExprTagIsZero, constants.ExprTagNonZero:
			return TyBool, nil
		case constants.ExprTagAsU64:
			return TyU64, nil
		case constants.ExprTagAsU128:
			return TyU128, nil
		case constants.ExprTagNeg:
			return InferExprTy(v.Operand, indexTypes)
		default:
			return "", fmt.Errorf("unknown unary tag %d", v.Tag)
		}
	case expr.Binary:
		switch v.Tag {
		case constants.ExprTagEq, constants.ExprTagNe, constants.ExprTagGt, constants.ExprTagGe,
			constants.ExprTagLt, constants.ExprTagLe, constants.ExprTagAnd, constants.ExprTagOr:
			return TyBool, nil
		case constants.ExprTagBpsMulFloor, constants.ExprTagBpsMulCeil:
			return TyU64, nil
		default:
			return InferExprTy(v.Lhs, indexTypes)
		}
	case expr.Ternary:
		switch v.Tag {
		case constants.ExprTagSelect:
			lt, err := InferExprTy(v.B, indexTypes)
			if err != nil {
				return "", err
			}
			rt, err := InferExprTy(v.C, indexTypes)
			if err != nil {
				return "", err
			}
			if lt != rt {
				return "", fmt.Errorf("select branch type mismatch: %s vs %s", lt, rt)
			}
			return lt, nil
		default:
			return InferExprTy(v.A, indexTypes)
		}
	default:
		return "", fmt.Errorf("unknown Expr node %T", n)
	}
}
