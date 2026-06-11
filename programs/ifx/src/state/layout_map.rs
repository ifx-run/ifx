//! Maps shared [`ifx_core::layout::LayoutError`] to on-chain [`ErrorCode`].

use anchor_lang::prelude::*;

use crate::error::ErrorCode;

pub(crate) fn map_layout_err(e: ifx_core::layout::LayoutError) -> Error {
    use ifx_core::layout::LayoutError;
    Error::from(match e {
        LayoutError::InvalidValueTypeTag => ErrorCode::InvalidValueTypeTag,
        LayoutError::TypeMismatch => ErrorCode::LoadTypeMismatch,
        LayoutError::TapeOutOfBounds => ErrorCode::TapeOutOfBounds,
        LayoutError::UnsupportedUnaryOp => ErrorCode::UnsupportedUnaryOp,
        LayoutError::UnsupportedBinaryOp => ErrorCode::UnsupportedBinaryOp,
        LayoutError::InvalidValueIndex => ErrorCode::InvalidValueIndex,
    })
}
