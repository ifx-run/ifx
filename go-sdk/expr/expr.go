// Package expr builds on-chain Expr trees (wire IR).
package expr

import (
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

func Ref(index uint8) Node { return ValueRef{Index: index} }

func Bool(v bool) Node { return ConstBool(v) }
func U8(v uint8) Node  { return ConstU8(v) }
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

func Not(op Node) Node     { return Unary{Tag: constants.ExprTagNot, Operand: op} }
func Neg(op Node) Node     { return Unary{Tag: constants.ExprTagNeg, Operand: op} }
func IsZero(op Node) Node  { return Unary{Tag: constants.ExprTagIsZero, Operand: op} }
func NonZero(op Node) Node { return Unary{Tag: constants.ExprTagNonZero, Operand: op} }
func AsU8(op Node) Node   { return Unary{Tag: constants.ExprTagAsU8, Operand: op} }
func AsU16(op Node) Node  { return Unary{Tag: constants.ExprTagAsU16, Operand: op} }
func AsU32(op Node) Node  { return Unary{Tag: constants.ExprTagAsU32, Operand: op} }
func AsU64(op Node) Node   { return Unary{Tag: constants.ExprTagAsU64, Operand: op} }
func AsU128(op Node) Node  { return Unary{Tag: constants.ExprTagAsU128, Operand: op} }
func AsI8(op Node) Node   { return Unary{Tag: constants.ExprTagAsI8, Operand: op} }
func AsI16(op Node) Node  { return Unary{Tag: constants.ExprTagAsI16, Operand: op} }
func AsI32(op Node) Node  { return Unary{Tag: constants.ExprTagAsI32, Operand: op} }
func AsI64(op Node) Node  { return Unary{Tag: constants.ExprTagAsI64, Operand: op} }
func AsI128(op Node) Node { return Unary{Tag: constants.ExprTagAsI128, Operand: op} }

func Add(a, b Node) Node          { return Binary{Tag: constants.ExprTagAdd, Lhs: a, Rhs: b} }
func Sub(a, b Node) Node          { return Binary{Tag: constants.ExprTagSub, Lhs: a, Rhs: b} }
func Mul(a, b Node) Node          { return Binary{Tag: constants.ExprTagMul, Lhs: a, Rhs: b} }
func Div(a, b Node) Node          { return Binary{Tag: constants.ExprTagDiv, Lhs: a, Rhs: b} }
func DivFloor(a, b Node) Node     { return Binary{Tag: constants.ExprTagDivFloor, Lhs: a, Rhs: b} }
func DivCeil(a, b Node) Node      { return Binary{Tag: constants.ExprTagDivCeil, Lhs: a, Rhs: b} }
func Min(a, b Node) Node          { return Binary{Tag: constants.ExprTagMin, Lhs: a, Rhs: b} }
func Max(a, b Node) Node          { return Binary{Tag: constants.ExprTagMax, Lhs: a, Rhs: b} }
func Eq(a, b Node) Node           { return Binary{Tag: constants.ExprTagEq, Lhs: a, Rhs: b} }
func Ne(a, b Node) Node           { return Binary{Tag: constants.ExprTagNe, Lhs: a, Rhs: b} }
func Gt(a, b Node) Node           { return Binary{Tag: constants.ExprTagGt, Lhs: a, Rhs: b} }
func Ge(a, b Node) Node           { return Binary{Tag: constants.ExprTagGe, Lhs: a, Rhs: b} }
func Lt(a, b Node) Node           { return Binary{Tag: constants.ExprTagLt, Lhs: a, Rhs: b} }
func Le(a, b Node) Node           { return Binary{Tag: constants.ExprTagLe, Lhs: a, Rhs: b} }
func SaturatingSub(a, b Node) Node { return Binary{Tag: constants.ExprTagSaturatingSub, Lhs: a, Rhs: b} }
func And(a, b Node) Node          { return Binary{Tag: constants.ExprTagAnd, Lhs: a, Rhs: b} }
func Or(a, b Node) Node           { return Binary{Tag: constants.ExprTagOr, Lhs: a, Rhs: b} }

// BpsMulFloor is ⌊amount × bps / 10_000⌋. amount must be U64; bps may be U8/U16/U32/U64
// (promoted on-chain). Result is U64.
func BpsMulFloor(a, b Node) Node  { return Binary{Tag: constants.ExprTagBpsMulFloor, Lhs: a, Rhs: b} }

// BpsMulCeil is like BpsMulFloor with ceiling division.
func BpsMulCeil(a, b Node) Node   { return Binary{Tag: constants.ExprTagBpsMulCeil, Lhs: a, Rhs: b} }

// MulDivFloor is ⌊a × b / c⌋. a and b must share type U64 or U128; c may be the same
// or any narrower unsigned. Result type follows a.
func MulDivFloor(a, b, c Node) Node { return Ternary{Tag: constants.ExprTagMulDivFloor, A: a, B: b, C: c} }

// MulDivCeil is like MulDivFloor with ceiling division.
func MulDivCeil(a, b, c Node) Node  { return Ternary{Tag: constants.ExprTagMulDivCeil, A: a, B: b, C: c} }
func Clamp(v, lo, hi Node) Node      { return Ternary{Tag: constants.ExprTagClamp, A: v, B: lo, C: hi} }
func Select(cond, thenExpr, elseExpr Node) Node {
	return Ternary{Tag: constants.ExprTagSelect, A: cond, B: thenExpr, C: elseExpr}
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
