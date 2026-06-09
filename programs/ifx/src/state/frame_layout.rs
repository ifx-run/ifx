use anchor_lang::prelude::*;

use crate::{constants::ACCOUNT_DISC_FRAME, error::ErrorCode, frame_require};

use super::frame_error::{FrameError, FrameLayoutResult, FrameSite};

/// Byte offset of `Frame.authority` (after 1-byte discriminator).
pub const OFF_AUTHORITY: usize = 1;
pub const OFF_CLOSE_AUTHORITY: usize = OFF_AUTHORITY;
pub const OFF_CURSOR: usize = 33;
pub const OFF_INDEX_COUNT: usize = 37;
pub const OFF_INDEX_CAP: usize = 39;
pub const OFF_GENERATION: usize = 41;
pub const OFF_PAYLOAD_AT_LEN: usize = 49;
pub const OFF_PAYLOAD_AT: usize = 53;

/// Minimum account data length: disc + fixed header + empty vec prefixes.
pub const FRAME_MIN_DATA_LEN: usize = OFF_PAYLOAD_AT + 4 + 4;

const OFF_AUTHORITY_END: usize = OFF_AUTHORITY + 32;
const OFF_CURSOR_END: usize = OFF_CURSOR + 4;
const OFF_INDEX_COUNT_END: usize = OFF_INDEX_COUNT + 2;
const OFF_INDEX_CAP_END: usize = OFF_INDEX_CAP + 2;
const OFF_GENERATION_END: usize = OFF_GENERATION + 8;
const OFF_PAYLOAD_AT_LEN_END: usize = OFF_PAYLOAD_AT_LEN + 4;

