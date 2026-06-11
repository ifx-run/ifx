//! Frame tape primitive types (`ValueType`).

use anchor_lang::prelude::*;

/// Primitive types supported in Frame tape and `ifx_let` (little-endian, fixed width).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ValueType {
    /// 1 byte
    Bool,
    /// 1 byte, unsigned
    U8,
    /// 2 bytes, unsigned
    U16,
    /// 4 bytes, unsigned
    U32,
    /// 8 bytes, unsigned
    U64,
    /// 16 bytes, unsigned
    U128,
    /// 1 byte, signed
    I8,
    /// 2 bytes, signed
    I16,
    /// 4 bytes, signed
    I32,
    /// 8 bytes, signed
    I64,
    /// 16 bytes, signed
    I128,
    /// 4 bytes, IEEE-754
    F32,
    /// 8 bytes, IEEE-754
    F64,
    /// 32 bytes, Solana public key (raw).
    Pubkey,
}

impl ValueType {
    pub const fn size(self) -> usize {
        match self {
            ValueType::Bool | ValueType::U8 | ValueType::I8 => 1,
            ValueType::U16 | ValueType::I16 => 2,
            ValueType::U32 | ValueType::I32 | ValueType::F32 => 4,
            ValueType::U64 | ValueType::I64 | ValueType::F64 => 8,
            ValueType::U128 | ValueType::I128 => 16,
            ValueType::Pubkey => 32,
        }
    }

    pub const fn supports_arithmetic(self) -> bool {
        !matches!(self, ValueType::Bool)
    }

    pub const fn supports_ordering(self) -> bool {
        self.supports_arithmetic()
    }

    pub const fn supports_neg(self) -> bool {
        matches!(
            self,
            ValueType::I8
                | ValueType::I16
                | ValueType::I32
                | ValueType::I64
                | ValueType::I128
                | ValueType::F32
                | ValueType::F64
        )
    }
}
