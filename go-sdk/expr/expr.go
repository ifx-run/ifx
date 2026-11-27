// Package expr builds on-chain Expr trees (wire IR).
package expr

import (
	"fmt"
	"math/big"

	"github.com/ifx-run/ifx/go-sdk/constants"
)

// Node is a sealed Expr AST node.
type Node interface {
	isExpr()
}

type ValueRef struct{ Index uint8 }

func (ValueRef) isExpr() {}

type ConstBool bool

func (ConstBool) isExpr() {}

type ConstU8 uint8

func (ConstU8) isExpr() {}

type ConstU16 uint16

func (ConstU16) isExpr() {}

type ConstU32 uint32

func (ConstU32) isExpr() {}

type ConstU64 uint64

func (ConstU64) isExpr() {}

type ConstU128 struct{ V *big.Int }

func (ConstU128) isExpr() {}

type ConstI8 int8

func (ConstI8) isExpr() {}

type ConstI16 int16

func (ConstI16) isExpr() {}

type ConstI32 int32

func (ConstI32) isExpr() {}

type ConstI64 int64

func (ConstI64) isExpr() {}

type ConstI128 struct{ V *big.Int }

func (ConstI128) isExpr() {}

type ConstF32 float32

func (ConstF32) isExpr() {}

type ConstF64 float64

func (ConstF64) isExpr() {}

type ConstPubkey struct {
	Bytes [32]byte
}

func (ConstPubkey) isExpr() {}

type Unary struct {
	Tag     uint8
	Operand Node
}

func (Unary) isExpr() {}

type Binary struct {
	Tag uint8
	Lhs Node
	Rhs Node
}

func (Binary) isExpr() {}

type Ternary struct {
	Tag uint8
	A   Node
	B   Node
	C   Node
}

func (Ternary) isExpr() {}

// indexed is implemented by typed.ScratchValue. This package does not import typed.
type indexed interface {
	BindingIndex() uint8
}

func operand(v any) Node {
	switch x := v.(type) {
	case Node:
		return x
	case indexed:
		return ValueRef{Index: x.BindingIndex()}
	case nil:
		panic("expr: nil operand")
	default:
		panic(fmt.Sprintf("expr: operand must be expr.Node or a planned binding (typed.ScratchValue), got %T", v))
	}
}

func refIndex(v any) (uint8, bool) {
	switch x := v.(type) {
	case uint8:
		return x, true
	case int:
		if x >= 0 && x <= 255 {
			return uint8(x), true
		}
	case int8:
		if x >= 0 {
			return uint8(x), true
		}
	case int16:
		if x >= 0 && x <= 255 {
			return uint8(x), true
		}
	case int32:
		if x >= 0 && x <= 255 {
			return uint8(x), true
		}
	case int64:
		if x >= 0 && x <= 255 {
			return uint8(x), true
		}
	case uint:
		if x <= 255 {
			return uint8(x), true
		}
	case uint16:
		if x <= 255 {
			return uint8(x), true
		}
	case uint32:
		if x <= 255 {
			return uint8(x), true
		}
	case uint64:
		if x <= 255 {
			return uint8(x), true
		}
	}
	return 0, false
}

// Ref is a tape binding. Pass a planned value (typed.ScratchValue).
// A raw index (expr.Ref(0)) is for codec tests; untyped constants still work.
func Ref(v any) Node {
	if idx, ok := refIndex(v); ok {
		return ValueRef{Index: idx}
	}
	switch x := v.(type) {
	case indexed:
		return ValueRef{Index: x.BindingIndex()}
	case ValueRef:
		return x
	default:
		panic(fmt.Sprintf("expr: Ref wants a planned binding or an index, got %T", v))
	}
}

func Bool(v bool) Node  { return ConstBool(v) }
func U8(v uint8) Node   { return ConstU8(v) }
func U16(v uint16) Node { return ConstU16(v) }
func U32(v uint32) Node { return ConstU32(v) }
func U64(v uint64) Node { return ConstU64(v) }

func U128(v uint64) Node {
	return ConstU128{V: new(big.Int).SetUint64(v)}
}

