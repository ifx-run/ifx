use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::types::ValueType;
use crate::state::value_codec::{copy_from, decode_bool, ValueBytes};
use crate::state::value_type_tag::{tag_to_value_type, value_type_to_tag};

use crate::frame_require;

use super::frame_error::{FrameError, FrameLayoutResult, FrameSite};
use super::frame_layout::FrameLayout;
use super::tape::plan_record_offsets;

/// Read-only access to a Frame account's tape region (zero-copy slice).
pub struct FrameRef<'a> {
    data: &'a [u8],
    layout: FrameLayout,
}

/// Mutable access: writes go directly into account data (no exit-time Borsh serialize).
pub struct FrameMut<'a> {
    data: &'a mut [u8],
    layout: FrameLayout,
}

/// Tape read API shared by [`Frame`], [`FrameRef`], and [`FrameMut`].
pub trait FrameReader {
    fn index_count(&self) -> Result<u16>;
    fn generation(&self) -> Result<u64>;
    fn index_cap(&self) -> u16;
    fn cursor(&self) -> Result<u32>;
    fn tape_len(&self) -> u32;
    fn read_value_type(&self, index: u8) -> Result<ValueType>;
    fn read_bytes(&self, index: u8, ty: ValueType) -> Result<ValueBytes>;
    fn read_bool_at(&self, index: u8) -> Result<bool> {
        decode_bool(&self.read_bytes(index, ValueType::Bool)?)
    }
}

/// Session reset and append (mut instructions only).
pub trait FrameWriter: FrameReader {
    fn reset_session(&mut self) -> Result<()>;
    fn append_value(&mut self, ty: ValueType, bytes: &[u8]) -> Result<u8>;
}

impl<'a> FrameRef<'a> {
    pub fn new(data: &'a [u8], layout: FrameLayout) -> FrameLayoutResult<Self> {
        let parsed = FrameLayout::parse(data)?;
        frame_require!(
            FrameSite::RefLayoutMismatch,
            parsed == layout,
            ErrorCode::AccountDataTooShort
        );
        Ok(Self { data, layout })
    }

    pub fn from_parsed(data: &'a [u8]) -> FrameLayoutResult<Self> {
        let layout = FrameLayout::parse(data)?;
        Ok(Self { data, layout })
    }

    fn resolve_payload_offset(&self, index: u8) -> FrameLayoutResult<u16> {
        let index_count = self.layout.read_index_count(self.data)?;
        frame_require!(
            FrameSite::BindingIndexRange,
            (index as u16) < index_count,
            ErrorCode::InvalidValueIndex
        );
        self.layout.read_payload_at(self.data, index as u16)
    }

    fn read_value_type_inner(&self, index: u8) -> FrameLayoutResult<ValueType> {
        let payload_offset = self.resolve_payload_offset(index)?;
        let pay = payload_offset as usize;
        frame_require!(
            FrameSite::ReadTypePayZero,
            pay >= 1,
            ErrorCode::InvalidValueIndex
        );
        let ty_off = pay
            .checked_sub(1)
            .ok_or_else(|| FrameError::new(FrameSite::ReadTypeTyUnderflow, ErrorCode::InvalidValueIndex))?;
        let tape = self.layout.tape(self.data)?;
        let ty_byte = *self
            .layout
            .tape_range(tape, ty_off, 1)?
            .first()
            .ok_or_else(|| FrameError::new(FrameSite::ReadTypeTagByte, ErrorCode::TapeOutOfBounds))?;
        tag_to_value_type(ty_byte).map_err(|_| {
            FrameError::new(FrameSite::ReadTypeTagByte, ErrorCode::InvalidValueTypeTag)
        })
    }

    fn read_bytes_inner(&self, index: u8, ty: ValueType) -> FrameLayoutResult<ValueBytes> {
        let stored = self.read_value_type_inner(index)?;
        frame_require!(
            FrameSite::ReadBytesTypeMismatch,
            stored == ty,
            ErrorCode::LoadTypeMismatch
        );
        let off = self.resolve_payload_offset(index)? as usize;
        let tape = self.layout.tape(self.data)?;
        let slice = self.layout.tape_range(tape, off, ty.size())?;
        copy_from(ty, slice).map_err(|_| {
            FrameError::new(FrameSite::ReadBytesTypeMismatch, ErrorCode::LoadTypeMismatch)
        })
    }
}

impl<'a> FrameMut<'a> {
    pub fn new(data: &'a mut [u8], layout: FrameLayout) -> FrameLayoutResult<Self> {
        let parsed = FrameLayout::parse(data)?;
        frame_require!(
            FrameSite::MutLayoutMismatch,
            parsed == layout,
            ErrorCode::AccountDataTooShort
        );
        Ok(Self { data, layout })
    }

