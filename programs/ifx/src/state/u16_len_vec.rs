//! `U16LenVec<T>` — Borsh collection with **u16 LE** element-count prefix (not Borsh `Vec`'s u32).

use borsh::{BorshDeserialize, BorshSerialize};
use core::ops::{Deref, DerefMut};

use borsh::io::{Error, ErrorKind, Read, Result, Write};

/// Vector serialized as `u16` element count (LE) followed by each element in Borsh order.
///
/// For `T = u8`, the payload is raw bytes after the length (same body as Borsh `[u8]`, shorter prefix).
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

fn check_len(len: usize) -> Result<()> {
    if len > usize::from(u16::MAX) {
        return Err(Error::new(
            ErrorKind::InvalidData,
            "U16LenVec length exceeds u16::MAX",
        ));
    }
    Ok(())
}

impl<T: BorshSerialize> BorshSerialize for U16LenVec<T> {
    fn serialize<W: Write>(&self, writer: &mut W) -> Result<()> {
        check_len(self.0.len())?;
        (self.0.len() as u16).serialize(writer)?;
        for item in &self.0 {
            item.serialize(writer)?;
        }
        Ok(())
    }
}

impl<T: BorshDeserialize> BorshDeserialize for U16LenVec<T> {
    fn deserialize_reader<R: Read>(reader: &mut R) -> Result<Self> {
        let len = usize::from(u16::deserialize_reader(reader)?);
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
    use crate::state::{CpiPatch, Value};

    #[test]
    fn roundtrip_bytes() {
        let v = U16LenVec(vec![1u8, 2, 3]);
        let mut buf = Vec::new();
        v.serialize(&mut buf).unwrap();
        assert_eq!(&buf[..2], &[3, 0]); // u16 LE len
        assert_eq!(&buf[2..], &[1, 2, 3]);
        let back = U16LenVec::<u8>::deserialize(&mut buf.as_slice()).unwrap();
        assert_eq!(back.0, v.0);
    }

    #[test]
    fn roundtrip_struct() {
        let v = U16LenVec(vec![CpiPatch {
            data_offset: 4,
            source: Value { index: 10 },
        }]);
        let encoded = borsh::to_vec(&v).unwrap();
        let back = borsh::from_slice::<U16LenVec<CpiPatch>>(&encoded).unwrap();
        assert_eq!(back, v);
    }
}
