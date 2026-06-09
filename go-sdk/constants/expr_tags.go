package constants

// Expr wire tags 0..42 — must match programs/ifx Expr enum and sdk/src/expr-variants.ts.
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
	ExprTagAsU64
	ExprTagAsU128
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

const ExprVariantCount = 44
