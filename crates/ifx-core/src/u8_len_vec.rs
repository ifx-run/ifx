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

/// Serialize a slice with the same wire layout as [`U8LenVec`].
pub fn serialize_items<T: BorshSerialize, W: Write>(items: &[T], writer: &mut W) -> Result<()> {
    check_len(items.len())?;
    (items.len() as u8).serialize(writer)?;
    for item in items {
        item.serialize(writer)?;
    }
    Ok(())
}

/// Deserialize into a `Vec` with the same wire layout as [`U8LenVec`].
pub fn deserialize_items<T: BorshDeserialize, R: Read>(reader: &mut R) -> Result<Vec<T>> {
    let len = usize::from(u8::deserialize_reader(reader)?);
    let mut out = Vec::with_capacity(len);
    for _ in 0..len {
        out.push(T::deserialize_reader(reader)?);
    }
    Ok(out)
}

impl<T: BorshSerialize> BorshSerialize for U8LenVec<T> {
    fn serialize<W: Write>(&self, writer: &mut W) -> Result<()> {
        serialize_items(&self.0, writer)
    }
}

impl<T: BorshDeserialize> BorshDeserialize for U8LenVec<T> {
    fn deserialize_reader<R: Read>(reader: &mut R) -> Result<Self> {
        Ok(Self(deserialize_items(reader)?))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use borsh::{BorshDeserialize, BorshSerialize};

    #[derive(BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
    struct Pair {
        a: u8,
        b: u16,
    }

    #[test]
    fn roundtrip_elements() {
        let v = U8LenVec(vec![
            Pair { a: 1, b: 2 },
            Pair { a: 3, b: 4 },
        ]);
        let encoded = borsh::to_vec(&v).unwrap();
        assert_eq!(encoded[0], 2);
        let back = borsh::from_slice::<U8LenVec<Pair>>(&encoded).unwrap();
        assert_eq!(back, v);
    }

    #[test]
    fn rejects_len_over_u8_max() {
        let v = U8LenVec(vec![0u8; 256]);
        assert!(borsh::to_vec(&v).is_err());
    }
}