/// Compile-time layout chain (must match SDK `decodeFrameAccount`).
const _: () = {
    assert!(OFF_AUTHORITY == 1);
    assert!(OFF_CURSOR == OFF_AUTHORITY_END);
    assert!(OFF_INDEX_COUNT == OFF_CURSOR_END);
    assert!(OFF_INDEX_CAP == OFF_INDEX_COUNT_END);
    assert!(OFF_GENERATION == OFF_INDEX_CAP_END);
    assert!(OFF_PAYLOAD_AT_LEN == OFF_GENERATION_END);
    assert!(OFF_PAYLOAD_AT == OFF_PAYLOAD_AT_LEN_END);
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FrameLayout {
    pub index_cap: u16,
    pub tape_len: u32,
    pub payload_at_off: usize,
    pub tape_len_off: usize,
    pub tape_off: usize,
}

impl FrameLayout {
    /// Parse layout from account data without allocating `Vec`s.
    pub fn parse(data: &[u8]) -> FrameLayoutResult<Self> {
        frame_require!(
            FrameSite::ParseMinLen,
            data.len() >= FRAME_MIN_DATA_LEN,
            ErrorCode::AccountDataTooShort
        );
        frame_require!(
            FrameSite::ParseDiscriminator,
            data[0] == ACCOUNT_DISC_FRAME,
            ErrorCode::AccountDataTooShort
        );

        let index_cap = read_u16_le(
            FrameSite::ParseIndexCap,
            field(FrameSite::ParseIndexCap, data, OFF_INDEX_CAP, 2)?,
        )?;
        let payload_at_len = read_u32_le(
            FrameSite::ParsePayloadAtLen,
            field(FrameSite::ParsePayloadAtLen, data, OFF_PAYLOAD_AT_LEN, 4)?,
        )?;
        frame_require!(
            FrameSite::ParsePayloadAtLenMismatch,
            payload_at_len == index_cap as u32,
            ErrorCode::AccountDataTooShort
        );

        let payload_at_off = OFF_PAYLOAD_AT;
        let tape_len_off = payload_at_off
            .checked_add(index_cap as usize * 2)
            .ok_or_else(|| {
                FrameError::new(
                    FrameSite::ParseTapeLenOffOverflow,
                    ErrorCode::AccountDataTooShort,
                )
            })?;
        frame_require!(
            FrameSite::ParseTapeLenPrefix,
            data.len() >= tape_len_off + 4,
            ErrorCode::AccountDataTooShort
        );

        let tape_len = read_u32_le(
            FrameSite::ParseTapeLenPrefix,
            field(FrameSite::ParseTapeLenPrefix, data, tape_len_off, 4)?,
        )?;
        let tape_off = tape_len_off
            .checked_add(4)
            .ok_or_else(|| {
                FrameError::new(
                    FrameSite::ParseTapeOffOverflow,
                    ErrorCode::AccountDataTooShort,
                )
            })?;
        let end = tape_off
            .checked_add(tape_len as usize)
            .ok_or_else(|| {
                FrameError::new(
                    FrameSite::ParseTotalLenOverflow,
                    ErrorCode::AccountDataTooShort,
                )
            })?;
        frame_require!(
            FrameSite::ParseTotalLenMismatch,
            data.len() == end,
            ErrorCode::AccountDataTooShort
        );

        Ok(Self {
            index_cap,
            tape_len,
            payload_at_off,
            tape_len_off,
            tape_off,
        })
    }

    /// Total account data byte length (equals `AccountInfo::data_len()` at parse time).
    pub fn total_data_len(&self) -> u32 {
        (self.tape_off + self.tape_len as usize) as u32
    }

    pub fn space_for(index_cap: u16, tape_len: u32) -> usize {
        OFF_PAYLOAD_AT + index_cap as usize * 2 + 4 + tape_len as usize
    }

    pub fn read_authority(&self, data: &[u8]) -> FrameLayoutResult<Pubkey> {
        read_authority(data)
    }

    pub fn read_close_authority(&self, data: &[u8]) -> FrameLayoutResult<Pubkey> {
        read_authority(data)
    }

    pub fn read_cursor(&self, data: &[u8]) -> FrameLayoutResult<u32> {
        read_u32_le(
            FrameSite::ReadCursor,
            field(FrameSite::ReadCursor, data, OFF_CURSOR, 4)?,
        )
    }

    pub fn read_index_count(&self, data: &[u8]) -> FrameLayoutResult<u16> {
        read_u16_le(
            FrameSite::ReadIndexCount,
            field(FrameSite::ReadIndexCount, data, OFF_INDEX_COUNT, 2)?,
        )
    }

    pub fn read_generation(&self, data: &[u8]) -> FrameLayoutResult<u64> {
        read_u64_le(
            FrameSite::ReadGeneration,
            field(FrameSite::ReadGeneration, data, OFF_GENERATION, 8)?,
        )
    }

    pub fn write_cursor(&self, data: &mut [u8], v: u32) -> FrameLayoutResult<()> {
        write_u32_le(
            FrameSite::WriteCursor,
            field_mut(FrameSite::WriteCursor, data, OFF_CURSOR, 4)?,
            v,
        )
    }

    pub fn write_index_count(&self, data: &mut [u8], v: u16) -> FrameLayoutResult<()> {
        write_u16_le(
            FrameSite::WriteIndexCount,
            field_mut(FrameSite::WriteIndexCount, data, OFF_INDEX_COUNT, 2)?,
            v,
        )
    }

    pub fn write_generation(&self, data: &mut [u8], v: u64) -> FrameLayoutResult<()> {
        write_u64_le(
            FrameSite::WriteGeneration,
            field_mut(FrameSite::WriteGeneration, data, OFF_GENERATION, 8)?,
            v,
        )
    }

    pub fn payload_at_offset_for_index(&self, index: u16) -> FrameLayoutResult<usize> {
        self.payload_at_off
            .checked_add(index as usize * 2)
            .ok_or_else(|| {
                FrameError::new(
                    FrameSite::PayloadAtIndexOverflow,
                    ErrorCode::TapeOutOfBounds,
                )
            })
    }

    pub fn read_payload_at(&self, data: &[u8], index: u16) -> FrameLayoutResult<u16> {
        let off = self.payload_at_offset_for_index(index)?;
        read_u16_le(
            FrameSite::ReadPayloadAt,
            field(FrameSite::ReadPayloadAt, data, off, 2)?,
        )
    }

    pub fn write_payload_at(
        &self,
        data: &mut [u8],
        index: u16,
        payload_off: u16,
    ) -> FrameLayoutResult<()> {
        let off = self.payload_at_offset_for_index(index)?;
        write_u16_le(
            FrameSite::WritePayloadAt,
            field_mut(FrameSite::WritePayloadAt, data, off, 2)?,
            payload_off,
        )
    }

    pub fn tape<'a>(&self, data: &'a [u8]) -> FrameLayoutResult<&'a [u8]> {
        field(
            FrameSite::TapeField,
            data,
            self.tape_off,
            self.tape_len as usize,
        )
    }

    pub fn tape_mut<'a>(&self, data: &'a mut [u8]) -> FrameLayoutResult<&'a mut [u8]> {
        field_mut(
            FrameSite::TapeMutField,
            data,
            self.tape_off,
            self.tape_len as usize,
        )
    }

    pub fn tape_range<'a>(
        &self,
        tape: &'a [u8],
        start: usize,
        len: usize,
    ) -> FrameLayoutResult<&'a [u8]> {
        let end = start
            .checked_add(len)
            .ok_or_else(|| {
                FrameError::new(FrameSite::TapeRangeAddOverflow, ErrorCode::TapeOutOfBounds)
            })?;
        tape.get(start..end)
            .ok_or_else(|| FrameError::new(FrameSite::TapeRangeOob, ErrorCode::TapeOutOfBounds))
    }

    pub fn tape_range_mut<'a>(
        &self,
        tape: &'a mut [u8],
        start: usize,
        len: usize,
    ) -> FrameLayoutResult<&'a mut [u8]> {
        let end = start
            .checked_add(len)
            .ok_or_else(|| {
                FrameError::new(
                    FrameSite::TapeRangeMutAddOverflow,
                    ErrorCode::TapeOutOfBounds,
                )
            })?;
        tape.get_mut(start..end).ok_or_else(|| {
            FrameError::new(FrameSite::TapeRangeMutOob, ErrorCode::TapeOutOfBounds)
        })
    }
}

