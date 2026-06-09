//! CPI step wire: [`Cpi`] = Static | RawPatched | Structured([`StructuredCpiPatch`]).

use anchor_lang::prelude::*;
use std::io::{Error as IoError, ErrorKind, Read, Result as IoResult, Write};

use super::patch_list::PatchList;
use super::structured_cpi_patch::StructuredCpiPatch;
use super::u16_len_vec::U16LenVec;

pub const CPI_WIRE_STATIC: u8 = 0;
pub const CPI_WIRE_RAW_PATCHED: u8 = 1;
pub const CPI_WIRE_STRUCTURED: u8 = 2;

/// One CPI step for [`super::IfElseArm::Cpi`] or [`crate::ifx_patched_cpi`].
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Cpi {
    /// Template `data` invoked as-is.
    Static {
        accounts_start: u8,
        accounts_len: u8,
        data: U16LenVec<u8>,
    },
    /// Legacy dynamic `(data_offset, source)*` patches — DEX / escape hatch.
    RawPatched {
        accounts_start: u8,
        accounts_len: u8,
        data: U16LenVec<u8>,
        patches: PatchList,
    },
    /// Official-program layout; ix `data` assembled from typed patch (no template blob).
    Structured {
        accounts_start: u8,
        accounts_len: u8,
        patch: StructuredCpiPatch,
    },
}

impl Cpi {
    pub fn accounts_start(&self) -> u8 {
        match self {
            Self::Static { accounts_start, .. }
            | Self::RawPatched { accounts_start, .. }
            | Self::Structured { accounts_start, .. } => *accounts_start,
        }
    }

    pub fn accounts_len(&self) -> u8 {
        match self {
            Self::Static { accounts_len, .. }
            | Self::RawPatched { accounts_len, .. }
            | Self::Structured { accounts_len, .. } => *accounts_len,
        }
    }

    pub fn requires_patch_apply(&self) -> bool {
        match self {
            Self::Static { .. } => false,
            Self::RawPatched { patches, .. } => !patches.is_empty(),
            Self::Structured { .. } => true,
        }
    }
}

fn invalid_cpi_tag() -> IoError {
    IoError::new(ErrorKind::InvalidData, "invalid Cpi wire tag")
}

impl Cpi {
    pub fn serialize_wire<W: Write>(&self, writer: &mut W) -> IoResult<()> {
        match self {
            Self::Static {
                accounts_start,
                accounts_len,
                data,
            } => {
                writer.write_all(&[CPI_WIRE_STATIC, *accounts_start, *accounts_len])?;
                data.serialize(writer)
            }
            Self::RawPatched {
                accounts_start,
                accounts_len,
                data,
                patches,
            } => {
                writer.write_all(&[CPI_WIRE_RAW_PATCHED, *accounts_start, *accounts_len])?;
                data.serialize(writer)?;
                patches.serialize(writer)
            }
            Self::Structured {
                accounts_start,
                accounts_len,
                patch,
            } => {
                writer.write_all(&[
                    CPI_WIRE_STRUCTURED,
                    patch.wire_tag(),
                    *accounts_start,
                    *accounts_len,
                ])?;
                patch.serialize_payload(writer)
            }
        }
    }

    pub fn deserialize_wire(buf: &mut &[u8]) -> IoResult<Self> {
        if buf.is_empty() {
            return Err(invalid_cpi_tag());
        }
        let tag = buf[0];
        *buf = &buf[1..];
        match tag {
            CPI_WIRE_STATIC => {
                if buf.len() < 2 {
                    return Err(invalid_cpi_tag());
                }
                let accounts_start = buf[0];
                let accounts_len = buf[1];
                *buf = &buf[2..];
                let data = U16LenVec::deserialize(buf)?;
                Ok(Self::Static {
                    accounts_start,
                    accounts_len,
                    data,
                })
            }
            CPI_WIRE_RAW_PATCHED => {
                if buf.len() < 2 {
                    return Err(invalid_cpi_tag());
                }
                let accounts_start = buf[0];
                let accounts_len = buf[1];
                *buf = &buf[2..];
                let data = U16LenVec::deserialize(buf)?;
                let patches = PatchList::deserialize(buf)?;
                Ok(Self::RawPatched {
                    accounts_start,
                    accounts_len,
                    data,
                    patches,
                })
            }
            CPI_WIRE_STRUCTURED => {
                if buf.len() < 3 {
                    return Err(invalid_cpi_tag());
                }
                let patch_tag = buf[0];
                let accounts_start = buf[1];
                let accounts_len = buf[2];
                *buf = &buf[3..];
                let patch = StructuredCpiPatch::deserialize_payload(patch_tag, buf)
                    .map_err(|_| invalid_cpi_tag())?;
                Ok(Self::Structured {
                    accounts_start,
                    accounts_len,
                    patch,
                })
            }
            _ => Err(invalid_cpi_tag()),
        }
    }
}

