//! On-chain Frame account decode and tape readback (tests / local debug only).

use ifx_core::layout::{decode_typed, TypedValue};
use solana_sdk::pubkey::Pubkey;

use crate::constants::ACCOUNT_DISC_FRAME;
use crate::error::ScratchError;
use crate::typed::ScratchValue;

const OFF_AUTHORITY: usize = 1;
const OFF_CURSOR: usize = 33;
const OFF_INDEX_COUNT: usize = 37;
const OFF_INDEX_CAP: usize = 39;
const OFF_GENERATION: usize = 41;
const OFF_PAYLOAD_AT_LEN: usize = 49;
const OFF_PAYLOAD_AT: usize = 53;

/// Snapshot of on-chain Frame account data.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DecodedFrame {
    pub authority: Pubkey,
    pub cursor: u32,
    pub index_count: u16,
    pub index_cap: u16,
    pub generation: u64,
    pub payload_at: Vec<u16>,
    pub tape: Vec<u8>,
}

impl DecodedFrame {
    pub fn read_u64(&self, sv: &ScratchValue) -> Result<u64, ScratchError> {
        match self.read_value(sv)? {
            TypedValue::U64(v) => Ok(v),
            other => Err(ScratchError::FrameRead(format!(
                "expected u64 at index {}, got {:?}",
                sv.index, other
            ))),
        }
    }

    pub fn read_value(&self, sv: &ScratchValue) -> Result<TypedValue, ScratchError> {
        let ty = sv.ty;
        let off = self.payload_offset(sv.index)?;
        let end = off as usize + ty.size();
        if end > self.tape.len() {
            return Err(ScratchError::FrameRead(format!(
                "read past frame tape ({end} > {}) at byte {off}",
                self.tape.len()
            )));
        }
        decode_typed(ty, &self.tape[off as usize..end])
            .map_err(|e| ScratchError::FrameRead(format!("decode payload: {e:?}")))
    }

    fn payload_offset(&self, index: u8) -> Result<u16, ScratchError> {
        if index as usize >= self.index_count as usize {
            return Err(ScratchError::FrameRead(format!(
                "binding index {index} out of range (index_count={})",
                self.index_count
            )));
        }
        self.payload_at
            .get(index as usize)
            .copied()
            .ok_or_else(|| ScratchError::FrameRead(format!("missing payload_at[{index}]")))
    }
}

/// Parse Frame account bytes (including 1-byte discriminator).
pub fn decode_frame_account(data: &[u8]) -> Result<DecodedFrame, ScratchError> {
    if data.len() < OFF_PAYLOAD_AT + 4 + 4 {
        return Err(ScratchError::FrameDecode("frame account data too short".into()));
    }
    if data[0] != ACCOUNT_DISC_FRAME {
        return Err(ScratchError::FrameDecode(
            "invalid Frame account discriminator".into(),
        ));
    }
    let authority = Pubkey::try_from(&data[OFF_AUTHORITY..OFF_AUTHORITY + 32])
        .map_err(|_| ScratchError::FrameDecode("invalid authority pubkey".into()))?;
    let cursor = u32::from_le_bytes(data[OFF_CURSOR..OFF_CURSOR + 4].try_into().unwrap());
    let index_count = u16::from_le_bytes(data[OFF_INDEX_COUNT..OFF_INDEX_COUNT + 2].try_into().unwrap());
    let index_cap = u16::from_le_bytes(data[OFF_INDEX_CAP..OFF_INDEX_CAP + 2].try_into().unwrap());
    let generation = u64::from_le_bytes(data[OFF_GENERATION..OFF_GENERATION + 8].try_into().unwrap());
    let payload_at_len = u32::from_le_bytes(
        data[OFF_PAYLOAD_AT_LEN..OFF_PAYLOAD_AT_LEN + 4]
            .try_into()
            .unwrap(),
    );
    let mut o = OFF_PAYLOAD_AT;
    let mut payload_at = Vec::with_capacity(payload_at_len as usize);
    for _ in 0..payload_at_len {
        if o + 2 > data.len() {
            return Err(ScratchError::FrameDecode("truncated payload_at".into()));
        }
        payload_at.push(u16::from_le_bytes(data[o..o + 2].try_into().unwrap()));
        o += 2;
    }
    if payload_at_len != index_cap as u32 {
        return Err(ScratchError::FrameDecode(format!(
            "payload_at length mismatch: {payload_at_len} vs index_cap {index_cap}"
        )));
    }
    if o + 4 > data.len() {
        return Err(ScratchError::FrameDecode("truncated tape length".into()));
    }
    let tape_len = u32::from_le_bytes(data[o..o + 4].try_into().unwrap());
    o += 4;
    if o + tape_len as usize != data.len() {
        return Err(ScratchError::FrameDecode("tape length mismatch".into()));
    }
    let tape = data[o..o + tape_len as usize].to_vec();
    Ok(DecodedFrame {
        authority,
        cursor,
        index_count,
        index_cap,
        generation,
        payload_at,
        tape,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use ifx_core::wire::{Expr, LetBinding, ValueType};

    #[test]
    fn decode_rejects_short_data() {
        assert!(decode_frame_account(&[ACCOUNT_DISC_FRAME]).is_err());
    }

    #[test]
    fn read_u64_roundtrip_on_tape() {
        let dec = DecodedFrame {
            authority: Pubkey::new_unique(),
            cursor: 8,
            index_count: 1,
            index_cap: 1,
            generation: 0,
            payload_at: vec![0],
            tape: 1u64.to_le_bytes().to_vec(),
        };
        let sv = ScratchValue {
            binding: LetBinding::Eval {
                expr: Expr::ConstU64(1),
            },
            index: 0,
            ty: ValueType::U64,
            remaining: vec![],
        };
        assert_eq!(dec.read_u64(&sv).unwrap(), 1);
    }
}
