//! Frame tape reads for structured CPI assembly.

use super::error::StructuredCpiError;
use crate::layout::ValueBytes;
use crate::wire::ValueType;

/// Supplies binding payloads when assembling official-program ix `data`.
pub trait StructuredCpiFrame {
    fn read_value_type(&self, index: u8) -> Result<ValueType, StructuredCpiError>;
    fn read_bytes(&self, index: u8, ty: ValueType) -> Result<ValueBytes, StructuredCpiError>;
}
