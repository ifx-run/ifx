//! Wire [`Expr`] builders (1:1 with on-chain / `@ifx-run/sdk` `expr`).

use ifx_core::wire::{Expr, Value};

use crate::typed::ScratchValue;

pub fn r(s: &ScratchValue) -> Expr {
    Expr::Value(Value { index: s.index })
}

pub fn bool(v: bool) -> Expr {
    Expr::ConstBool(v)
}

pub fn u8(v: u8) -> Expr {
    Expr::ConstU8(v)
}

pub fn u16(v: u16) -> Expr {
    Expr::ConstU16(v)
}

pub fn u32(v: u32) -> Expr {
    Expr::ConstU32(v)
}

pub fn u64(v: u64) -> Expr {
    Expr::ConstU64(v)
}

pub fn u128(v: u128) -> Expr {
    Expr::ConstU128(v)
}

pub fn i8(v: i8) -> Expr {
    Expr::ConstI8(v)
}

pub fn i16(v: i16) -> Expr {
    Expr::ConstI16(v)
}

pub fn i32(v: i32) -> Expr {
    Expr::ConstI32(v)
}

pub fn i64(v: i64) -> Expr {
    Expr::ConstI64(v)
}

pub fn i128(v: i128) -> Expr {
    Expr::ConstI128(v)
}

pub fn f32(v: f32) -> Expr {
    Expr::ConstF32(v)
}

pub fn f64(v: f64) -> Expr {
    Expr::ConstF64(v)
}

pub fn pubkey(bytes: [u8; 32]) -> Expr {
    Expr::ConstPubkey(bytes)
}

macro_rules! unary {
    ($fn:ident, $variant:ident) => {
        pub fn $fn(operand: Expr) -> Expr {
            Expr::$variant {
                operand: Box::new(operand),
            }
        }
    };
}

unary!(not, Not);
unary!(neg, Neg);
unary!(is_zero, IsZero);
unary!(non_zero, NonZero);
unary!(as_u8, AsU8);
unary!(as_u16, AsU16);
unary!(as_u32, AsU32);
unary!(as_u64, AsU64);
unary!(as_u128, AsU128);
unary!(as_i8, AsI8);
unary!(as_i16, AsI16);
unary!(as_i32, AsI32);
unary!(as_i64, AsI64);
unary!(as_i128, AsI128);

macro_rules! binary {
    ($fn:ident, $variant:ident) => {
        pub fn $fn(lhs: Expr, rhs: Expr) -> Expr {
            Expr::$variant {
                lhs: Box::new(lhs),
                rhs: Box::new(rhs),
            }
        }
    };
}

binary!(add, Add);
binary!(sub, Sub);
binary!(mul, Mul);
binary!(div, Div);
binary!(div_floor, DivFloor);
binary!(div_ceil, DivCeil);
binary!(min, Min);
binary!(max, Max);
binary!(eq, Eq);
binary!(ne, Ne);
binary!(gt, Gt);
binary!(ge, Ge);
binary!(lt, Lt);
binary!(le, Le);
binary!(saturating_sub, SaturatingSub);
binary!(and, And);
binary!(or, Or);

pub fn bps_mul_floor(amount: Expr, bps: Expr) -> Expr {
    Expr::BpsMulFloor {
        amount: Box::new(amount),
        bps: Box::new(bps),
    }
}

pub fn bps_mul_ceil(amount: Expr, bps: Expr) -> Expr {
    Expr::BpsMulCeil {
        amount: Box::new(amount),
        bps: Box::new(bps),
    }
}

macro_rules! ternary {
    ($fn:ident, $variant:ident) => {
        pub fn $fn(a: Expr, b: Expr, c: Expr) -> Expr {
            Expr::$variant {
                a: Box::new(a),
                b: Box::new(b),
                c: Box::new(c),
            }
        }
    };
}

ternary!(mul_div_floor, MulDivFloor);
ternary!(mul_div_ceil, MulDivCeil);

pub fn clamp(value: Expr, lo: Expr, hi: Expr) -> Expr {
    Expr::Clamp {
        value: Box::new(value),
        lo: Box::new(lo),
        hi: Box::new(hi),
    }
}

pub fn select(cond: Expr, then_expr: Expr, else_expr: Expr) -> Expr {
    Expr::Select {
        cond: Box::new(cond),
        then_expr: Box::new(then_expr),
        else_expr: Box::new(else_expr),
    }
}
