//! Custom wire encoding for [`IfElseArm`].
//!
//! | Tag | Meaning |
//! |-----|---------|
//! | `0x00` | skip |
//! | `0x01..=0xfe` | **N** [`Cpi`] steps, N = tag |
//! | `0xff` | revert |
//!
//! Each step uses [`Cpi`] (`Static` | `RawPatched` | `Structured`).

use anchor_lang::prelude::*;
use std::io::{Error as IoError, ErrorKind, Read, Result as IoResult, Write};

use super::Cpi;
use super::types::IfElseArm;

pub const IF_ELSE_ARM_SKIP: u8 = 0x00;
pub const IF_ELSE_ARM_REVERT: u8 = 0xff;
pub const IF_ELSE_ARM_CPI_MIN: u8 = 0x01;
pub const IF_ELSE_ARM_CPI_MAX: u8 = 0xfe;
pub const IF_ELSE_ARM_MAX_STEPS: usize = 254;

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

impl AnchorSerialize for IfElseArm {
    fn serialize<W: Write>(&self, writer: &mut W) -> IoResult<()> {
        self.serialize_wire(writer)
    }
}

impl AnchorDeserialize for IfElseArm {
    fn deserialize(buf: &mut &[u8]) -> IoResult<Self> {
        Self::deserialize_wire(buf)
    }

    fn deserialize_reader<R: Read>(reader: &mut R) -> IoResult<Self> {
        let mut tag = [0u8; 1];
        reader.read_exact(&mut tag)?;
        match tag[0] {
            IF_ELSE_ARM_SKIP => Ok(IfElseArm::Skip),
            IF_ELSE_ARM_REVERT => Ok(IfElseArm::Revert),
            IF_ELSE_ARM_CPI_MIN..=IF_ELSE_ARM_CPI_MAX => {
                let count = tag[0] as usize;
                let mut steps = Vec::with_capacity(count);
                for _ in 0..count {
                    steps.push(Cpi::deserialize_reader(reader)?);
                }
                Ok(IfElseArm::Cpi(steps))
            }
        }
    }
}

#[cfg(test)]
mod wire_tests {
    use super::*;
    use crate::state::{IfElseArgs, Cpi, CPI_WIRE_RAW_PATCHED, CPI_WIRE_STATIC};
    use anchor_lang::AnchorDeserialize;
    use crate::state::Expr;

    fn sdk_static_cpi_if_else_bytes() -> Vec<u8> {
        vec![
            0x01, 0x01, // ConstBool(true)
            0x01, // then arm: 1 step
            CPI_WIRE_STATIC, 0x00, 0x03, // Cpi::Static accounts_start, accounts_len
            0x0c, 0x00, // data u16 len = 12
            0x02, 0x00, 0x00, 0x00, 0xb8, 0x0b, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, // else arm skip
        ]
    }

    #[test]
    fn deserializes_sdk_skip_skip_if_else_args() {
        let bytes = vec![0x01, 0x01, 0x00, 0x00];
        let mut slice = bytes.as_slice();
        IfElseArgs::deserialize(&mut slice).expect("skip/skip");
        assert!(slice.is_empty());
    }

    /// Bytes from `encodeIfElseArgs(ifElseArgs(bool(true), arm.cpi(staticStep), skip()))` (SDK).
    #[test]
    fn deserializes_sdk_static_cpi_if_else_args() {
        let bytes = sdk_static_cpi_if_else_bytes();
        let mut slice = bytes.as_slice();
        IfElseArgs::deserialize(&mut slice).expect("IfElseArgs::deserialize");
        assert!(slice.is_empty(), "trailing bytes: {:?}", slice);
    }

    #[test]
    fn expr_const_bool_consumes_two_bytes() {
        let bytes = sdk_static_cpi_if_else_bytes();
        let mut slice = bytes.as_slice();
        Expr::deserialize(&mut slice).expect("Expr");
        assert_eq!(slice.len(), bytes.len() - 2);
        assert_eq!(slice[0], 0x01, "then arm step tag");
    }

    #[test]
    fn then_arm_leaves_else_skip_byte() {
        let bytes = sdk_static_cpi_if_else_bytes();
        let mut slice = &bytes[2..];
        IfElseArm::deserialize(&mut slice).expect("then_arm");
        assert_eq!(slice.len(), 1);
        assert_eq!(slice[0], 0x00);
    }

    #[test]
    fn deserializes_sdk_bytes_stepwise() {
        let bytes = sdk_static_cpi_if_else_bytes();
        let mut slice = bytes.as_slice();
        Expr::deserialize(&mut slice).expect("Expr");
        IfElseArm::deserialize(&mut slice).expect("then_arm");
        IfElseArm::deserialize(&mut slice).expect("else_arm");
        assert!(slice.is_empty());
    }

