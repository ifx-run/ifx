//! Frame tape record layout planning.

use super::error::LayoutError;
use crate::wire::ValueType;

/// Plan the next tape record layout: `(ty_offset, payload_offset)`.
///
/// **Packed layout (no alignment padding):** each record is `[ty:1][payload:ty.size()]`
/// placed immediately after the prior record — `ty @ cursor`, `payload @ cursor + 1`.
/// Off-chain simulators (SDK `planRecordOffsets`) must use identical rules.
pub fn plan_record_offsets(cursor: u32, ty: ValueType) -> Result<(u32, u32), LayoutError> {
    let ty_offset = cursor;
    let payload_offset = cursor
        .checked_add(1)
        .ok_or(LayoutError::TapeOutOfBounds)?;
    let _end = payload_offset
        .checked_add(ty.size() as u32)
        .ok_or(LayoutError::TapeOutOfBounds)?;
    Ok((ty_offset, payload_offset))
}

/// Byte length of one binding record: `[ty:1][payload]`.
pub fn record_byte_length(ty: ValueType) -> u32 {
    1 + ty.size() as u32
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::MAX_FRAME_TAPE_LEN;

    #[test]
    fn packed_u64_chain() {
        let mut cursor = 0u32;
        let (ty0, pay0) = plan_record_offsets(cursor, ValueType::U64).unwrap();
        assert_eq!((ty0, pay0), (0, 1));
        cursor = pay0 + 8;
        let (ty1, pay1) = plan_record_offsets(cursor, ValueType::U64).unwrap();
        assert_eq!((ty1, pay1), (9, 10));
        cursor = pay1 + 8;
        assert_eq!(cursor, 18);
    }

    #[test]
    fn record_byte_length_matches_end_cursor() {
        let cursor = 100u32;
        let ty = ValueType::Pubkey;
        let (_, payload) = plan_record_offsets(cursor, ty).unwrap();
        assert_eq!(payload + ty.size() as u32, cursor + record_byte_length(ty));
    }

    #[test]
    fn tape_len_bounds_constant() {
        assert!(MAX_FRAME_TAPE_LEN <= u16::MAX as u32);
    }
}