fn deserialize_cpi_reader<R: Read>(reader: &mut R) -> IoResult<Cpi> {
    let mut tag = [0u8; 1];
    reader.read_exact(&mut tag)?;
    match tag[0] {
        CPI_WIRE_STATIC => {
            let accounts_start = u8::deserialize_reader(reader)?;
            let accounts_len = u8::deserialize_reader(reader)?;
            let data = U16LenVec::<u8>::deserialize_reader(reader)?;
            Ok(Cpi::Static {
                accounts_start,
                accounts_len,
                data,
            })
        }
        CPI_WIRE_RAW_PATCHED => {
            let accounts_start = u8::deserialize_reader(reader)?;
            let accounts_len = u8::deserialize_reader(reader)?;
            let data = U16LenVec::<u8>::deserialize_reader(reader)?;
            let patches = PatchList::deserialize_reader(reader)?;
            Ok(Cpi::RawPatched {
                accounts_start,
                accounts_len,
                data,
                patches,
            })
        }
        CPI_WIRE_STRUCTURED => {
            let patch_tag = u8::deserialize_reader(reader)?;
            let accounts_start = u8::deserialize_reader(reader)?;
            let accounts_len = u8::deserialize_reader(reader)?;
            let mut rest = Vec::new();
            reader.read_to_end(&mut rest)?;
            let mut slice = rest.as_slice();
            let patch = StructuredCpiPatch::deserialize_payload(patch_tag, &mut slice)
                .map_err(|_| invalid_cpi_tag())?;
            if !slice.is_empty() {
                return Err(invalid_cpi_tag());
            }
            Ok(Cpi::Structured {
                accounts_start,
                accounts_len,
                patch,
            })
        }
        _ => Err(invalid_cpi_tag()),
    }
}

impl AnchorSerialize for Cpi {
    fn serialize<W: Write>(&self, writer: &mut W) -> IoResult<()> {
        self.serialize_wire(writer)
    }
}

impl AnchorDeserialize for Cpi {
    fn deserialize(buf: &mut &[u8]) -> IoResult<Self> {
        Self::deserialize_wire(buf)
    }

    fn deserialize_reader<R: Read>(reader: &mut R) -> IoResult<Self> {
        deserialize_cpi_reader(reader)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::structured_cpi_payload::AmountDecimalsPatch;
    use crate::state::Value;

    #[test]
    fn static_cpi_wire_matches_legacy_prefix_plus_empty_patches_replaced_by_tag() {
        let cpi = Cpi::Static {
            accounts_start: 0,
            accounts_len: 3,
            data: U16LenVec(vec![0x02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        };
        let wire = borsh::to_vec(&cpi).unwrap();
        assert_eq!(wire[0], CPI_WIRE_STATIC);
        assert_eq!(wire[1], 0);
        assert_eq!(wire[2], 3);
    }

    #[test]
    fn structured_transfer_checked_roundtrip() {
        let cpi = Cpi::Structured {
            accounts_start: 1,
            accounts_len: 4,
            patch: StructuredCpiPatch::TokenTransferChecked(
                AmountDecimalsPatch::AmountOnly {
                    amount: Value { index: 3 },
                    decimals: 9,
                },
            ),
        };
        let back = borsh::from_slice::<Cpi>(&borsh::to_vec(&cpi).unwrap()).unwrap();
        assert_eq!(back, cpi);
    }
}

#[cfg(feature = "idl-build")]
mod idl {
    use anchor_lang::idl::build::IdlBuild;
    use anchor_lang::idl::types::IdlTypeDef;

    use super::Cpi;

    impl IdlBuild for Cpi {
        fn create_type() -> Option<IdlTypeDef> {
            let mut ty: IdlTypeDef =
                serde_json::from_str(include_str!("cpi_idl_type.json")).expect("cpi_idl_type.json");
            ty.name = Self::get_full_path();
            Some(ty)
        }

        fn insert_types(_types: &mut std::collections::BTreeMap<String, IdlTypeDef>) {}
    }
}
