use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode,
    state::layout_map::map_layout_err,
    state::types::{Expr, ValueType},
    state::value_codec::{decode_bool, encode_typed, TypedValue, ValueBytes},
    state::value_ops::{
        apply_and, apply_arith, apply_bps_mul_ceil,
        apply_bps_mul_floor, apply_cast, apply_clamp, apply_compare, apply_div_ceil, apply_div_floor,
        apply_is_zero, apply_mul_div_ceil, apply_mul_div_floor, apply_neg, apply_non_zero,
        apply_not, apply_or, apply_saturating_sub, ArithOp, CompareOp,
    },
};

use super::frame_access::FrameReader;

pub use super::let_binding_exec::execute_let;

/// Evaluate `expr` as `Bool` (for `ifx_assert` / `ifx_if_else`).
pub fn eval_bool(frame: &impl FrameReader, expr: &Expr) -> Result<bool> {
    decode_bool(&eval_expr(frame, ValueType::Bool, expr)?)
}

/// Evaluate `expr` to raw bytes of type `dst_ty` (used by `Eval` bindings and sub-expressions).
pub fn eval_expr(frame: &impl FrameReader, dst_ty: ValueType, expr: &Expr) -> Result<ValueBytes> {
    match expr {
        Expr::Value(val) => frame.read_bytes(val.index, dst_ty),
        Expr::ConstBool(v) => encode_typed(dst_ty, TypedValue::Bool(*v)),
        Expr::ConstU8(v) => encode_typed(dst_ty, TypedValue::U8(*v)),
        Expr::ConstU16(v) => encode_typed(dst_ty, TypedValue::U16(*v)),
        Expr::ConstU32(v) => encode_typed(dst_ty, TypedValue::U32(*v)),
        Expr::ConstU64(v) => encode_typed(dst_ty, TypedValue::U64(*v)),
        Expr::ConstU128(v) => encode_typed(dst_ty, TypedValue::U128(*v)),
        Expr::ConstI8(v) => encode_typed(dst_ty, TypedValue::I8(*v)),
        Expr::ConstI16(v) => encode_typed(dst_ty, TypedValue::I16(*v)),
        Expr::ConstI32(v) => encode_typed(dst_ty, TypedValue::I32(*v)),
        Expr::ConstI64(v) => encode_typed(dst_ty, TypedValue::I64(*v)),
        Expr::ConstI128(v) => encode_typed(dst_ty, TypedValue::I128(*v)),
        Expr::ConstF32(v) => encode_typed(dst_ty, TypedValue::F32(*v)),
        Expr::ConstF64(v) => encode_typed(dst_ty, TypedValue::F64(*v)),
        Expr::Not { operand } => {
            require!(dst_ty == ValueType::Bool, ErrorCode::ExprTypeMismatch);
            apply_not(&eval_expr(frame, ValueType::Bool, operand)?)
        }
        Expr::Neg { operand } => {
            require!(dst_ty.supports_neg(), ErrorCode::UnsupportedUnaryOp);
            apply_neg(dst_ty, &eval_expr(frame, dst_ty, operand)?)
        }
        Expr::IsZero { operand } => {
            require!(dst_ty == ValueType::Bool, ErrorCode::ExprTypeMismatch);
            let ty = infer_expr_ty(frame, operand)?;
            apply_is_zero(ty, &eval_expr(frame, ty, operand)?)
        }
        Expr::NonZero { operand } => {
            require!(dst_ty == ValueType::Bool, ErrorCode::ExprTypeMismatch);
            let ty = infer_expr_ty(frame, operand)?;
            apply_non_zero(ty, &eval_expr(frame, ty, operand)?)
        }
        Expr::AsU8 { operand } => eval_cast(frame, dst_ty, ValueType::U8, operand),
        Expr::AsU16 { operand } => eval_cast(frame, dst_ty, ValueType::U16, operand),
        Expr::AsU32 { operand } => eval_cast(frame, dst_ty, ValueType::U32, operand),
        Expr::AsU64 { operand } => eval_cast(frame, dst_ty, ValueType::U64, operand),
        Expr::AsU128 { operand } => eval_cast(frame, dst_ty, ValueType::U128, operand),
        Expr::AsI8 { operand } => eval_cast(frame, dst_ty, ValueType::I8, operand),
        Expr::AsI16 { operand } => eval_cast(frame, dst_ty, ValueType::I16, operand),
        Expr::AsI32 { operand } => eval_cast(frame, dst_ty, ValueType::I32, operand),
        Expr::AsI64 { operand } => eval_cast(frame, dst_ty, ValueType::I64, operand),
        Expr::AsI128 { operand } => eval_cast(frame, dst_ty, ValueType::I128, operand),
        Expr::Add { lhs, rhs } => eval_arith(frame, dst_ty, ArithOp::Add, lhs, rhs),
        Expr::Sub { lhs, rhs } => eval_arith(frame, dst_ty, ArithOp::Sub, lhs, rhs),
        Expr::Mul { lhs, rhs } => eval_arith(frame, dst_ty, ArithOp::Mul, lhs, rhs),
        Expr::Div { lhs, rhs } => eval_arith(frame, dst_ty, ArithOp::Div, lhs, rhs),
        Expr::DivFloor { lhs, rhs } => {
            let ty = infer_binary_ty(frame, lhs, rhs)?;
            require!(dst_ty == ty, ErrorCode::ExprTypeMismatch);
            let l = eval_expr(frame, ty, lhs)?;
            let r = eval_expr(frame, ty, rhs)?;
            apply_div_floor(ty, &l, &r)
        }
        Expr::DivCeil { lhs, rhs } => {
            let ty = infer_binary_ty(frame, lhs, rhs)?;
            require!(dst_ty == ty, ErrorCode::ExprTypeMismatch);
            let l = eval_expr(frame, ty, lhs)?;
            let r = eval_expr(frame, ty, rhs)?;
            apply_div_ceil(ty, &l, &r)
        }
        Expr::Min { lhs, rhs } => eval_arith(frame, dst_ty, ArithOp::Min, lhs, rhs),
        Expr::Max { lhs, rhs } => eval_arith(frame, dst_ty, ArithOp::Max, lhs, rhs),
        Expr::Eq { lhs, rhs } => eval_compare(frame, dst_ty, CompareOp::Eq, lhs, rhs),
        Expr::Ne { lhs, rhs } => eval_compare(frame, dst_ty, CompareOp::Ne, lhs, rhs),
        Expr::Gt { lhs, rhs } => eval_compare(frame, dst_ty, CompareOp::Gt, lhs, rhs),
        Expr::Ge { lhs, rhs } => eval_compare(frame, dst_ty, CompareOp::Ge, lhs, rhs),
        Expr::Lt { lhs, rhs } => eval_compare(frame, dst_ty, CompareOp::Lt, lhs, rhs),
        Expr::Le { lhs, rhs } => eval_compare(frame, dst_ty, CompareOp::Le, lhs, rhs),
        Expr::SaturatingSub { lhs, rhs } => {
            let ty = infer_binary_ty(frame, lhs, rhs)?;
            require!(dst_ty == ty, ErrorCode::ExprTypeMismatch);
            let l = eval_expr(frame, ty, lhs)?;
            let r = eval_expr(frame, ty, rhs)?;
            apply_saturating_sub(ty, &l, &r)
        }
        Expr::And { lhs, rhs } => {
            require!(dst_ty == ValueType::Bool, ErrorCode::ExprTypeMismatch);
            let l = eval_expr(frame, ValueType::Bool, lhs)?;
            let r = eval_expr(frame, ValueType::Bool, rhs)?;
            apply_and(&l, &r)
        }
        Expr::Or { lhs, rhs } => {
            require!(dst_ty == ValueType::Bool, ErrorCode::ExprTypeMismatch);
            let l = eval_expr(frame, ValueType::Bool, lhs)?;
            let r = eval_expr(frame, ValueType::Bool, rhs)?;
            apply_or(&l, &r)
        }
        Expr::BpsMulFloor { amount, bps } => {
            require!(dst_ty == ValueType::U64, ErrorCode::ExprTypeMismatch);
            let a = eval_expr(frame, ValueType::U64, amount)?;
            let b = eval_expr(frame, ValueType::U64, bps)?;
            apply_bps_mul_floor(&a, &b)
        }
        Expr::BpsMulCeil { amount, bps } => {
            require!(dst_ty == ValueType::U64, ErrorCode::ExprTypeMismatch);
            let a = eval_expr(frame, ValueType::U64, amount)?;
            let b = eval_expr(frame, ValueType::U64, bps)?;
            apply_bps_mul_ceil(&a, &b)
        }
        Expr::MulDivFloor { a, b, c } => {
            let ty = infer_muldiv_ty(frame, a, b, c)?;
            require!(dst_ty == ty, ErrorCode::ExprTypeMismatch);
            let av = eval_expr(frame, ty, a)?;
            let bv = eval_expr(frame, ty, b)?;
            let cv = eval_expr(frame, ty, c)?;
            apply_mul_div_floor(ty, &av, &bv, &cv)
        }
        Expr::MulDivCeil { a, b, c } => {
            let ty = infer_muldiv_ty(frame, a, b, c)?;
            require!(dst_ty == ty, ErrorCode::ExprTypeMismatch);
            let av = eval_expr(frame, ty, a)?;
            let bv = eval_expr(frame, ty, b)?;
            let cv = eval_expr(frame, ty, c)?;
            apply_mul_div_ceil(ty, &av, &bv, &cv)
        }
        Expr::Clamp { value, lo, hi } => {
            let ty = infer_ternary_ty(frame, value, lo, hi)?;
            require!(dst_ty == ty, ErrorCode::ExprTypeMismatch);
            let v = eval_expr(frame, ty, value)?;
            let l = eval_expr(frame, ty, lo)?;
            let h = eval_expr(frame, ty, hi)?;
            apply_clamp(ty, &v, &l, &h)
        }
        Expr::Select { cond, then_expr, else_expr } => {
            let cond_ty = infer_expr_ty(frame, cond)?;
            require!(cond_ty == ValueType::Bool, ErrorCode::ExprTypeMismatch);
            let branch_ty = infer_binary_ty(frame, then_expr, else_expr)?;
            require!(dst_ty == branch_ty, ErrorCode::ExprTypeMismatch);
            let pick_then = decode_bool(&eval_expr(frame, ValueType::Bool, cond)?)?;
            if pick_then {
                eval_expr(frame, branch_ty, then_expr)
            } else {
                eval_expr(frame, branch_ty, else_expr)
            }
        }
        Expr::ConstPubkey(v) => encode_typed(dst_ty, TypedValue::Pubkey(*v)),
    }
}

