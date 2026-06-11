//! Program-local [`U8LenVec`] (wire via [`ifx_core::U8LenVec`]; enables [`IdlBuild`] here).

use borsh::{BorshDeserialize, BorshSerialize};
use core::ops::{Deref, DerefMut};

use borsh::io::{Read, Result, Write};

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

impl<T: BorshSerialize> BorshSerialize for U8LenVec<T> {
    fn serialize<W: Write>(&self, writer: &mut W) -> Result<()> {
        ifx_core::u8_len_vec::serialize_items(&self.0, writer)
    }
}

impl<T: BorshDeserialize> BorshDeserialize for U8LenVec<T> {
    fn deserialize_reader<R: Read>(reader: &mut R) -> Result<Self> {
        Ok(Self(ifx_core::u8_len_vec::deserialize_items(reader)?))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::{LetBinding, RawCpiPatch, Value};

    #[test]
    fn roundtrip_bindings() {
        let v = U8LenVec(vec![LetBinding::AccountLamports { account_index: 0 }]);
        let encoded = borsh::to_vec(&v).unwrap();
        assert_eq!(encoded[0], 1);
        let back = borsh::from_slice::<U8LenVec<LetBinding>>(&encoded).unwrap();
        assert_eq!(back.len(), 1);
    }

    #[test]
    fn roundtrip_patch() {
        let v = U8LenVec(vec![RawCpiPatch {
            data_offset: 4,
            source: Value { index: 10 },
        }]);
        let encoded = borsh::to_vec(&v).unwrap();
        assert_eq!(encoded, [1u8, 4, 0, 10]);
        let back = borsh::from_slice::<U8LenVec<RawCpiPatch>>(&encoded).unwrap();
        assert_eq!(back, v);
    }
}
