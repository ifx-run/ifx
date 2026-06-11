package constants

// Expr wire tags 0..51 — must match programs/ifx Expr enum and sdk/src/expr-variants.ts.
const (
	ExprTagValue = iota
	ExprTagConstBool
	ExprTagConstU8
	ExprTagConstU16
	ExprTagConstU32
	ExprTagConstU64
	ExprTagConstU128
	ExprTagConstI8
	ExprTagConstI16
	ExprTagConstI32
	ExprTagConstI64
	ExprTagConstI128
	ExprTagConstF32
	ExprTagConstF64
	ExprTagNot
	ExprTagNeg
	ExprTagIsZero
	ExprTagNonZero
	ExprTagAsU8
	ExprTagAsU16
	ExprTagAsU32
	ExprTagAsU64
	ExprTagAsU128
	ExprTagAsI8
	ExprTagAsI16
	ExprTagAsI32
	ExprTagAsI64
	ExprTagAsI128
	ExprTagAdd
	ExprTagSub
	ExprTagMul
	ExprTagDiv
	ExprTagDivFloor
	ExprTagDivCeil
	ExprTagMin
	ExprTagMax
	ExprTagEq
	ExprTagNe
	ExprTagGt
	ExprTagGe
	ExprTagLt
	ExprTagLe
	ExprTagSaturatingSub
	ExprTagAnd
	ExprTagOr
	ExprTagBpsMulFloor
	ExprTagBpsMulCeil
	ExprTagMulDivFloor
	ExprTagMulDivCeil
	ExprTagClamp
	ExprTagSelect
	ExprTagConstPubkey
)

const ExprVariantCount = 52