/// Bounds-checked subslice (never panics).
pub fn field(site: FrameSite, data: &[u8], off: usize, len: usize) -> FrameLayoutResult<&[u8]> {
    let end = off
        .checked_add(len)
        .ok_or_else(|| FrameError::new(site, ErrorCode::AccountDataTooShort))?;
    data.get(off..end)
        .ok_or_else(|| FrameError::new(site, ErrorCode::AccountDataTooShort))
}

pub fn field_mut(
    site: FrameSite,
    data: &mut [u8],
    off: usize,
    len: usize,
) -> FrameLayoutResult<&mut [u8]> {
    let end = off
        .checked_add(len)
        .ok_or_else(|| FrameError::new(site, ErrorCode::AccountDataTooShort))?;
    data.get_mut(off..end)
        .ok_or_else(|| FrameError::new(site, ErrorCode::AccountDataTooShort))
}

pub fn read_authority(data: &[u8]) -> FrameLayoutResult<Pubkey> {
    let bytes = field(FrameSite::AuthorityField, data, OFF_AUTHORITY, 32)?;
    Pubkey::try_from(bytes).map_err(|_| {
        FrameError::new(
            FrameSite::AuthorityPubkey,
            ErrorCode::AccountDataTooShort,
        )
    })
}

pub fn read_close_authority(data: &[u8]) -> FrameLayoutResult<Pubkey> {
    read_authority(data)
}

pub fn read_u16_le(site: FrameSite, bytes: &[u8]) -> FrameLayoutResult<u16> {
    bytes
        .get(0..2)
        .map(|b| u16::from_le_bytes([b[0], b[1]]))
        .ok_or_else(|| FrameError::new(site, ErrorCode::AccountDataTooShort))
}

pub fn read_u32_le(site: FrameSite, bytes: &[u8]) -> FrameLayoutResult<u32> {
    bytes
        .get(0..4)
        .map(|b| u32::from_le_bytes([b[0], b[1], b[2], b[3]]))
        .ok_or_else(|| FrameError::new(site, ErrorCode::AccountDataTooShort))
}

pub fn read_u64_le(site: FrameSite, bytes: &[u8]) -> FrameLayoutResult<u64> {
    bytes
        .get(0..8)
        .map(|b| {
            u64::from_le_bytes([
                b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7],
            ])
        })
        .ok_or_else(|| FrameError::new(site, ErrorCode::AccountDataTooShort))
}

pub fn write_u16_le(site: FrameSite, bytes: &mut [u8], v: u16) -> FrameLayoutResult<()> {
    let out = bytes
        .get_mut(0..2)
        .ok_or_else(|| FrameError::new(site, ErrorCode::AccountDataTooShort))?;
    out.copy_from_slice(&v.to_le_bytes());
    Ok(())
}

pub fn write_u32_le(site: FrameSite, bytes: &mut [u8], v: u32) -> FrameLayoutResult<()> {
    let out = bytes
        .get_mut(0..4)
        .ok_or_else(|| FrameError::new(site, ErrorCode::AccountDataTooShort))?;
    out.copy_from_slice(&v.to_le_bytes());
    Ok(())
}

