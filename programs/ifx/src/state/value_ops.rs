use anchor_lang::prelude::*;

use crate::error::ErrorCode;

use super::types::ValueType;
use super::value_codec::{decode_typed, encode_typed, TypedValue, TypedValueResultExt, ValueBytes};

const BPS_DENOM: u64 = 10_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ArithOp {
    Add,
    Sub,
    Mul,
    Div,
    Min,
    Max,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum CompareOp {
    Eq,
    Ne,
    Gt,
    Ge,
    Lt,
    Le,
}

pub(crate) fn apply_arith(
    ty: ValueType,
    op: ArithOp,
    lhs: &[u8],
    rhs: &[u8],
) -> Result<ValueBytes> {
    require!(ty.supports_arithmetic(), ErrorCode::UnsupportedBinaryOp);
    let l = decode_typed(ty, lhs)?;
    let r = decode_typed(ty, rhs)?;
    let out = match (ty, op, l, r) {
        (ValueType::U8, op, TypedValue::U8(a), TypedValue::U8(b)) => {
            TypedValue::U8(integer_arith(op, a, b)?)
        }
        (ValueType::U16, op, TypedValue::U16(a), TypedValue::U16(b)) => {
            TypedValue::U16(integer_arith(op, a, b)?)
        }
        (ValueType::U32, op, TypedValue::U32(a), TypedValue::U32(b)) => {
            TypedValue::U32(integer_arith(op, a, b)?)
        }
        (ValueType::U64, op, TypedValue::U64(a), TypedValue::U64(b)) => {
            TypedValue::U64(integer_arith(op, a, b)?)
        }
        (ValueType::U128, op, TypedValue::U128(a), TypedValue::U128(b)) => {
            TypedValue::U128(integer_arith(op, a, b)?)
        }
        (ValueType::I8, op, TypedValue::I8(a), TypedValue::I8(b)) => {
            TypedValue::I8(integer_arith(op, a, b)?)
        }
        (ValueType::I16, op, TypedValue::I16(a), TypedValue::I16(b)) => {
            TypedValue::I16(integer_arith(op, a, b)?)
        }
        (ValueType::I32, op, TypedValue::I32(a), TypedValue::I32(b)) => {
            TypedValue::I32(integer_arith(op, a, b)?)
        }
        (ValueType::I64, op, TypedValue::I64(a), TypedValue::I64(b)) => {
            TypedValue::I64(integer_arith(op, a, b)?)
        }
        (ValueType::I128, op, TypedValue::I128(a), TypedValue::I128(b)) => {
            TypedValue::I128(integer_arith(op, a, b)?)
        }
        (ValueType::F32, op, TypedValue::F32(a), TypedValue::F32(b)) => {
            TypedValue::F32(apply_float(op, a, b)?)
        }
        (ValueType::F64, op, TypedValue::F64(a), TypedValue::F64(b)) => {
            TypedValue::F64(apply_float(op, a, b)?)
        }
        _ => return Err(ErrorCode::UnsupportedBinaryOp.into()),
    };
    encode_typed(ty, out)
}

pub fn apply_div_floor(ty: ValueType, lhs: &[u8], rhs: &[u8]) -> Result<ValueBytes> {
    require!(ty.supports_arithmetic(), ErrorCode::UnsupportedBinaryOp);
    let l = decode_typed(ty, lhs)?;
    let r = decode_typed(ty, rhs)?;
    let out = match (ty, l, r) {
        (ValueType::U64, TypedValue::U64(a), TypedValue::U64(b)) => {
            require!(b != 0, ErrorCode::DivisionByZero);
            TypedValue::U64(a / b)
        }
        (ValueType::U128, TypedValue::U128(a), TypedValue::U128(b)) => {
            require!(b != 0, ErrorCode::DivisionByZero);
            TypedValue::U128(a / b)
        }
        (ValueType::U8, TypedValue::U8(a), TypedValue::U8(b)) => {
            require!(b != 0, ErrorCode::DivisionByZero);
            TypedValue::U8(a / b)
        }
        (ValueType::U16, TypedValue::U16(a), TypedValue::U16(b)) => {
            require!(b != 0, ErrorCode::DivisionByZero);
            TypedValue::U16(a / b)
        }
        (ValueType::U32, TypedValue::U32(a), TypedValue::U32(b)) => {
            require!(b != 0, ErrorCode::DivisionByZero);
            TypedValue::U32(a / b)
        }
        (ValueType::I64, TypedValue::I64(a), TypedValue::I64(b)) => {
            require!(b != 0, ErrorCode::DivisionByZero);
            TypedValue::I64(a.div_euclid(b))
        }
        (ValueType::I128, TypedValue::I128(a), TypedValue::I128(b)) => {
            require!(b != 0, ErrorCode::DivisionByZero);
            TypedValue::I128(a.div_euclid(b))
        }
        (ValueType::F32, TypedValue::F32(a), TypedValue::F32(b)) => {
            require!(b != 0.0, ErrorCode::DivisionByZero);
            require!(a.is_finite() && b.is_finite(), ErrorCode::FloatUnordered);
            TypedValue::F32((a / b).floor())
        }
        (ValueType::F64, TypedValue::F64(a), TypedValue::F64(b)) => {
            require!(b != 0.0, ErrorCode::DivisionByZero);
            require!(a.is_finite() && b.is_finite(), ErrorCode::FloatUnordered);
            TypedValue::F64((a / b).floor())
        }
        _ => return Err(ErrorCode::UnsupportedBinaryOp.into()),
    };
    encode_typed(ty, out)
}

pub fn apply_div_ceil(ty: ValueType, lhs: &[u8], rhs: &[u8]) -> Result<ValueBytes> {
    require!(ty.supports_arithmetic(), ErrorCode::UnsupportedBinaryOp);
    let l = decode_typed(ty, lhs)?;
    let r = decode_typed(ty, rhs)?;
    let out = match (ty, l, r) {
        (ValueType::U64, TypedValue::U64(a), TypedValue::U64(b)) => {
            require!(b != 0, ErrorCode::DivisionByZero);
            TypedValue::U64(a.div_ceil(b))
        }
        (ValueType::U128, TypedValue::U128(a), TypedValue::U128(b)) => {
            require!(b != 0, ErrorCode::DivisionByZero);
            TypedValue::U128(a.div_ceil(b))
        }
        (ValueType::U8, TypedValue::U8(a), TypedValue::U8(b)) => {
            require!(b != 0, ErrorCode::DivisionByZero);
            TypedValue::U8(a.div_ceil(b))
        }
        (ValueType::U16, TypedValue::U16(a), TypedValue::U16(b)) => {
            require!(b != 0, ErrorCode::DivisionByZero);
            TypedValue::U16(a.div_ceil(b))
        }
        (ValueType::U32, TypedValue::U32(a), TypedValue::U32(b)) => {
            require!(b != 0, ErrorCode::DivisionByZero);
            TypedValue::U32(a.div_ceil(b))
        }
        (ValueType::I8, TypedValue::I8(_), TypedValue::I8(_))
        | (ValueType::I16, TypedValue::I16(_), TypedValue::I16(_))
        | (ValueType::I32, TypedValue::I32(_), TypedValue::I32(_))
        | (ValueType::I64, TypedValue::I64(_), TypedValue::I64(_))
        | (ValueType::I128, TypedValue::I128(_), TypedValue::I128(_)) => {
            return Err(ErrorCode::UnsupportedBinaryOp.into());
        }
        (ValueType::F32, TypedValue::F32(a), TypedValue::F32(b)) => {
            require!(b != 0.0, ErrorCode::DivisionByZero);
            require!(a.is_finite() && b.is_finite(), ErrorCode::FloatUnordered);
            TypedValue::F32((a / b).ceil())
        }
        (ValueType::F64, TypedValue::F64(a), TypedValue::F64(b)) => {
            require!(b != 0.0, ErrorCode::DivisionByZero);
            require!(a.is_finite() && b.is_finite(), ErrorCode::FloatUnordered);
            TypedValue::F64((a / b).ceil())
        }
        _ => return Err(ErrorCode::UnsupportedBinaryOp.into()),
    };
    encode_typed(ty, out)
}

pub fn apply_saturating_sub(ty: ValueType, lhs: &[u8], rhs: &[u8]) -> Result<ValueBytes> {
    require!(ty.supports_arithmetic(), ErrorCode::UnsupportedBinaryOp);
    let l = decode_typed(ty, lhs)?;
    let r = decode_typed(ty, rhs)?;
    let out = match (ty, l, r) {
        (ValueType::U8, TypedValue::U8(a), TypedValue::U8(b)) => TypedValue::U8(a.saturating_sub(b)),
        (ValueType::U16, TypedValue::U16(a), TypedValue::U16(b)) => {
            TypedValue::U16(a.saturating_sub(b))
        }
        (ValueType::U32, TypedValue::U32(a), TypedValue::U32(b)) => {
            TypedValue::U32(a.saturating_sub(b))
        }
        (ValueType::U64, TypedValue::U64(a), TypedValue::U64(b)) => {
            TypedValue::U64(a.saturating_sub(b))
        }
        (ValueType::U128, TypedValue::U128(a), TypedValue::U128(b)) => {
            TypedValue::U128(a.saturating_sub(b))
        }
        (ValueType::I8, TypedValue::I8(a), TypedValue::I8(b)) => TypedValue::I8(a.saturating_sub(b)),
        (ValueType::I16, TypedValue::I16(a), TypedValue::I16(b)) => {
            TypedValue::I16(a.saturating_sub(b))
        }
        (ValueType::I32, TypedValue::I32(a), TypedValue::I32(b)) => {
            TypedValue::I32(a.saturating_sub(b))
        }
        (ValueType::I64, TypedValue::I64(a), TypedValue::I64(b)) => {
            TypedValue::I64(a.saturating_sub(b))
        }
        (ValueType::I128, TypedValue::I128(a), TypedValue::I128(b)) => {
            TypedValue::I128(a.saturating_sub(b))
        }
        _ => return Err(ErrorCode::UnsupportedBinaryOp.into()),
    };
    encode_typed(ty, out)
}

pub(crate) fn apply_compare(ty: ValueType, op: CompareOp, lhs: &[u8], rhs: &[u8]) -> Result<bool> {
    if ty == ValueType::Bool {
        require!(matches!(op, CompareOp::Eq | CompareOp::Ne), ErrorCode::UnsupportedBinaryOp);
        let l = decode_typed(ty, lhs)?.as_bool()?;
        let r = decode_typed(ty, rhs)?.as_bool()?;
        return Ok(matches!(op, CompareOp::Eq) == (l == r));
    }

    if ty == ValueType::Pubkey {
        require!(matches!(op, CompareOp::Eq | CompareOp::Ne), ErrorCode::UnsupportedBinaryOp);
        return compare_typed(ty, op, decode_typed(ty, lhs)?, decode_typed(ty, rhs)?);
    }

    require!(ty.supports_ordering(), ErrorCode::UnsupportedBinaryOp);
    compare_typed(ty, op, decode_typed(ty, lhs)?, decode_typed(ty, rhs)?)
}

pub fn apply_not(operand: &[u8]) -> Result<ValueBytes> {
    let v = decode_typed(ValueType::Bool, operand)?.as_bool()?;
    encode_typed(ValueType::Bool, TypedValue::Bool(!v))
}

pub fn apply_neg(ty: ValueType, operand: &[u8]) -> Result<ValueBytes> {
    let v = decode_typed(ty, operand)?;
    let out = match (ty, v) {
        (ValueType::I8, TypedValue::I8(x)) => {
            TypedValue::I8(x.checked_neg().ok_or(ErrorCode::IntegerOverflow)?)
        }
        (ValueType::I16, TypedValue::I16(x)) => {
            TypedValue::I16(x.checked_neg().ok_or(ErrorCode::IntegerOverflow)?)
        }
        (ValueType::I32, TypedValue::I32(x)) => {
            TypedValue::I32(x.checked_neg().ok_or(ErrorCode::IntegerOverflow)?)
        }
        (ValueType::I64, TypedValue::I64(x)) => {
            TypedValue::I64(x.checked_neg().ok_or(ErrorCode::IntegerOverflow)?)
        }
        (ValueType::I128, TypedValue::I128(x)) => {
            TypedValue::I128(x.checked_neg().ok_or(ErrorCode::IntegerOverflow)?)
        }
        (ValueType::F32, TypedValue::F32(x)) => {
            require!(x.is_finite(), ErrorCode::FloatUnordered);
            TypedValue::F32(-x)
        }
        (ValueType::F64, TypedValue::F64(x)) => {
            require!(x.is_finite(), ErrorCode::FloatUnordered);
            TypedValue::F64(-x)
        }
        _ => return Err(ErrorCode::UnsupportedUnaryOp.into()),
    };
    encode_typed(ty, out)
}

pub fn apply_is_zero(ty: ValueType, operand: &[u8]) -> Result<ValueBytes> {
    let v = decode_typed(ty, operand)?;
    let zero = match (ty, v) {
        (ValueType::Bool, TypedValue::Bool(b)) => !b,
        (ValueType::U8, TypedValue::U8(n)) => n == 0,
        (ValueType::U16, TypedValue::U16(n)) => n == 0,
        (ValueType::U32, TypedValue::U32(n)) => n == 0,
        (ValueType::U64, TypedValue::U64(n)) => n == 0,
        (ValueType::U128, TypedValue::U128(n)) => n == 0,
        (ValueType::I8, TypedValue::I8(n)) => n == 0,
        (ValueType::I16, TypedValue::I16(n)) => n == 0,
        (ValueType::I32, TypedValue::I32(n)) => n == 0,
        (ValueType::I64, TypedValue::I64(n)) => n == 0,
        (ValueType::I128, TypedValue::I128(n)) => n == 0,
        (ValueType::F32, TypedValue::F32(n)) => n == 0.0,
        (ValueType::F64, TypedValue::F64(n)) => n == 0.0,
        _ => return Err(ErrorCode::InvalidExprOperand.into()),
    };
    encode_typed(ValueType::Bool, TypedValue::Bool(zero))
}

pub fn apply_non_zero(ty: ValueType, operand: &[u8]) -> Result<ValueBytes> {
    let bytes = apply_is_zero(ty, operand)?;
    apply_not(bytes.as_slice())
}

pub fn apply_and(lhs: &[u8], rhs: &[u8]) -> Result<ValueBytes> {
    let l = decode_typed(ValueType::Bool, lhs)?.as_bool()?;
    let r = decode_typed(ValueType::Bool, rhs)?.as_bool()?;
    encode_typed(ValueType::Bool, TypedValue::Bool(l && r))
}

pub fn apply_or(lhs: &[u8], rhs: &[u8]) -> Result<ValueBytes> {
    let l = decode_typed(ValueType::Bool, lhs)?.as_bool()?;
    let r = decode_typed(ValueType::Bool, rhs)?.as_bool()?;
    encode_typed(ValueType::Bool, TypedValue::Bool(l || r))
}

pub fn apply_cast(dst: ValueType, src_ty: ValueType, operand: &[u8]) -> Result<ValueBytes> {
    require!(
        matches!(
            dst,
            ValueType::U8
                | ValueType::U16
                | ValueType::U32
                | ValueType::U64
                | ValueType::U128
                | ValueType::I8
                | ValueType::I16
                | ValueType::I32
                | ValueType::I64
                | ValueType::I128
        ),
        ErrorCode::InvalidExprOperand
    );
    require!(
        !matches!(
            src_ty,
            ValueType::Bool | ValueType::Pubkey | ValueType::F32 | ValueType::F64
        ),
        ErrorCode::InvalidExprOperand
    );
    let v = decode_typed(src_ty, operand)?;
    let out = match dst {
        ValueType::U8 => TypedValue::U8(narrow_u128(cast_to_u128(src_ty, v)?, u8::MAX as u128)? as u8),
        ValueType::U16 => TypedValue::U16(narrow_u128(cast_to_u128(src_ty, v)?, u16::MAX as u128)? as u16),
        ValueType::U32 => TypedValue::U32(narrow_u128(cast_to_u128(src_ty, v)?, u32::MAX as u128)? as u32),
        ValueType::U64 => TypedValue::U64(narrow_u128(cast_to_u128(src_ty, v)?, u64::MAX as u128)? as u64),
        ValueType::U128 => TypedValue::U128(cast_to_u128(src_ty, v)?),
        ValueType::I8 => TypedValue::I8(value_to_i128(src_ty, v)? as i8),
        ValueType::I16 => TypedValue::I16(value_to_i128(src_ty, v)? as i16),
        ValueType::I32 => TypedValue::I32(value_to_i128(src_ty, v)? as i32),
        ValueType::I64 => TypedValue::I64(value_to_i128(src_ty, v)? as i64),
        ValueType::I128 => TypedValue::I128(value_to_i128(src_ty, v)?),
        _ => return Err(ErrorCode::InvalidExprOperand.into()),
    };
    encode_typed(dst, out)
}

pub fn apply_as_u64(src_ty: ValueType, operand: &[u8]) -> Result<ValueBytes> {
    apply_cast(ValueType::U64, src_ty, operand)
}

pub fn apply_as_u128(src_ty: ValueType, operand: &[u8]) -> Result<ValueBytes> {
    apply_cast(ValueType::U128, src_ty, operand)
}

fn narrow_u128(n: u128, max: u128) -> Result<u128> {
    require!(n <= max, ErrorCode::CastOverflow);
    Ok(n)
}

fn cast_to_u128(src_ty: ValueType, v: TypedValue) -> Result<u128> {
    match (src_ty, v) {
        (ValueType::U8, TypedValue::U8(n)) => Ok(u128::from(n)),
        (ValueType::U16, TypedValue::U16(n)) => Ok(u128::from(n)),
        (ValueType::U32, TypedValue::U32(n)) => Ok(u128::from(n)),
        (ValueType::U64, TypedValue::U64(n)) => Ok(u128::from(n)),
        (ValueType::U128, TypedValue::U128(n)) => Ok(n),
        (ValueType::I8, TypedValue::I8(n)) => {
            require!(n >= 0, ErrorCode::CastOverflow);
            Ok(u128::from(n as u8))
        }
        (ValueType::I16, TypedValue::I16(n)) => {
            require!(n >= 0, ErrorCode::CastOverflow);
            Ok(u128::from(n as u16))
        }
        (ValueType::I32, TypedValue::I32(n)) => {
            require!(n >= 0, ErrorCode::CastOverflow);
            Ok(u128::from(n as u32))
        }
        (ValueType::I64, TypedValue::I64(n)) => {
            require!(n >= 0, ErrorCode::CastOverflow);
            Ok(u128::from(n as u64))
        }
        (ValueType::I128, TypedValue::I128(n)) => {
            require!(n >= 0, ErrorCode::CastOverflow);
            Ok(n as u128)
        }
        _ => Err(ErrorCode::InvalidExprOperand.into()),
    }
}

fn value_to_i128(src_ty: ValueType, v: TypedValue) -> Result<i128> {
    match (src_ty, v) {
        (ValueType::U8, TypedValue::U8(n)) => Ok(i128::from(n)),
        (ValueType::U16, TypedValue::U16(n)) => Ok(i128::from(n)),
        (ValueType::U32, TypedValue::U32(n)) => Ok(i128::from(n)),
        (ValueType::U64, TypedValue::U64(n)) => Ok(i128::from(n)),
        (ValueType::U128, TypedValue::U128(n)) => {
            require!(n <= i128::MAX as u128, ErrorCode::CastOverflow);
            Ok(n as i128)
        }
        (ValueType::I8, TypedValue::I8(n)) => Ok(i128::from(n)),
        (ValueType::I16, TypedValue::I16(n)) => Ok(i128::from(n)),
        (ValueType::I32, TypedValue::I32(n)) => Ok(i128::from(n)),
        (ValueType::I64, TypedValue::I64(n)) => Ok(i128::from(n)),
        (ValueType::I128, TypedValue::I128(n)) => Ok(n),
        _ => Err(ErrorCode::InvalidExprOperand.into()),
    }
}

/// Unsigned width in bytes (`U8`..=`U128` only).
pub fn unsigned_width(ty: ValueType) -> Option<u8> {
    Some(match ty {
        ValueType::U8 => 1,
        ValueType::U16 => 2,
        ValueType::U32 => 4,
        ValueType::U64 => 8,
        ValueType::U128 => 16,
        _ => return None,
    })
}

/// `narrow` is unsigned and no wider than `wide`.
pub fn is_unsigned_narrower_or_equal(narrow: ValueType, wide: ValueType) -> bool {
    match (unsigned_width(narrow), unsigned_width(wide)) {
        (Some(n), Some(w)) => n <= w,
        _ => false,
    }
}

pub fn is_bps_operand_ty(ty: ValueType) -> bool {
    matches!(
        ty,
        ValueType::U8 | ValueType::U16 | ValueType::U32 | ValueType::U64
    )
}

pub fn apply_mul_div_floor(ty: ValueType, a: &[u8], b: &[u8], c: &[u8]) -> Result<ValueBytes> {
    match ty {
        ValueType::U64 => {
            let TypedValue::U64(a) = decode_typed(ty, a)? else {
                return Err(ErrorCode::LoadTypeMismatch.into());
            };
            let TypedValue::U64(b) = decode_typed(ty, b)? else {
                return Err(ErrorCode::LoadTypeMismatch.into());
            };
            let TypedValue::U64(c) = decode_typed(ty, c)? else {
                return Err(ErrorCode::LoadTypeMismatch.into());
            };
            require!(c != 0, ErrorCode::DivisionByZero);
            let r = u128::from(a) * u128::from(b) / u128::from(c);
            require!(r <= u128::from(u64::MAX), ErrorCode::IntegerOverflow);
            encode_typed(ty, TypedValue::U64(r as u64))
        }
        ValueType::U128 => {
            let TypedValue::U128(a) = decode_typed(ty, a)? else {
                return Err(ErrorCode::LoadTypeMismatch.into());
            };
            let TypedValue::U128(b) = decode_typed(ty, b)? else {
                return Err(ErrorCode::LoadTypeMismatch.into());
            };
            let TypedValue::U128(c) = decode_typed(ty, c)? else {
                return Err(ErrorCode::LoadTypeMismatch.into());
            };
            require!(c != 0, ErrorCode::DivisionByZero);
            let r = a.checked_mul(b).ok_or(ErrorCode::IntegerOverflow)?;
            encode_typed(ty, TypedValue::U128(r / c))
        }
        _ => Err(ErrorCode::UnsupportedBinaryOp.into()),
    }
}

pub fn apply_mul_div_ceil(ty: ValueType, a: &[u8], b: &[u8], c: &[u8]) -> Result<ValueBytes> {
    match ty {
        ValueType::U64 => {
            let TypedValue::U64(a) = decode_typed(ty, a)? else {
                return Err(ErrorCode::LoadTypeMismatch.into());
            };
            let TypedValue::U64(b) = decode_typed(ty, b)? else {
                return Err(ErrorCode::LoadTypeMismatch.into());
            };
            let TypedValue::U64(c) = decode_typed(ty, c)? else {
                return Err(ErrorCode::LoadTypeMismatch.into());
            };
            require!(c != 0, ErrorCode::DivisionByZero);
            let num = u128::from(a) * u128::from(b);
            let r = num.div_ceil(u128::from(c));
            require!(r <= u128::from(u64::MAX), ErrorCode::IntegerOverflow);
            encode_typed(ty, TypedValue::U64(r as u64))
        }
        ValueType::U128 => {
            let TypedValue::U128(a) = decode_typed(ty, a)? else {
                return Err(ErrorCode::LoadTypeMismatch.into());
            };
            let TypedValue::U128(b) = decode_typed(ty, b)? else {
                return Err(ErrorCode::LoadTypeMismatch.into());
            };
            let TypedValue::U128(c) = decode_typed(ty, c)? else {
                return Err(ErrorCode::LoadTypeMismatch.into());
            };
            require!(c != 0, ErrorCode::DivisionByZero);
            let num = a.checked_mul(b).ok_or(ErrorCode::IntegerOverflow)?;
            encode_typed(ty, TypedValue::U128(num.div_ceil(c)))
        }
        _ => Err(ErrorCode::UnsupportedBinaryOp.into()),
    }
}

pub fn apply_bps_mul_floor(amount: &[u8], bps: &[u8]) -> Result<ValueBytes> {
    apply_mul_div_floor(ValueType::U64, amount, bps, bps_denom_bytes().as_slice())
}

pub fn apply_bps_mul_ceil(amount: &[u8], bps: &[u8]) -> Result<ValueBytes> {
    apply_mul_div_ceil(ValueType::U64, amount, bps, bps_denom_bytes().as_slice())
}

pub fn apply_clamp(ty: ValueType, value: &[u8], lo: &[u8], hi: &[u8]) -> Result<ValueBytes> {
    require!(ty.supports_ordering(), ErrorCode::UnsupportedBinaryOp);
    let maxed = apply_arith(ty, ArithOp::Max, value, lo)?;
    apply_arith(ty, ArithOp::Min, maxed.as_slice(), hi)
}

fn bps_denom_bytes() -> ValueBytes {
    encode_typed(ValueType::U64, TypedValue::U64(BPS_DENOM)).unwrap()
}

fn compare_typed(ty: ValueType, op: CompareOp, l: TypedValue, r: TypedValue) -> Result<bool> {
    macro_rules! cmp_ord {
        ($a:expr, $b:expr) => {{
            let ord = $a.cmp(&$b);
            Ok(match op {
                CompareOp::Eq => ord == std::cmp::Ordering::Equal,
                CompareOp::Ne => ord != std::cmp::Ordering::Equal,
                CompareOp::Gt => ord == std::cmp::Ordering::Greater,
                CompareOp::Ge => ord != std::cmp::Ordering::Less,
                CompareOp::Lt => ord == std::cmp::Ordering::Less,
                CompareOp::Le => ord != std::cmp::Ordering::Greater,
            })
        }};
    }

    macro_rules! cmp_float {
        ($a:expr, $b:expr) => {{
            let ord = $a
                .partial_cmp(&$b)
                .ok_or(ErrorCode::FloatUnordered)?;
            Ok(match op {
                CompareOp::Eq => ord == std::cmp::Ordering::Equal,
                CompareOp::Ne => ord != std::cmp::Ordering::Equal,
                CompareOp::Gt => ord == std::cmp::Ordering::Greater,
                CompareOp::Ge => ord != std::cmp::Ordering::Less,
                CompareOp::Lt => ord == std::cmp::Ordering::Less,
                CompareOp::Le => ord != std::cmp::Ordering::Greater,
            })
        }};
    }

    match (ty, l, r) {
        (ValueType::U8, TypedValue::U8(a), TypedValue::U8(b)) => cmp_ord!(a, b),
        (ValueType::U16, TypedValue::U16(a), TypedValue::U16(b)) => cmp_ord!(a, b),
        (ValueType::U32, TypedValue::U32(a), TypedValue::U32(b)) => cmp_ord!(a, b),
        (ValueType::U64, TypedValue::U64(a), TypedValue::U64(b)) => cmp_ord!(a, b),
        (ValueType::U128, TypedValue::U128(a), TypedValue::U128(b)) => cmp_ord!(a, b),
        (ValueType::I8, TypedValue::I8(a), TypedValue::I8(b)) => cmp_ord!(a, b),
        (ValueType::I16, TypedValue::I16(a), TypedValue::I16(b)) => cmp_ord!(a, b),
        (ValueType::I32, TypedValue::I32(a), TypedValue::I32(b)) => cmp_ord!(a, b),
        (ValueType::I64, TypedValue::I64(a), TypedValue::I64(b)) => cmp_ord!(a, b),
        (ValueType::I128, TypedValue::I128(a), TypedValue::I128(b)) => cmp_ord!(a, b),
        (ValueType::F32, TypedValue::F32(a), TypedValue::F32(b)) => cmp_float!(a, b),
        (ValueType::F64, TypedValue::F64(a), TypedValue::F64(b)) => cmp_float!(a, b),
        (ValueType::Pubkey, TypedValue::Pubkey(a), TypedValue::Pubkey(b)) => {
            Ok(match op {
                CompareOp::Eq => a == b,
                CompareOp::Ne => a != b,
                _ => return Err(ErrorCode::UnsupportedBinaryOp.into()),
            })
        }
        _ => Err(ErrorCode::LoadTypeMismatch.into()),
    }
}

fn integer_arith<T>(op: ArithOp, l: T, r: T) -> Result<T>
where
    T: IntegerArithmetic + PartialOrd,
{
    use ArithOp::*;
    match op {
        Add => l
            .checked_add_op(r)
            .ok_or(ErrorCode::IntegerOverflow.into()),
        Sub => l
            .checked_sub_op(r)
            .ok_or(ErrorCode::IntegerUnderflow.into()),
        Mul => l
            .checked_mul_op(r)
            .ok_or(ErrorCode::IntegerOverflow.into()),
        Div => {
            require!(r != T::zero(), ErrorCode::DivisionByZero);
            l.checked_div_op(r)
                .ok_or(ErrorCode::DivisionByZero.into())
        }
        Min => Ok(if l <= r { l } else { r }),
        Max => Ok(if l >= r { l } else { r }),
    }
}

trait IntegerArithmetic: Copy + PartialEq {
    fn zero() -> Self;
    fn checked_add_op(self, rhs: Self) -> Option<Self>;
    fn checked_sub_op(self, rhs: Self) -> Option<Self>;
    fn checked_mul_op(self, rhs: Self) -> Option<Self>;
    fn checked_div_op(self, rhs: Self) -> Option<Self>;
}

macro_rules! impl_integer_arithmetic {
    ($($t:ty),+) => {
        $(impl IntegerArithmetic for $t {
            fn zero() -> Self {
                0
            }
            fn checked_add_op(self, rhs: Self) -> Option<Self> {
                self.checked_add(rhs)
            }
            fn checked_sub_op(self, rhs: Self) -> Option<Self> {
                self.checked_sub(rhs)
            }
            fn checked_mul_op(self, rhs: Self) -> Option<Self> {
                self.checked_mul(rhs)
            }
            fn checked_div_op(self, rhs: Self) -> Option<Self> {
                self.checked_div(rhs)
            }
        })*
    };
}

impl_integer_arithmetic!(u8, u16, u32, u64, u128, i8, i16, i32, i64, i128);

fn apply_float<T>(op: ArithOp, l: T, r: T) -> Result<T>
where
    T: FloatArithmetic + PartialOrd,
{
    use ArithOp::*;
    require!(l.is_finite() && r.is_finite(), ErrorCode::FloatUnordered);
    match op {
        Add => Ok(l.add(r)),
        Sub => Ok(l.sub(r)),
        Mul => Ok(l.mul(r)),
        Div => {
            require!(r != T::zero(), ErrorCode::DivisionByZero);
            Ok(l.div(r))
        }
        Min => Ok(if l <= r { l } else { r }),
        Max => Ok(if l >= r { l } else { r }),
    }
}

trait FloatArithmetic: Copy + Sized + PartialEq {
    fn is_finite(self) -> bool;
    fn zero() -> Self;
    fn add(self, rhs: Self) -> Self;
    fn sub(self, rhs: Self) -> Self;
    fn mul(self, rhs: Self) -> Self;
    fn div(self, rhs: Self) -> Self;
}

macro_rules! impl_float_arithmetic {
    ($($t:ty),+) => {
        $(impl FloatArithmetic for $t {
            fn is_finite(self) -> bool {
                <$t>::is_finite(self)
            }
            fn zero() -> Self {
                0.0
            }
            fn add(self, rhs: Self) -> Self {
                self + rhs
            }
            fn sub(self, rhs: Self) -> Self {
                self - rhs
            }
            fn mul(self, rhs: Self) -> Self {
                self * rhs
            }
            fn div(self, rhs: Self) -> Self {
                self / rhs
            }
        })*
    };
}

impl_float_arithmetic!(f32, f64);

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::types::ValueType;
    use crate::state::value_codec::{encode_typed, TypedValue};

    #[test]
    fn div_by_zero_u64() {
        let err = apply_arith(
            ValueType::U64,
            ArithOp::Div,
            &encode_typed(ValueType::U64, TypedValue::U64(1)).unwrap(),
            &encode_typed(ValueType::U64, TypedValue::U64(0)).unwrap(),
        )
        .unwrap_err();
        assert!(err.to_string().contains("DivisionByZero") || format!("{err:?}").contains("DivisionByZero"));
    }

    #[test]
    fn overflow_u64_add() {
        let err = apply_arith(
            ValueType::U64,
            ArithOp::Add,
            &encode_typed(ValueType::U64, TypedValue::U64(u64::MAX)).unwrap(),
            &encode_typed(ValueType::U64, TypedValue::U64(1)).unwrap(),
        )
        .unwrap_err();
        assert!(format!("{err:?}").contains("IntegerOverflow"));
    }

    #[test]
    fn underflow_u64_sub() {
        let err = apply_arith(
            ValueType::U64,
            ArithOp::Sub,
            &encode_typed(ValueType::U64, TypedValue::U64(0)).unwrap(),
            &encode_typed(ValueType::U64, TypedValue::U64(1)).unwrap(),
        )
        .unwrap_err();
        assert!(format!("{err:?}").contains("IntegerUnderflow"));
    }

    #[test]
    fn float_nan_compare_is_unordered() {
        let err = apply_compare(
            ValueType::F64,
            CompareOp::Gt,
            &encode_typed(ValueType::F64, TypedValue::F64(f64::NAN)).unwrap(),
            &encode_typed(ValueType::F64, TypedValue::F64(1.0)).unwrap(),
        )
        .unwrap_err();
        assert!(format!("{err:?}").contains("FloatUnordered"));
    }

    #[test]
    fn is_bps_operand_ty_allows_u8_through_u64() {
        assert!(is_bps_operand_ty(ValueType::U8));
        assert!(is_bps_operand_ty(ValueType::U16));
        assert!(is_bps_operand_ty(ValueType::U32));
        assert!(is_bps_operand_ty(ValueType::U64));
        assert!(!is_bps_operand_ty(ValueType::U128));
        assert!(!is_bps_operand_ty(ValueType::I16));
    }

    #[test]
    fn muldiv_floor_basic() {
        let out = apply_mul_div_floor(
            ValueType::U64,
            &encode_typed(ValueType::U64, TypedValue::U64(100)).unwrap(),
            &encode_typed(ValueType::U64, TypedValue::U64(50)).unwrap(),
            &encode_typed(ValueType::U64, TypedValue::U64(10)).unwrap(),
        )
        .unwrap();
        assert_eq!(
            out,
            encode_typed(ValueType::U64, TypedValue::U64(500)).unwrap()
        );
    }

    #[test]
    fn is_unsigned_narrower_or_equal_checks_width() {
        assert!(is_unsigned_narrower_or_equal(ValueType::U16, ValueType::U64));
        assert!(is_unsigned_narrower_or_equal(ValueType::U64, ValueType::U64));
        assert!(!is_unsigned_narrower_or_equal(ValueType::U128, ValueType::U64));
        assert!(!is_unsigned_narrower_or_equal(ValueType::I32, ValueType::U64));
    }
}