    #[test]
    fn deserializes_single_static_cpi_step() {
        let step: &[u8] = &[
            CPI_WIRE_STATIC, 0x00, 0x03, 0x0c, 0x00, 0x02, 0x00, 0x00, 0x00, 0xb8, 0x0b, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00,
        ];
        let mut slice = step;
        Cpi::deserialize(&mut slice).expect("Cpi");
        assert!(slice.is_empty());
    }

    #[test]
    fn deserializes_sdk_generic_patched_hex_from_node() {
        let bytes: Vec<u8> = vec![
            0x01, 0x01, 0x01, 0x01, 0x00, 0x04, 0x0a, 0x00, 0x0f, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0x00, 0x00, 0x09, 0x00, 0x00,
            0x00, // else arm skip
        ];
        let mut slice = bytes.as_slice();
        IfElseArgs::deserialize(&mut slice).expect("sdk generic patched from node");
        assert!(slice.is_empty());
    }

    #[test]
    fn deserializes_generic_patched_cpi_if_else_args() {
        // SDK: encodeCpi(rawPatched) + encodeIfElseArgs(bool true, 1 step, skip)
        let patch_offset = 4u16;
        let source_index = 2u8;
        let step: Vec<u8> = vec![
            CPI_WIRE_RAW_PATCHED,
            0x00,
            0x03, // accounts_start, accounts_len
            0x0c,
            0x00, // data len 12
            0x02,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x01,
            0x00, // patch list len 1
            patch_offset as u8,
            (patch_offset >> 8) as u8,
            source_index,
        ];
        let bytes = vec![
            0x01, 0x01, // ConstBool(true)
            0x01,         // then: 1 step
        ]
        .into_iter()
        .chain(step)
        .chain([IF_ELSE_ARM_SKIP]) // else skip
        .collect::<Vec<_>>();
        let mut slice = bytes.as_slice();
        IfElseArgs::deserialize(&mut slice).expect("generic patched IfElseArgs");
        assert!(slice.is_empty());
    }

    #[test]
    fn deserializes_sdk_dust_burn_if_else_args() {
        // token2022BurnChecked.both — Borsh Cpi::Structured (accounts before patch).
        let bytes: Vec<u8> = vec![
            0x23, 0x20, 0x00, 0x00, 0x05, 0xe8, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x11,
            0x00, 0x00, 0x01, 0x02, 0x00, 0x04, 0x16, 0x01, 0x00, 0x02, 0x00,
        ];
        let mut slice = bytes.as_slice();
        IfElseArgs::deserialize(&mut slice).expect("dust burn if_else args");
        assert!(slice.is_empty(), "trailing: {:?}", slice);
    }

    #[test]
    fn deserializes_sdk_dust_burn_if_else_args_via_reader() {
        use std::io::Cursor;

        use anchor_lang::AnchorDeserialize;

        let bytes: Vec<u8> = vec![
            0x23, 0x20, 0x00, 0x00, 0x05, 0xe8, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x11,
            0x00, 0x00, 0x01, 0x02, 0x00, 0x04, 0x16, 0x01, 0x00, 0x02, 0x00,
        ];
        let mut reader = Cursor::new(bytes.as_slice());
        IfElseArgs::deserialize_reader(&mut reader).expect("dust via reader");
        assert_eq!(reader.position() as usize, bytes.len());
    }

    #[test]
    fn deserializes_sdk_wsol_structured_then_static_if_else_args() {
        // SDK: encodeIfElseArgs(bool true, arm.cpis([structured systemTransfer, static syncNative]), skip)
        // After mergeWsolWrapRemaining: transfer len=3, sync start=3 len=2.
        let bytes: Vec<u8> = vec![
            0x01, 0x01, // ConstBool(true)
            0x02, // then: 2 steps
            0x02, 0x00, 0x03, 0x00, 0x00, // structured SystemTransfer
            0x00, 0x03, 0x02, 0x01, 0x00, 0x11, // static syncNative (merged account slice)
            IF_ELSE_ARM_SKIP,
        ];
        let mut slice = bytes.as_slice();
        IfElseArgs::deserialize(&mut slice).expect("wsol if_else args");
        assert!(slice.is_empty(), "trailing: {:?}", slice);
    }

    #[test]
    fn patched_cpi_does_not_consume_trailing_byte() {
        let bytes = vec![
            CPI_WIRE_STATIC, 0x00, 0x03, 0x0c, 0x00, 0x02, 0x00, 0x00, 0x00, 0xb8, 0x0b, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        ];
        let mut slice = bytes.as_slice();
        Cpi::deserialize(&mut slice).expect("Cpi");
        assert_eq!(slice.len(), 1);
        assert_eq!(slice[0], 0x00);
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
