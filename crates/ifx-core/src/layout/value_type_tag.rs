//! `ValueType` wire tags (must match SDK `VALUE_TYPE_TAG`).

use super::error::LayoutError;
use crate::wire::ValueType;

/// Wire tag order (must match SDK `VALUE_TYPE_TAG` and IDL `ValueType` variant order).
pub fn value_type_to_tag(ty: ValueType) -> u8 {
    match ty {
        ValueType::Bool => 0,
        ValueType::U8 => 1,
        ValueType::U16 => 2,
        ValueType::U32 => 3,
        ValueType::U64 => 4,
        ValueType::U128 => 5,
        ValueType::I8 => 6,
        ValueType::I16 => 7,
        ValueType::I32 => 8,
        ValueType::I64 => 9,
        ValueType::I128 => 10,
        ValueType::F32 => 11,
        ValueType::F64 => 12,
        ValueType::Pubkey => 13,
    }
}

pub fn tag_to_value_type(tag: u8) -> Result<ValueType, LayoutError> {
    Ok(match tag {
        0 => ValueType::Bool,
        1 => ValueType::U8,
        2 => ValueType::U16,
        3 => ValueType::U32,
        4 => ValueType::U64,
        5 => ValueType::U128,
        6 => ValueType::I8,
        7 => ValueType::I16,
        8 => ValueType::I32,
        9 => ValueType::I64,
        10 => ValueType::I128,
        11 => ValueType::F32,
        12 => ValueType::F64,
        13 => ValueType::Pubkey,
        _ => return Err(LayoutError::InvalidValueTypeTag),
    })
}