fn eval_cast(
    frame: &impl FrameReader,
    dst_ty: ValueType,
    target: ValueType,
    operand: &Expr,
) -> Result<ValueBytes> {
    require!(dst_ty == target, ErrorCode::ExprTypeMismatch);
    let src = infer_expr_ty(frame, operand)?;
    apply_cast(target, src, &eval_expr(frame, src, operand)?)
}

fn eval_arith(
    frame: &impl FrameReader,
    dst_ty: ValueType,
    op: ArithOp,
    lhs: &Expr,
    rhs: &Expr,
) -> Result<ValueBytes> {
    let ty = infer_binary_ty(frame, lhs, rhs)?;
    require!(dst_ty == ty, ErrorCode::ExprTypeMismatch);
    require!(ty.supports_arithmetic(), ErrorCode::UnsupportedBinaryOp);
    let l = eval_expr(frame, ty, lhs)?;
    let r = eval_expr(frame, ty, rhs)?;
    apply_arith(ty, op, &l, &r)
}

fn eval_compare(
    frame: &impl FrameReader,
    dst_ty: ValueType,
    op: CompareOp,
    lhs: &Expr,
    rhs: &Expr,
) -> Result<ValueBytes> {
    require!(dst_ty == ValueType::Bool, ErrorCode::ExprTypeMismatch);
    let ty = infer_binary_ty(frame, lhs, rhs)?;
    let l = eval_expr(frame, ty, lhs)?;
    let r = eval_expr(frame, ty, rhs)?;
    let v = apply_compare(ty, op, &l, &r)?;
    encode_typed(ValueType::Bool, TypedValue::Bool(v))
}

