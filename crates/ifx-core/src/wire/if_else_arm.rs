//! Custom wire encoding for [`IfElseArm`].
//!
//! | Tag | Meaning |
//! |-----|---------|
//! | `0x00` | skip |
//! | `0x01..=0xfe` | **N** [`Cpi`] steps, N = tag |
//! | `0xff` | revert |

use std::io::{Error as IoError, ErrorKind, Result as IoResult, Write};

use borsh::{BorshDeserialize, BorshSerialize};

use super::cpi::Cpi;

pub const IF_ELSE_ARM_SKIP: u8 = 0x00;
pub const IF_ELSE_ARM_REVERT: u8 = 0xff;
pub const IF_ELSE_ARM_CPI_MIN: u8 = 0x01;
pub const IF_ELSE_ARM_CPI_MAX: u8 = 0xfe;
pub const IF_ELSE_ARM_MAX_STEPS: usize = 254;

/// One side of `ifx_if_else`: skip, revert, or an ordered CPI step list.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum IfElseArm {
    Skip,
    /// Ordered steps (each [`Cpi`]; static steps use [`Cpi::Static`]).
    Cpi(Vec<Cpi>),
    Revert,
}

fn invalid_arm_err() -> IoError {
    IoError::new(ErrorKind::InvalidData, "invalid IfElseArm tag")
}

fn serialize_steps<W: Write>(writer: &mut W, steps: &[Cpi]) -> IoResult<()> {
    let n = steps.len();
    if n == 0 || n > IF_ELSE_ARM_MAX_STEPS {
        return Err(IoError::new(
            ErrorKind::InvalidData,
            "IfElseArm step count must be 1..=254",
        ));
    }
    writer.write_all(&[n as u8])?;
    for step in steps {
        step.serialize(writer)?;
    }
    Ok(())
}

fn deserialize_steps(buf: &mut &[u8], count: usize) -> IoResult<Vec<Cpi>> {
    let mut out = Vec::with_capacity(count);
    for _ in 0..count {
        out.push(Cpi::deserialize(buf)?);
    }
    Ok(out)
}

impl IfElseArm {
    pub fn serialize_wire<W: Write>(&self, writer: &mut W) -> IoResult<()> {
        match self {
            IfElseArm::Skip => writer.write_all(&[IF_ELSE_ARM_SKIP]),
            IfElseArm::Revert => writer.write_all(&[IF_ELSE_ARM_REVERT]),
            IfElseArm::Cpi(steps) => serialize_steps(writer, steps),
        }
    }

    pub fn deserialize_wire(buf: &mut &[u8]) -> IoResult<Self> {
        if buf.is_empty() {
            return Err(invalid_arm_err());
        }
        let tag = buf[0];
        *buf = &buf[1..];
        match tag {
            IF_ELSE_ARM_SKIP => Ok(IfElseArm::Skip),
            IF_ELSE_ARM_REVERT => Ok(IfElseArm::Revert),
            IF_ELSE_ARM_CPI_MIN..=IF_ELSE_ARM_CPI_MAX => {
                Ok(IfElseArm::Cpi(deserialize_steps(buf, tag as usize)?))
            }
        }
    }
}

#[cfg(feature = "anchor-wire")]
mod anchor {
    use anchor_lang::prelude::*;
    use std::io::{Read, Write};

    use super::{
        IfElseArm, IF_ELSE_ARM_CPI_MAX, IF_ELSE_ARM_CPI_MIN, IF_ELSE_ARM_REVERT, IF_ELSE_ARM_SKIP,
    };

    impl AnchorSerialize for IfElseArm {
        fn serialize<W: Write>(&self, writer: &mut W) -> std::io::Result<()> {
            self.serialize_wire(writer)
        }
    }

    impl AnchorDeserialize for IfElseArm {
        fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
            Self::deserialize_wire(buf)
        }