func U128Big(v *big.Int) Node {
	return ConstU128{V: new(big.Int).Set(v)}
}

func I8(v int8) Node   { return ConstI8(v) }
func I16(v int16) Node { return ConstI16(v) }
func I32(v int32) Node { return ConstI32(v) }
func I64(v int64) Node { return ConstI64(v) }

func I128(v int64) Node {
	return ConstI128{V: big.NewInt(v)}
}

func I128Big(v *big.Int) Node {
	return ConstI128{V: new(big.Int).Set(v)}
}

func F32(v float32) Node { return ConstF32(v) }
func F64(v float64) Node { return ConstF64(v) }

func Pubkey(bytes [32]byte) Node { return ConstPubkey{Bytes: bytes} }

func Not(op any) Node     { return Unary{Tag: constants.ExprTagNot, Operand: operand(op)} }
func Neg(op any) Node     { return Unary{Tag: constants.ExprTagNeg, Operand: operand(op)} }
func IsZero(op any) Node  { return Unary{Tag: constants.ExprTagIsZero, Operand: operand(op)} }
func NonZero(op any) Node { return Unary{Tag: constants.ExprTagNonZero, Operand: operand(op)} }
func AsU8(op any) Node    { return Unary{Tag: constants.ExprTagAsU8, Operand: operand(op)} }
func AsU16(op any) Node   { return Unary{Tag: constants.ExprTagAsU16, Operand: operand(op)} }
func AsU32(op any) Node   { return Unary{Tag: constants.ExprTagAsU32, Operand: operand(op)} }
func AsU64(op any) Node   { return Unary{Tag: constants.ExprTagAsU64, Operand: operand(op)} }
func AsU128(op any) Node  { return Unary{Tag: constants.ExprTagAsU128, Operand: operand(op)} }
func AsI8(op any) Node    { return Unary{Tag: constants.ExprTagAsI8, Operand: operand(op)} }
func AsI16(op any) Node   { return Unary{Tag: constants.ExprTagAsI16, Operand: operand(op)} }
func AsI32(op any) Node   { return Unary{Tag: constants.ExprTagAsI32, Operand: operand(op)} }
func AsI64(op any) Node   { return Unary{Tag: constants.ExprTagAsI64, Operand: operand(op)} }
func AsI128(op any) Node  { return Unary{Tag: constants.ExprTagAsI128, Operand: operand(op)} }

func bin(tag uint8, a, b any) Node {
	return Binary{Tag: tag, Lhs: operand(a), Rhs: operand(b)}
}

func Add(a, b any) Node           { return bin(constants.ExprTagAdd, a, b) }
func Sub(a, b any) Node           { return bin(constants.ExprTagSub, a, b) }
func Mul(a, b any) Node           { return bin(constants.ExprTagMul, a, b) }
func Div(a, b any) Node           { return bin(constants.ExprTagDiv, a, b) }
func DivFloor(a, b any) Node      { return bin(constants.ExprTagDivFloor, a, b) }
func DivCeil(a, b any) Node       { return bin(constants.ExprTagDivCeil, a, b) }
func Min(a, b any) Node           { return bin(constants.ExprTagMin, a, b) }
func Max(a, b any) Node           { return bin(constants.ExprTagMax, a, b) }
func Eq(a, b any) Node            { return bin(constants.ExprTagEq, a, b) }
func Ne(a, b any) Node            { return bin(constants.ExprTagNe, a, b) }
func Gt(a, b any) Node            { return bin(constants.ExprTagGt, a, b) }
func Ge(a, b any) Node            { return bin(constants.ExprTagGe, a, b) }
func Lt(a, b any) Node            { return bin(constants.ExprTagLt, a, b) }
func Le(a, b any) Node            { return bin(constants.ExprTagLe, a, b) }
func SaturatingSub(a, b any) Node { return bin(constants.ExprTagSaturatingSub, a, b) }
func And(a, b any) Node           { return bin(constants.ExprTagAnd, a, b) }
func Or(a, b any) Node            { return bin(constants.ExprTagOr, a, b) }

