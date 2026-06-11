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

/// Serialize a slice with the same wire layout as [`U16LenVec`].
pub fn serialize_items<T: BorshSerialize, W: Write>(items: &[T], writer: &mut W) -> Result<()> {
    check_len(items.len())?;
    (items.len() as u16).serialize(writer)?;
    for item in items {
        item.serialize(writer)?;
    }
    Ok(())
}

/// Deserialize into a `Vec` with the same wire layout as [`U16LenVec`].
pub fn deserialize_items<T: BorshDeserialize, R: Read>(reader: &mut R) -> Result<Vec<T>> {
    let len = usize::from(u16::deserialize_reader(reader)?);
    let mut out = Vec::with_capacity(len);
    for _ in 0..len {
        out.push(T::deserialize_reader(reader)?);
    }
    Ok(out)
}

impl<T: BorshSerialize> BorshSerialize for U16LenVec<T> {
    fn serialize<W: Write>(&self, writer: &mut W) -> Result<()> {
        serialize_items(&self.0, writer)
    }
}

impl<T: BorshDeserialize> BorshDeserialize for U16LenVec<T> {
    fn deserialize_reader<R: Read>(reader: &mut R) -> Result<Self> {
        Ok(Self(deserialize_items(reader)?))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