    fn as_ref(&self) -> FrameRef<'_> {
        FrameRef {
            data: self.data,
            layout: self.layout,
        }
    }

    fn append_value_inner(&mut self, ty: ValueType, bytes: &[u8]) -> FrameLayoutResult<u8> {
        frame_require!(
            FrameSite::AppendInputLen,
            bytes.len() == ty.size(),
            ErrorCode::LoadTypeMismatch
        );
        let index_count = self.layout.read_index_count(self.data)?;
        frame_require!(
            FrameSite::AppendIndexCap,
            index_count < self.layout.index_cap,
            ErrorCode::IndexCapReached
        );
        let index = index_count;
        let cursor = self.layout.read_cursor(self.data)?;
        let (ty_offset, payload_offset) = plan_record_offsets(cursor, ty).map_err(|_| {
            FrameError::new(FrameSite::AppendPlanEnd, ErrorCode::TapeOutOfBounds)
        })?;
        let end = payload_offset
            .checked_add(ty.size() as u32)
            .ok_or_else(|| FrameError::new(FrameSite::AppendPlanEnd, ErrorCode::TapeOutOfBounds))?;
        frame_require!(
            FrameSite::AppendTapeCapacity,
            end <= self.layout.tape_len,
            ErrorCode::TapeOutOfBounds
        );

        {
            let tape = self.layout.tape_mut(self.data)?;
            let ty_off = ty_offset as usize;
            let pay_off = payload_offset as usize;
            *self
                .layout
                .tape_range_mut(tape, ty_off, 1)?
                .first_mut()
                .ok_or_else(|| FrameError::new(FrameSite::AppendTypeTag, ErrorCode::TapeOutOfBounds))?
                = value_type_to_tag(ty);
            self.layout
                .tape_range_mut(tape, pay_off, ty.size())?
                .copy_from_slice(bytes);
        }

        self.layout
            .write_payload_at(self.data, index, payload_offset as u16)?;
        self.layout.write_cursor(self.data, end)?;
        let new_count = index
            .checked_add(1)
            .ok_or_else(|| FrameError::new(FrameSite::AppendIndexCount, ErrorCode::IndexCapReached))?;
        self.layout.write_index_count(self.data, new_count)?;
        frame_require!(
            FrameSite::AppendIndexU8,
            index <= u8::MAX as u16,
            ErrorCode::IndexCapReached
        );
        Ok(index as u8)
    }
}

impl FrameReader for FrameRef<'_> {
    fn index_count(&self) -> Result<u16> {
        self.layout.read_index_count(self.data).map_err(Error::from)
    }

    fn generation(&self) -> Result<u64> {
        self.layout.read_generation(self.data).map_err(Error::from)
    }

    fn index_cap(&self) -> u16 {
        self.layout.index_cap
    }

    fn cursor(&self) -> Result<u32> {
        self.layout.read_cursor(self.data).map_err(Error::from)
    }

    fn tape_len(&self) -> u32 {
        self.layout.tape_len
    }

    fn read_value_type(&self, index: u8) -> Result<ValueType> {
        self.read_value_type_inner(index).map_err(Error::from)
    }

    fn read_bytes(&self, index: u8, ty: ValueType) -> Result<ValueBytes> {
        self.read_bytes_inner(index, ty).map_err(Error::from)
    }
}

impl FrameReader for FrameMut<'_> {
    fn index_count(&self) -> Result<u16> {
        self.as_ref().index_count()
    }

    fn generation(&self) -> Result<u64> {
        self.as_ref().generation()
    }

    fn index_cap(&self) -> u16 {
        self.layout.index_cap
    }

    fn cursor(&self) -> Result<u32> {
        self.as_ref().cursor()
    }

    fn tape_len(&self) -> u32 {
        self.layout.tape_len
    }

    fn read_value_type(&self, index: u8) -> Result<ValueType> {
        self.as_ref().read_value_type(index)
    }

    fn read_bytes(&self, index: u8, ty: ValueType) -> Result<ValueBytes> {
        self.as_ref().read_bytes(index, ty)
    }
}