// BpsMulFloor is ⌊amount × bps / 10_000⌋. amount must be U64; bps may be U8/U16/U32/U64
// (promoted on-chain). Result is U64.
func BpsMulFloor(a, b any) Node { return bin(constants.ExprTagBpsMulFloor, a, b) }

// BpsMulCeil is like BpsMulFloor with ceiling division.
func BpsMulCeil(a, b any) Node { return bin(constants.ExprTagBpsMulCeil, a, b) }

func tern(tag uint8, a, b, c any) Node {
	return Ternary{Tag: tag, A: operand(a), B: operand(b), C: operand(c)}
}

// MulDivFloor is ⌊a × b / c⌋. a and b must share type U64 or U128; c may be the same
// or any narrower unsigned. Result type follows a.
func MulDivFloor(a, b, c any) Node { return tern(constants.ExprTagMulDivFloor, a, b, c) }

// MulDivCeil is like MulDivFloor with ceiling division.
func MulDivCeil(a, b, c any) Node { return tern(constants.ExprTagMulDivCeil, a, b, c) }
func Clamp(v, lo, hi any) Node    { return tern(constants.ExprTagClamp, v, lo, hi) }
func Select(cond, thenExpr, elseExpr any) Node {
	return tern(constants.ExprTagSelect, cond, thenExpr, elseExpr)
}

// Sample returns the minimal parity sample for wire tag index 0..51 (tests/sdk_expr_parity.ts).
func Sample(tag int) Node {
	u64 := U64(1)
	u128 := U128(2)
	b := Bool(true)
	switch tag {
	case 0:
		return Ref(0)
	case 1:
		return Bool(false)
	case 2:
		return U8(1)
	case 3:
		return U16(1)
	case 4:
		return U32(1)
	case 5:
		return u64
	case 6:
		return u128
	case 7:
		return I8(-1)
	case 8:
		return I16(-1)
	case 9:
		return I32(-1)
	case 10:
		return I64(-1)
	case 11:
		return I128(-1)
	case 12:
		return F32(1.5)
	case 13:
		return F64(1.5)
	case 14:
		return Not(b)
	case 15:
		return Neg(I64(-3))
	case 16:
		return IsZero(u64)
	case 17:
		return NonZero(u64)
	case 18:
		return AsU8(U32(1000))
	case 19:
		return AsU16(U32(1000))
	case 20:
		return AsU32(u64)
	case 21:
		return AsU64(u128)
	case 22:
		return AsU128(u64)
	case 23:
		return AsI8(I32(-3))
	case 24:
		return AsI16(I32(-3))
	case 25:
		return AsI32(I64(-3))
	case 26:
		return AsI64(I64(-3))
	case 27:
		return AsI128(I64(-3))
	case 28:
		return Add(u64, u64)
	case 29:
		return Sub(u64, u64)
	case 30:
		return Mul(u64, u64)
	case 31:
		return Div(u64, u64)
	case 32:
		return DivFloor(u64, u64)
	case 33:
		return DivCeil(u64, u64)
	case 34:
		return Min(u64, u64)
	case 35:
		return Max(u64, u64)
	case 36:
		return Eq(u64, u64)
	case 37:
		return Ne(u64, u64)
	case 38:
		return Gt(u64, u64)
	case 39:
		return Ge(u64, u64)
	case 40:
		return Lt(u64, u64)
	case 41:
		return Le(u64, u64)
	case 42:
		return SaturatingSub(u64, u64)
	case 43:
		return And(b, b)
	case 44:
		return Or(b, b)
	case 45:
		return BpsMulFloor(u64, u64)
	case 46:
		return BpsMulCeil(u64, u64)
	case 47:
		return MulDivFloor(u64, u64, u64)
	case 48:
		return MulDivCeil(u64, u64, u64)
	case 49:
		return Clamp(u64, u64, u64)
	case 50:
		return Select(b, u64, u64)
	case 51:
		return Pubkey([32]byte{})
	default:
		panic("invalid expr sample tag")
	}
}
