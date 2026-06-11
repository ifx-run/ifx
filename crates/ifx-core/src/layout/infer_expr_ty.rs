//! Static expression type inference (aligns with SDK `inferIfxTyFromExpr`).

use super::error::LayoutError;
use crate::wire::{Expr, ValueType};

/// Supplies binding types for [`infer_expr_ty`] (on-chain: frame tape reader).
pub trait ExprTypeContext {
    fn binding_value_type(&self, index: u8) -> Result<ValueType, LayoutError>;
}

fn infer_binary_ty<C: ExprTypeContext>(
    ctx: &C,
    lhs: &Expr,
    rhs: &Expr,
) -> Result<ValueType, LayoutError> {
    let lt = infer_expr_ty(ctx, lhs)?;
    let rt = infer_expr_ty(ctx, rhs)?;
    if lt != rt {
        return Err(LayoutError::TypeMismatch);
    }
    Ok(lt)
}

/// Static type of an expression subtree (for comparisons and consistency checks).
pub fn infer_expr_ty<C: ExprTypeContext>(
    ctx: &C,
    expr: &Expr,
) -> Result<ValueType, LayoutError> {
    match expr {
        Expr::Value(v) => ctx.binding_value_type(v.index),
        Expr::ConstBool(_) => Ok(ValueType::Bool),
        Expr::ConstU8(_) => Ok(ValueType::U8),
        Expr::ConstU16(_) => Ok(ValueType::U16),
        Expr::ConstU32(_) => Ok(ValueType::U32),
        Expr::ConstU64(_) => Ok(ValueType::U64),
        Expr::ConstU128(_) => Ok(ValueType::U128),
        Expr::ConstI8(_) => Ok(ValueType::I8),
        Expr::ConstI16(_) => Ok(ValueType::I16),
        Expr::ConstI32(_) => Ok(ValueType::I32),
        Expr::ConstI64(_) => Ok(ValueType::I64),
        Expr::ConstI128(_) => Ok(ValueType::I128),
        Expr::ConstF32(_) => Ok(ValueType::F32),
        Expr::ConstF64(_) => Ok(ValueType::F64),
        Expr::Not { .. }
        | Expr::IsZero { .. }
        | Expr::NonZero { .. }
        | Expr::Eq { .. }
        | Expr::Ne { .. }
        | Expr::Gt { .. }
        | Expr::Ge { .. }
        | Expr::Lt { .. }
        | Expr::Le { .. }
        | Expr::And { .. }
        | Expr::Or { .. } => Ok(ValueType::Bool),
        Expr::Neg { operand } => {
            let t = infer_expr_ty(ctx, operand)?;
            if !t.supports_neg() {
                return Err(LayoutError::UnsupportedUnaryOp);
            }
            Ok(t)
        }
        Expr::AsU8 { .. } => Ok(ValueType::U8),
        Expr::AsU16 { .. } => Ok(ValueType::U16),
        Expr::AsU32 { .. } => Ok(ValueType::U32),
        Expr::AsU64 { .. } => Ok(ValueType::U64),
        Expr::AsU128 { .. } => Ok(ValueType::U128),
        Expr::AsI8 { .. } => Ok(ValueType::I8),
        Expr::AsI16 { .. } => Ok(ValueType::I16),
        Expr::AsI32 { .. } => Ok(ValueType::I32),
        Expr::AsI64 { .. } => Ok(ValueType::I64),
        Expr::AsI128 { .. } => Ok(ValueType::I128),
        Expr::Add { lhs, .. }
        | Expr::Sub { lhs, .. }
        | Expr::Mul { lhs, .. }
        | Expr::Div { lhs, .. }
        | Expr::DivFloor { lhs, .. }
        | Expr::DivCeil { lhs, .. }
        | Expr::Min { lhs, .. }
        | Expr::Max { lhs, .. }
        | Expr::SaturatingSub { lhs, .. } => {
            let t = infer_expr_ty(ctx, lhs)?;
            if !t.supports_arithmetic() {
                return Err(LayoutError::UnsupportedBinaryOp);
            }
            Ok(t)
        }
        Expr::BpsMulFloor { .. } | Expr::BpsMulCeil { .. } => Ok(ValueType::U64),
        Expr::MulDivFloor { a, .. } | Expr::MulDivCeil { a, .. } => infer_expr_ty(ctx, a),
        Expr::Clamp { value, .. } => infer_expr_ty(ctx, value),
        Expr::Select { then_expr, else_expr, .. } => {
            infer_binary_ty(ctx, then_expr, else_expr)
        }
        Expr::ConstPubkey(_) => Ok(ValueType::Pubkey),
    }
}
