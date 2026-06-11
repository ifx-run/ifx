//! Program-local [`U16LenVec`] (wire via [`ifx_core::U16LenVec`]; enables [`IdlBuild`] here).

use borsh::{BorshDeserialize, BorshSerialize};
use core::ops::{Deref, DerefMut};

use borsh::io::{Read, Result, Write};

/// Vector serialized as `u16` element count (LE) followed by each element in Borsh order.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct U16LenVec<T>(pub Vec<T>);

impl<T> U16LenVec<T> {
    pub fn new() -> Self {
        Self(Vec::new())
    }

    pub fn with_capacity(capacity: usize) -> Self {
        Self(Vec::with_capacity(capacity))
    }

    pub fn into_inner(self) -> Vec<T> {
        self.0
    }

    pub fn to_vec(&self) -> Vec<T>
    where
        T: Clone,
    {
        self.0.clone()
    }
}

impl<T> From<Vec<T>> for U16LenVec<T> {
    fn from(v: Vec<T>) -> Self {
        Self(v)
    }
}

impl<T> From<U16LenVec<T>> for Vec<T> {
    fn from(v: U16LenVec<T>) -> Self {
        v.0
    }
}

impl<T> Deref for U16LenVec<T> {
    type Target = Vec<T>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<T> DerefMut for U16LenVec<T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl<T: BorshSerialize> BorshSerialize for U16LenVec<T> {
    fn serialize<W: Write>(&self, writer: &mut W) -> Result<()> {
        ifx_core::u16_len_vec::serialize_items(&self.0, writer)
    }
}

impl<T: BorshDeserialize> BorshDeserialize for U16LenVec<T> {
    fn deserialize_reader<R: Read>(reader: &mut R) -> Result<Self> {
        Ok(Self(ifx_core::u16_len_vec::deserialize_items(reader)?))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::{RawCpiPatch, Value};

    #[test]
    fn roundtrip_bytes() {
        let v = U16LenVec(vec![1u8, 2, 3]);
        let mut buf = Vec::new();
        v.serialize(&mut buf).unwrap();
        assert_eq!(&buf[..2], &[3, 0]);
        assert_eq!(&buf[2..], &[1, 2, 3]);
        let back = U16LenVec::<u8>::deserialize(&mut buf.as_slice()).unwrap();
        assert_eq!(back.to_vec(), v.to_vec());
    }

    #[test]
    fn roundtrip_struct() {
        let v = U16LenVec(vec![RawCpiPatch {
            data_offset: 4,
            source: Value { index: 10 },
        }]);
        let encoded = borsh::to_vec(&v).unwrap();
        let back = borsh::from_slice::<U16LenVec<RawCpiPatch>>(&encoded).unwrap();
        assert_eq!(back, v);
    }
}