        fn deserialize_reader<R: Read>(reader: &mut R) -> std::io::Result<Self> {
            let mut tag = [0u8; 1];
            reader.read_exact(&mut tag)?;
            match tag[0] {
                IF_ELSE_ARM_SKIP => Ok(IfElseArm::Skip),
                IF_ELSE_ARM_REVERT => Ok(IfElseArm::Revert),
                IF_ELSE_ARM_CPI_MIN..=IF_ELSE_ARM_CPI_MAX => {
                    let count = tag[0] as usize;
                    let mut steps = Vec::with_capacity(count);
                    for _ in 0..count {
                        steps.push(super::Cpi::deserialize_reader(reader)?);
                    }
                    Ok(IfElseArm::Cpi(steps))
                }
            }
        }
    }
}

#[cfg(test)]
mod wire_tests {
    use super::*;
    use borsh::BorshDeserialize;
    use crate::wire::cpi::{Cpi, CPI_WIRE_STATIC};
    use crate::wire::expr::Expr;
    use crate::wire::structured_cpi_patch::StructuredCpiPatch;
    use crate::wire::value::Value;
    use crate::U16LenVec;

    fn sdk_static_cpi_if_else_bytes() -> Vec<u8> {
        vec![
            0x01, 0x01, 0x01, CPI_WIRE_STATIC, 0x00, 0x03, 0x0c, 0x00, 0x02, 0x00, 0x00, 0x00,
            0xb8, 0x0b, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        ]
    }

    #[test]
    fn deserializes_sdk_skip_skip_arms() {
        let bytes = vec![IF_ELSE_ARM_SKIP, IF_ELSE_ARM_SKIP];
        let mut slice = bytes.as_slice();
        IfElseArm::deserialize_wire(&mut slice).expect("then skip");
        IfElseArm::deserialize_wire(&mut slice).expect("else skip");
        assert!(slice.is_empty());
    }

    #[test]
    fn expr_const_bool_consumes_two_bytes() {
        let bytes = sdk_static_cpi_if_else_bytes();
        let mut slice = bytes.as_slice();
        Expr::deserialize(&mut slice).expect("Expr");
        assert_eq!(slice[0], 0x01, "then arm step tag");
    }

    #[test]
    fn deserializes_sdk_static_cpi_arm() {
        let bytes = sdk_static_cpi_if_else_bytes();
        let mut slice = &bytes[2..];
        IfElseArm::deserialize_wire(&mut slice).expect("then_arm");
        assert_eq!(slice.len(), 1);
        assert_eq!(slice[0], IF_ELSE_ARM_SKIP);
    }

    #[test]
    fn deserializes_sdk_wsol_structured_then_static_arms() {
        let bytes: Vec<u8> = vec![
            0x02,
            0x02, 0x00, 0x03, 0x00, 0x00,
            0x00, 0x03, 0x02, 0x01, 0x00, 0x11,
            IF_ELSE_ARM_SKIP,
        ];
        let mut slice = bytes.as_slice();
        IfElseArm::deserialize_wire(&mut slice).expect("then");
        IfElseArm::deserialize_wire(&mut slice).expect("else");
        assert!(slice.is_empty());
    }

    #[test]
    fn roundtrip_structured_then_static() {
        let structured = Cpi::Structured {
            accounts_start: 0,
            accounts_len: 3,
            patch: StructuredCpiPatch::SystemTransfer {
                lamports: Value { index: 0 },
            },
        };
        let sync = Cpi::Static {
            accounts_start: 3,
            accounts_len: 2,
            data: U16LenVec(vec![17]),
        };
        let arm = IfElseArm::Cpi(vec![structured, sync]);
        let mut buf = Vec::new();
        arm.serialize_wire(&mut buf).unwrap();
        let mut slice = buf.as_slice();
        let back = IfElseArm::deserialize_wire(&mut slice).unwrap();
        assert_eq!(back, arm);
        assert!(slice.is_empty());
    }
}

#[cfg(feature = "idl-build")]
mod idl {
    use anchor_lang::idl::build::IdlBuild;
    use anchor_lang::idl::types::IdlTypeDef;

    use super::IfElseArm;

    impl IdlBuild for IfElseArm {
        fn create_type() -> Option<IdlTypeDef> {
            let mut ty: IdlTypeDef = serde_json::from_str(include_str!("if_else_arm_idl_type.json"))
                .expect("if_else_arm_idl_type.json");
            ty.name = Self::get_full_path();
            Some(ty)
        }

        fn insert_types(_types: &mut std::collections::BTreeMap<String, IdlTypeDef>) {}
    }
}