impl FrameWriter for FrameMut<'_> {
    fn reset_session(&mut self) -> Result<()> {
        let gen = self
            .layout
            .read_generation(self.data)
            .map_err(Error::from)?;
        self.layout
            .write_generation(self.data, gen.wrapping_add(1))
            .map_err(Error::from)?;
        self.layout.write_cursor(self.data, 0).map_err(Error::from)?;
        self.layout.write_index_count(self.data, 0).map_err(Error::from)
    }

    fn append_value(&mut self, ty: ValueType, bytes: &[u8]) -> Result<u8> {
        self.append_value_inner(ty, bytes).map_err(Error::from)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::index_cap_for_tape_len;
    use crate::state::Frame;

    fn serialize_frame(frame: &Frame) -> Vec<u8> {
        let mut buf = Vec::new();
        frame.try_serialize(&mut buf).expect("serialize");
        buf
    }

    fn empty_frame(tape_len: u32) -> Frame {
        let index_cap = index_cap_for_tape_len(tape_len);
        Frame {
            authority: Pubkey::new_unique(),
            cursor: 0,
            index_count: 0,
            index_cap,
            generation: 0,
            payload_at: vec![0u16; index_cap as usize],
            tape: vec![0u8; tape_len as usize],
        }
    }

    #[test]
    fn frame_mut_matches_frame_append_semantics() {
        let tape_len = 512u32;
        let mut heap = empty_frame(tape_len);
        let mut wire = serialize_frame(&empty_frame(tape_len));

        let layout = FrameLayout::parse(&wire).unwrap();
        let mut view = FrameMut::new(&mut wire, layout).unwrap();

        let i0_heap = heap.append_value(ValueType::U64, &7u64.to_le_bytes()).unwrap();
        let i0_wire = view.append_value(ValueType::U64, &7u64.to_le_bytes()).unwrap();
        assert_eq!(i0_heap, i0_wire);

        let i1_heap = heap.append_value(ValueType::U64, &9u64.to_le_bytes()).unwrap();
        let i1_wire = view.append_value(ValueType::U64, &9u64.to_le_bytes()).unwrap();
        assert_eq!(i1_heap, i1_wire);

        assert_eq!(heap.cursor, view.cursor().unwrap());
        assert_eq!(heap.index_count, view.index_count().unwrap());
        assert_eq!(
            heap.read_bytes(0, ValueType::U64).unwrap(),
            view.read_bytes(0, ValueType::U64).unwrap()
        );
        assert_eq!(
            heap.read_bytes(1, ValueType::U64).unwrap(),
            view.read_bytes(1, ValueType::U64).unwrap()
        );
    }

    #[test]
    fn reset_clears_session_fields_only() {
        let tape_len = 256u32;
        let mut wire = serialize_frame(&empty_frame(tape_len));
        let tape_before = {
            let layout = FrameLayout::parse(&wire).unwrap();
            let mut view = FrameMut::new(&mut wire, layout).unwrap();
            view.append_value(ValueType::U8, &[42]).unwrap();
            layout.tape(&wire).unwrap().to_vec()
        };

        let layout = FrameLayout::parse(&wire).unwrap();
        let mut view = FrameMut::new(&mut wire, layout).unwrap();
        view.reset_session().unwrap();
        assert_eq!(view.cursor().unwrap(), 0);
        assert_eq!(view.index_count().unwrap(), 0);
        assert_eq!(view.generation().unwrap(), 1);
        assert_eq!(layout.tape(&wire).unwrap(), tape_before.as_slice());
    }

    #[test]
    fn append_at_cap_returns_error_not_panic() {
        let tape_len = 20u32;
        let mut wire = serialize_frame(&empty_frame(tape_len));
        let layout = FrameLayout::parse(&wire).unwrap();
        let mut view = FrameMut::new(&mut wire, layout).unwrap();
        let cap = view.index_cap();
        for _ in 0..cap {
            view.append_value(ValueType::U8, &[1]).unwrap();
        }
        let err = view.append_value(ValueType::U8, &[1]).unwrap_err();
        assert_eq!(err, ErrorCode::IndexCapReached.into());
    }

    #[test]
    fn read_out_of_range_returns_error_with_site() {
        let tape_len = 256u32;
        let wire = serialize_frame(&empty_frame(tape_len));
        let view = FrameRef::from_parsed(&wire).unwrap();
        let err = view.read_bytes_inner(0, ValueType::U64).unwrap_err();
        assert_eq!(err.site, FrameSite::BindingIndexRange);
        assert_eq!(err.code, ErrorCode::InvalidValueIndex);
    }

    #[test]
    fn layout_mismatch_rejected_with_site() {
        let tape_len = 256u32;
        let mut wire = serialize_frame(&empty_frame(tape_len));
        let mut bad = FrameLayout::parse(&wire).unwrap();
        bad.tape_len += 1;
        let err = FrameMut::new(&mut wire, bad).err().unwrap();
        assert_eq!(err.site, FrameSite::MutLayoutMismatch);
    }
}