fn infer_binary_ty(frame: &impl FrameReader, lhs: &Expr, rhs: &Expr) -> Result<ValueType> {
    let lt = infer_expr_ty(frame, lhs)?;
    let rt = infer_expr_ty(frame, rhs)?;
    require!(lt == rt, ErrorCode::LoadTypeMismatch);
    Ok(lt)
}

fn infer_muldiv_ty(frame: &impl FrameReader, a: &Expr, b: &Expr, c: &Expr) -> Result<ValueType> {
    let ta = infer_expr_ty(frame, a)?;
    let tb = infer_expr_ty(frame, b)?;
    let tc = infer_expr_ty(frame, c)?;
    require!(ta == tb && tb == tc, ErrorCode::LoadTypeMismatch);
    require!(
        matches!(ta, ValueType::U64 | ValueType::U128),
        ErrorCode::UnsupportedBinaryOp
    );
    Ok(ta)
}

fn infer_ternary_ty(frame: &impl FrameReader, a: &Expr, b: &Expr, c: &Expr) -> Result<ValueType> {
    infer_muldiv_ty(frame, a, b, c)
}

/// Static type of an expression subtree (for comparisons and consistency checks).
pub fn infer_expr_ty(frame: &impl FrameReader, expr: &Expr) -> Result<ValueType> {
    struct FrameCtx<'a, F: FrameReader>(&'a F);

    impl<'a, F: FrameReader> ifx_core::layout::ExprTypeContext for FrameCtx<'a, F> {
        fn binding_value_type(
            &self,
            index: u8,
        ) -> std::result::Result<ValueType, ifx_core::layout::LayoutError> {
            self.0
                .read_value_type(index)
                .map_err(|_| ifx_core::layout::LayoutError::InvalidValueIndex)
        }
    }

    ifx_core::layout::infer_expr_ty(&FrameCtx(frame), expr).map_err(map_layout_err)
}

pub fn get_remaining<'info>(
    remaining: &'info [AccountInfo<'info>],
    index: u8,
) -> Result<&'info AccountInfo<'info>> {
    let i = index as usize;
    require!(i < remaining.len(), ErrorCode::InvalidAccountIndex);
    Ok(&remaining[i])
}
