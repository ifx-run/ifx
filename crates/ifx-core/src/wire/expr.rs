//! Flat [`Expr`] tree — Borsh tag 0–51 (see `docs/implementation.md` §5).

use super::value::Value;

/// Flat expression tree: one wire tag per operator (no nested `Unary`/`Binary` shells).
///
/// Variant order is the Borsh discriminant (0–51). See `docs/implementation.md` §5.
///
/// Uses `borsh` derives (not `#[derive(AnchorSerialize)]`) so we can supply a
/// non-recursive `IdlBuild` impl under `idl-build` without stack overflow.
#[derive(borsh::BorshSerialize, borsh::BorshDeserialize, Clone, Debug)]
pub enum Expr {
    /// Prior binding at `index`. **→ stored [`ValueType`](super::value_type::ValueType).**
    Value(Value),
    /// Literal. **→ `Bool`.**
    ConstBool(bool),
    /// Literal. **→ `U8`.**
    ConstU8(u8),
    /// Literal. **→ `U16`.**
    ConstU16(u16),
    /// Literal. **→ `U32`.**
    ConstU32(u32),
    /// Literal. **→ `U64`.**
    ConstU64(u64),
    /// Literal. **→ `U128`.**
    ConstU128(u128),
    /// Literal. **→ `I8`.**
    ConstI8(i8),
    /// Literal. **→ `I16`.**
    ConstI16(i16),
    /// Literal. **→ `I32`.**
    ConstI32(i32),
    /// Literal. **→ `I64`.**
    ConstI64(i64),
    /// Literal. **→ `I128`.**
    ConstI128(i128),
    /// Literal. **→ `F32`.**
    ConstF32(f32),
    /// Literal. **→ `F64`.**
    ConstF64(f64),
    /// Logical not (operand must be `Bool`). **→ `Bool`.**
    Not { operand: Box<Expr> },
    /// Arithmetic negation (signed integer or float operand). **→ operand type.**
    Neg { operand: Box<Expr> },
    /// `operand == 0` for integer types. **→ `Bool`.**
    IsZero { operand: Box<Expr> },
    /// `operand != 0` for integer types. **→ `Bool`.**
    NonZero { operand: Box<Expr> },
    /// Integer cast → `u8` (see `apply_cast`). **→ `U8`.**
    AsU8 { operand: Box<Expr> },
    /// Integer cast → `u16`. **→ `U16`.**
    AsU16 { operand: Box<Expr> },
    /// Integer cast → `u32`. **→ `U32`.**
    AsU32 { operand: Box<Expr> },
    /// Integer cast → `u64`. **→ `U64`.**
    AsU64 { operand: Box<Expr> },
    /// Integer cast → `u128`. **→ `U128`.**
    AsU128 { operand: Box<Expr> },
    /// Integer cast → `i8` (signed truncate). **→ `I8`.**
    AsI8 { operand: Box<Expr> },
    /// Integer cast → `i16`. **→ `I16`.**
    AsI16 { operand: Box<Expr> },
    /// Integer cast → `i32`. **→ `I32`.**
    AsI32 { operand: Box<Expr> },
    /// Integer cast → `i64`. **→ `I64`.**
    AsI64 { operand: Box<Expr> },
    /// Integer cast → `i128`. **→ `I128`.**
    AsI128 { operand: Box<Expr> },
    /// Addition (lhs/rhs same arithmetic type). **→ lhs type.**
    Add {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Subtraction. **→ lhs type.**
    Sub {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Multiplication. **→ lhs type.**
    Mul {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Truncating division. **→ lhs type.**
    Div {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Floor division (`⌊lhs / rhs⌋`). **→ lhs type.**
    DivFloor {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Ceiling division (`⌈lhs / rhs⌉`). **→ lhs type.**
    DivCeil {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Minimum of lhs/rhs. **→ lhs type.**
    Min {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Maximum of lhs/rhs. **→ lhs type.**
    Max {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Equality (lhs/rhs same type). **→ `Bool`.**
    Eq {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Inequality. **→ `Bool`.**
    Ne {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Greater than. **→ `Bool`.**
    Gt {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Greater or equal. **→ `Bool`.**
    Ge {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Less than. **→ `Bool`.**
    Lt {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Less or equal. **→ `Bool`.**
    Le {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Subtraction saturating at type minimum (`0` for unsigned). **→ lhs type.**
    SaturatingSub {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Logical and (both operands `Bool`). **→ `Bool`.**
    And {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Logical or (both operands `Bool`). **→ `Bool`.**
    Or {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// `⌊amount × bps / 10_000⌋`. **→ `U64`.**
    BpsMulFloor {
        amount: Box<Expr>,
        bps: Box<Expr>,
    },
    /// `⌈amount × bps / 10_000⌉`. **→ `U64`.**
    BpsMulCeil {
        amount: Box<Expr>,
        bps: Box<Expr>,
    },
    /// `⌊a × b / c⌋` (`a`, `b`, `c` same type). **→ `a` type.**
    MulDivFloor {
        a: Box<Expr>,
        b: Box<Expr>,
        c: Box<Expr>,
    },
    /// `⌈a × b / c⌉`. **→ `a` type.**
    MulDivCeil {
        a: Box<Expr>,
        b: Box<Expr>,
        c: Box<Expr>,
    },
    /// Clamp `value` to `[lo, hi]` (all same type). **→ `value` type.**
    Clamp {
        value: Box<Expr>,
        lo: Box<Expr>,
        hi: Box<Expr>,
    },
    /// `cond ? then_expr : else_expr` (`cond` → `Bool`; branches same type). **→ branch type.**
    Select {
        cond: Box<Expr>,
        then_expr: Box<Expr>,
        else_expr: Box<Expr>,
    },
    /// Literal. **→ `Pubkey`.**
    ConstPubkey([u8; 32]),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn value_wire_tag_is_0() {
        let bytes = borsh::to_vec(&Expr::Value(Value { index: 0 })).unwrap();
        assert_eq!(bytes, [0, 0]);
    }

    #[test]
    fn const_bool_wire_matches_sdk() {
        let bytes = borsh::to_vec(&Expr::ConstBool(true)).unwrap();
        assert_eq!(bytes, [1, 1]);
    }

    #[test]
    fn add_wire_tag_is_28() {
        let expr = Expr::Add {
            lhs: Box::new(Expr::ConstU64(1)),
            rhs: Box::new(Expr::ConstU64(1)),
        };
        let bytes = borsh::to_vec(&expr).unwrap();
        assert_eq!(bytes[0], 28);
    }
}
