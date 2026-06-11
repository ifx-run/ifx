use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::layout_map::map_layout_err;
use crate::state::types::ValueType;
use crate::state::value_codec::{copy_from, decode_bool, ValueBytes};
use crate::state::value_type_tag::{tag_to_value_type, value_type_to_tag};

use super::frame_access::{FrameReader, FrameWriter};
use super::Frame;

/// Plan the next tape record layout: `(ty_offset, payload_offset)`.
///
/// **Packed layout (no alignment padding):** each record is `[ty:1][payload:ty.size()]`
/// placed immediately after the prior record — `ty @ cursor`, `payload @ cursor + 1`.
/// Off-chain simulators (SDK `planRecordOffsets`) must use identical rules.
pub fn plan_record_offsets(cursor: u32, ty: ValueType) -> Result<(u32, u32)> {
    ifx_core::layout::plan_record_offsets(cursor, ty).map_err(map_layout_err)
}

impl FrameReader for Frame {
    fn index_count(&self) -> Result<u16> {
        Ok(self.index_count)
    }

    fn generation(&self) -> Result<u64> {
        Ok(self.generation)
    }

    fn index_cap(&self) -> u16 {
        self.index_cap
    }

    fn cursor(&self) -> Result<u32> {
        Ok(self.cursor)
    }

    fn tape_len(&self) -> u32 {
        self.tape.len() as u32
    }

    fn read_value_type(&self, index: u8) -> Result<ValueType> {
        let payload_offset = self.resolve_payload_offset(index)?;
        let pay = payload_offset as usize;
        require!(pay >= 1, ErrorCode::InvalidValueIndex);
        let ty_off = pay
            .checked_sub(1)
            .ok_or(ErrorCode::InvalidValueIndex)?;
        require!(ty_off < self.tape.len(), ErrorCode::TapeOutOfBounds);
        tag_to_value_type(self.tape[ty_off])
    }

    fn read_bytes(&self, index: u8, ty: ValueType) -> Result<ValueBytes> {
        let stored = self.read_value_type(index)?;
        require!(stored == ty, ErrorCode::LoadTypeMismatch);
        let off = self.resolve_payload_offset(index)? as usize;
        let end = off
            .checked_add(ty.size())
            .ok_or(ErrorCode::TapeOutOfBounds)?;
        require!(end <= self.tape.len(), ErrorCode::TapeOutOfBounds);
        copy_from(ty, &self.tape[off..end])
    }

    fn read_bool_at(&self, index: u8) -> Result<bool> {
        decode_bool(&self.read_bytes(index, ValueType::Bool)?)
    }
}

impl FrameWriter for Frame {
    fn reset_session(&mut self) -> Result<()> {
        self.generation = self.generation.wrapping_add(1);
        self.cursor = 0;
        self.index_count = 0;
        Ok(())
    }

    fn append_value(&mut self, ty: ValueType, bytes: &[u8]) -> Result<u8> {
        require!(bytes.len() == ty.size(), ErrorCode::LoadTypeMismatch);
        require!(
            self.index_count < self.index_cap,
            ErrorCode::IndexCapReached
        );
        let index = self.index_count;
        let (ty_offset, payload_offset) = plan_record_offsets(self.cursor, ty)?;
        let end = payload_offset
            .checked_add(ty.size() as u32)
            .ok_or(ErrorCode::TapeOutOfBounds)?;
        require!(end <= self.tape.len() as u32, ErrorCode::TapeOutOfBounds);

        let ty_off = ty_offset as usize;
        let pay_off = payload_offset as usize;
        self.tape[ty_off] = value_type_to_tag(ty);
        self.tape[pay_off..pay_off + ty.size()].copy_from_slice(bytes);
        require!(index <= u8::MAX as u16, ErrorCode::IndexCapReached);
        self.payload_at[index as usize] = payload_offset as u16;
        self.cursor = end;
        self.index_count = index
            .checked_add(1)
            .ok_or(ErrorCode::IndexCapReached)?;
        Ok(index as u8)
    }
}

impl Frame {
    fn resolve_payload_offset(&self, index: u8) -> Result<u16> {
        require!(
            (index as u16) < self.index_count,
            ErrorCode::InvalidValueIndex
        );
        Ok(self.payload_at[index as usize])
    }

    pub fn read_typed(
        &self,
        index: u8,
        ty: ValueType,
    ) -> Result<crate::state::value_codec::TypedValue> {
        let stored = self.read_value_type(index)?;
        require!(stored == ty, ErrorCode::LoadTypeMismatch);
        let off = self.resolve_payload_offset(index)? as usize;
        let end = off
            .checked_add(ty.size())
            .ok_or(ErrorCode::TapeOutOfBounds)?;
        require!(end <= self.tape.len(), ErrorCode::TapeOutOfBounds);
        crate::state::value_codec::decode_typed(ty, &self.tape[off..end])
    }

    pub fn tape_len(&self) -> usize {
        self.tape.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::index_cap_for_tape_len;
    use crate::state::types::ValueType;

    #[test]
    fn append_returns_binding_index() {
        let tape_len = 256u32;
        let cap = index_cap_for_tape_len(tape_len);
        let mut frame = Frame {
            authority: Pubkey::default(),
            cursor: 0,
            index_count: 0,
            index_cap: cap,
            generation: 0,
            payload_at: vec![0u16; cap as usize],
            tape: vec![0u8; tape_len as usize],
        };
        let i0 = frame
            .append_value(ValueType::U64, &7u64.to_le_bytes())
            .unwrap();
        let i1 = frame
            .append_value(ValueType::U64, &9u64.to_le_bytes())
            .unwrap();
        assert_eq!(i0, 0);
        assert_eq!(i1, 1);
        assert_eq!(
            frame.read_bytes(0, ValueType::U64).unwrap().as_slice(),
            7u64.to_le_bytes().as_slice()
        );
        assert_eq!(frame.payload_at[0], 1);
        assert_eq!(frame.payload_at[1], 10);
    }

    #[test]
    fn index_cap_from_tape_len() {
        assert_eq!(index_cap_for_tape_len(20), 10);
        assert_eq!(index_cap_for_tape_len(256), 128);
        assert_eq!(index_cap_for_tape_len(8192), 256);
    }
}
