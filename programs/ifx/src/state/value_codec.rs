use anchor_lang::prelude::*;

use crate::error::ErrorCode;

use super::types::ValueType;

/// Max primitive payload width (`ValueType::U128` / `I128`).
pub const MAX_VALUE_LEN: usize = 16;

/// Stack-resident encoded primitive (no heap); wire bytes for one `ValueType`.
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub struct ValueBytes {
    buf: [u8; MAX_VALUE_LEN],
    len: u8,
}

impl ValueBytes {
    pub fn as_slice(&self) -> &[u8] {
        &self.buf[..self.len as usize]
    }

    pub fn len(&self) -> usize {
        self.len as usize
    }

    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    pub fn copy_from(ty: ValueType, src: &[u8]) -> Result<Self> {
        let len = ty.size();
        require!(src.len() == len, ErrorCode::LoadTypeMismatch);
        let mut out = Self {
            buf: [0u8; MAX_VALUE_LEN],
            len: len as u8,
        };
        out.buf[..len].copy_from_slice(src);
        Ok(out)
    }

    pub fn encode_typed(ty: ValueType, value: TypedValue) -> Result<Self> {
        let len = ty.size();
        let mut out = Self {
            buf: [0u8; MAX_VALUE_LEN],
            len: len as u8,
        };
        match (ty, value) {
            (ValueType::Bool, TypedValue::Bool(v)) => out.buf[0] = u8::from(v),
            (ValueType::U8, TypedValue::U8(v)) => out.buf[0] = v,
            (ValueType::U16, TypedValue::U16(v)) => out.buf[..2].copy_from_slice(&v.to_le_bytes()),
            (ValueType::U32, TypedValue::U32(v)) => out.buf[..4].copy_from_slice(&v.to_le_bytes()),
            (ValueType::U64, TypedValue::U64(v)) => out.buf[..8].copy_from_slice(&v.to_le_bytes()),
            (ValueType::U128, TypedValue::U128(v)) => {
                out.buf[..16].copy_from_slice(&v.to_le_bytes())
            }
            (ValueType::I8, TypedValue::I8(v)) => out.buf[..1].copy_from_slice(&v.to_le_bytes()),
            (ValueType::I16, TypedValue::I16(v)) => out.buf[..2].copy_from_slice(&v.to_le_bytes()),
            (ValueType::I32, TypedValue::I32(v)) => out.buf[..4].copy_from_slice(&v.to_le_bytes()),
            (ValueType::I64, TypedValue::I64(v)) => out.buf[..8].copy_from_slice(&v.to_le_bytes()),
            (ValueType::I128, TypedValue::I128(v)) => {
                out.buf[..16].copy_from_slice(&v.to_le_bytes())
            }
            (ValueType::F32, TypedValue::F32(v)) => out.buf[..4].copy_from_slice(&v.to_le_bytes()),
            (ValueType::F64, TypedValue::F64(v)) => out.buf[..8].copy_from_slice(&v.to_le_bytes()),
            _ => return Err(ErrorCode::LoadTypeMismatch.into()),
        }
        Ok(out)
    }
}

impl std::ops::Deref for ValueBytes {
    type Target = [u8];

    fn deref(&self) -> &[u8] {
        self.as_slice()
    }
}

/// Stack-resident encode (alias for [`ValueBytes::encode_typed`]).
pub fn encode_typed(ty: ValueType, value: TypedValue) -> Result<ValueBytes> {
    ValueBytes::encode_typed(ty, value)
}

pub fn decode_bool(bytes: &[u8]) -> Result<bool> {
    require!(bytes.len() == 1, ErrorCode::LoadTypeMismatch);
    Ok(bytes[0] != 0)
}

fn read_le<const N: usize>(bytes: &[u8]) -> Result<[u8; N]> {
    require!(bytes.len() == N, ErrorCode::LoadTypeMismatch);
    let mut arr = [0u8; N];
    arr.copy_from_slice(bytes);
    Ok(arr)
}

pub fn decode_typed(ty: ValueType, bytes: &[u8]) -> Result<TypedValue> {
    require!(bytes.len() == ty.size(), ErrorCode::LoadTypeMismatch);
    Ok(match ty {
        ValueType::Bool => TypedValue::Bool(decode_bool(bytes)?),
        ValueType::U8 => TypedValue::U8(bytes[0]),
        ValueType::U16 => TypedValue::U16(u16::from_le_bytes(read_le(bytes)?)),
        ValueType::U32 => TypedValue::U32(u32::from_le_bytes(read_le(bytes)?)),
        ValueType::U64 => TypedValue::U64(u64::from_le_bytes(read_le(bytes)?)),
        ValueType::U128 => TypedValue::U128(u128::from_le_bytes(read_le(bytes)?)),
        ValueType::I8 => TypedValue::I8(i8::from_le_bytes(read_le(bytes)?)),
        ValueType::I16 => TypedValue::I16(i16::from_le_bytes(read_le(bytes)?)),
        ValueType::I32 => TypedValue::I32(i32::from_le_bytes(read_le(bytes)?)),
        ValueType::I64 => TypedValue::I64(i64::from_le_bytes(read_le(bytes)?)),
        ValueType::I128 => TypedValue::I128(i128::from_le_bytes(read_le(bytes)?)),
        ValueType::F32 => TypedValue::F32(f32::from_le_bytes(read_le(bytes)?)),
        ValueType::F64 => TypedValue::F64(f64::from_le_bytes(read_le(bytes)?)),
    })
}

impl TypedValue {
    pub fn as_bool(self) -> Result<bool> {
        match self {
            TypedValue::Bool(v) => Ok(v),
            _ => Err(ErrorCode::LoadTypeMismatch.into()),
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub enum TypedValue {
    Bool(bool),
    U8(u8),
    U16(u16),
    U32(u32),
    U64(u64),
    U128(u128),
    I8(i8),
    I16(i16),
    I32(i32),
    I64(i64),
    I128(i128),
    F32(f32),
    F64(f64),
}