pub fn write_u64_le(site: FrameSite, bytes: &mut [u8], v: u64) -> FrameLayoutResult<()> {
    let out = bytes
        .get_mut(0..8)
        .ok_or_else(|| FrameError::new(site, ErrorCode::AccountDataTooShort))?;
    out.copy_from_slice(&v.to_le_bytes());
    Ok(())
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

    fn empty_frame(authority: Pubkey, tape_len: u32) -> Frame {
        let index_cap = index_cap_for_tape_len(tape_len);
        Frame {
            authority,
            cursor: 0,
            index_count: 0,
            index_cap,
            generation: 0,
            payload_at: vec![0u16; index_cap as usize],
            tape: vec![0u8; tape_len as usize],
        }
    }

    #[test]
    fn space_for_matches_frame_space_for() {
        for tape_len in [1u32, 256, 4096, 8192] {
            let cap = index_cap_for_tape_len(tape_len);
            assert_eq!(
                FrameLayout::space_for(cap, tape_len),
                Frame::space_for(tape_len).unwrap()
            );
        }
    }

    #[test]
    fn parse_matches_anchor_serialize() {
        let auth = Pubkey::new_unique();
        for tape_len in [256u32, 4096, 8192] {
            let frame = empty_frame(auth, tape_len);
            let data = serialize_frame(&frame);
            let layout = FrameLayout::parse(&data).unwrap();
            assert_eq!(layout.index_cap, index_cap_for_tape_len(tape_len));
            assert_eq!(layout.tape_len, tape_len);
            assert_eq!(layout.total_data_len() as usize, data.len());
            assert_eq!(layout.read_close_authority(&data).unwrap(), auth);
            assert_eq!(layout.read_cursor(&data).unwrap(), 0);
            assert_eq!(layout.read_index_count(&data).unwrap(), 0);
            assert_eq!(layout.read_generation(&data).unwrap(), 0);
        }
    }

    #[test]
    fn parse_rejects_corrupt_layout_with_distinct_sites() {
        let auth = Pubkey::new_unique();
        let mut data = serialize_frame(&empty_frame(auth, 256));

        data[0] = 0;
        let err = FrameLayout::parse(&data).unwrap_err();
        assert_eq!(err.site, FrameSite::ParseDiscriminator);
        assert_eq!(err.code, ErrorCode::AccountDataTooShort);

        data = serialize_frame(&empty_frame(auth, 256));
        data.truncate(data.len() - 1);
        let err = FrameLayout::parse(&data).unwrap_err();
        assert_eq!(err.site, FrameSite::ParseTotalLenMismatch);

        data = serialize_frame(&empty_frame(auth, 256));
        write_u32_le(
            FrameSite::WritePayloadAt,
            field_mut(FrameSite::WritePayloadAt, &mut data, OFF_PAYLOAD_AT_LEN, 4).unwrap(),
            999,
        )
        .unwrap();
        let err = FrameLayout::parse(&data).unwrap_err();
        assert_eq!(err.site, FrameSite::ParsePayloadAtLenMismatch);
    }

    #[test]
    fn header_roundtrip_via_layout() {
        let auth = Pubkey::new_unique();
        let mut data = serialize_frame(&empty_frame(auth, 512));
        let layout = FrameLayout::parse(&data).unwrap();
        layout.write_cursor(&mut data, 42).unwrap();
        layout.write_index_count(&mut data, 3).unwrap();
        layout.write_payload_at(&mut data, 1, 17).unwrap();
        assert_eq!(layout.read_cursor(&data).unwrap(), 42);
        assert_eq!(layout.read_index_count(&data).unwrap(), 3);
        assert_eq!(layout.read_payload_at(&data, 1).unwrap(), 17);
        assert!(FrameLayout::parse(&data).is_ok());
    }

    #[test]
    fn tape_range_never_panics_on_short_buffer() {
        let layout = FrameLayout {
            index_cap: 4,
            tape_len: 8,
            payload_at_off: 45,
            tape_len_off: 53,
            tape_off: 57,
        };
        let tape = [0u8; 4];
        assert!(layout.tape_range(&tape, 0, 8).is_err());
        assert!(layout.tape_range(&tape, 2, 2).is_ok());
    }
}
