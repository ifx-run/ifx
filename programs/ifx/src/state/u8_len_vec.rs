//! `U8LenVec<T>` — Borsh collection with **u8** element-count prefix (max 255 elements).

use borsh::{BorshDeserialize, BorshSerialize};
use core::ops::{Deref, DerefMut};

use borsh::io::{Error, ErrorKind, Read, Result, Write};

/// Vector serialized as `u8` element count followed by each element in Borsh order.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct U8LenVec<T>(pub Vec<T>);

impl<T> U8LenVec<T> {
    pub fn new() -> Self {
        Self(Vec::new())
    }

    pub fn with_capacity(capacity: usize) -> Self {
        Self(Vec::with_capacity(capacity))
    }

    pub fn into_inner(self) -> Vec<T> {
        self.0
    }
}

impl<T> From<Vec<T>> for U8LenVec<T> {
    fn from(v: Vec<T>) -> Self {
        Self(v)
    }
}

impl<T> From<U8LenVec<T>> for Vec<T> {
    fn from(v: U8LenVec<T>) -> Self {
        v.0
    }
}

impl<T> Deref for U8LenVec<T> {
    type Target = Vec<T>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<T> DerefMut for U8LenVec<T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

fn check_len(len: usize) -> Result<()> {
    if len > usize::from(u8::MAX) {
        return Err(Error::new(
            ErrorKind::InvalidData,
            "U8LenVec length exceeds u8::MAX",
        ));
    }
    Ok(())
}

impl<T: BorshSerialize> BorshSerialize for U8LenVec<T> {
    fn serialize<W: Write>(&self, writer: &mut W) -> Result<()> {
        check_len(self.0.len())?;
        (self.0.len() as u8).serialize(writer)?;
        for item in &self.0 {
            item.serialize(writer)?;
        }
        Ok(())
    }
}

impl<T: BorshDeserialize> BorshDeserialize for U8LenVec<T> {
    fn deserialize_reader<R: Read>(reader: &mut R) -> Result<Self> {
        let len = usize::from(u8::deserialize_reader(reader)?);
        let mut out = Vec::with_capacity(len);
        for _ in 0..len {
            out.push(T::deserialize_reader(reader)?);
        }
        Ok(Self(out))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::{CpiPatch, LetBinding, Value};

    #[test]
    fn roundtrip_bindings() {
        let v = U8LenVec(vec![LetBinding::AccountLamports { account_index: 0 }]);
        let encoded = borsh::to_vec(&v).unwrap();
        assert_eq!(encoded[0], 1);
        let back = borsh::from_slice::<U8LenVec<LetBinding>>(&encoded).unwrap();
        assert_eq!(back.0.len(), 1);
    }

    #[test]
    fn anchor_encode_spl_token_amount_matches_sdk() {
        use crate::state::LetArgs;
        use anchor_lang::AnchorSerialize;

        let args = LetArgs {
            bindings: U8LenVec(vec![LetBinding::SplTokenAccountAmount {
                account_index: 0,
            }]),
        };
        let mut buf = Vec::new();
        args.serialize(&mut buf).unwrap();
        assert_eq!(buf.as_slice(), &[1, 9, 0]);
    }

    #[test]
    fn decode_sdk_spl_token_amount_wire() {
        use crate::state::LetArgs;
        use anchor_lang::AnchorDeserialize;

        // SDK `encodeLetArgs`: u8 len=1, enum tag=9 (SplTokenAccountAmount), account_index=0
        let bytes = [1u8, 9u8, 0u8];
        let args = LetArgs::deserialize(&mut &bytes[..]).unwrap();
        assert_eq!(args.bindings.len(), 1);
        assert!(matches!(
            args.bindings[0],
            LetBinding::SplTokenAccountAmount { account_index: 0 }
        ));
    }

    #[test]
    fn roundtrip_patch() {
        let v = U8LenVec(vec![CpiPatch {
            data_offset: 4,
            source: Value { index: 10 },
        }]);
        let encoded = borsh::to_vec(&v).unwrap();
        assert_eq!(encoded, [1u8, 4, 0, 10]);
        let back = borsh::from_slice::<U8LenVec<CpiPatch>>(&encoded).unwrap();
        assert_eq!(back, v);
    }
}
