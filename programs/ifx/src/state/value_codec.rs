use anchor_lang::prelude::*;

use super::layout_map::map_layout_err;
use crate::state::types::ValueType;

pub use ifx_core::layout::{MAX_VALUE_LEN, TypedValue, ValueBytes};

pub fn copy_from(ty: ValueType, src: &[u8]) -> Result<ValueBytes> {
    ifx_core::layout::ValueBytes::copy_from(ty, src).map_err(map_layout_err)
}

pub fn encode_typed(ty: ValueType, value: TypedValue) -> Result<ValueBytes> {
    ifx_core::layout::encode_typed(ty, value).map_err(map_layout_err)
}

pub fn decode_bool(bytes: &[u8]) -> Result<bool> {
    ifx_core::layout::decode_bool(bytes).map_err(map_layout_err)
}

pub fn decode_typed(ty: ValueType, bytes: &[u8]) -> Result<TypedValue> {
    ifx_core::layout::decode_typed(ty, bytes).map_err(map_layout_err)
}

/// Anchor `Result` adapter for [`TypedValue::as_bool`](ifx_core::layout::TypedValue::as_bool).
pub trait TypedValueResultExt {
    #[allow(clippy::wrong_self_convention)]
    fn as_bool(self) -> Result<bool>;
}

impl TypedValueResultExt for TypedValue {
    fn as_bool(self) -> Result<bool> {
        match self {
            TypedValue::Bool(v) => Ok(v),
            _ => Err(map_layout_err(ifx_core::layout::LayoutError::TypeMismatch)),
        }
    }
}
