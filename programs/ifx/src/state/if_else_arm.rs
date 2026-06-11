//! Re-export from [`ifx_core::wire::if_else_arm`].

pub use ifx_core::wire::if_else_arm::*;

#[cfg(test)]
mod wire_tests {
    use super::*;
    use anchor_lang::AnchorDeserialize;

    use crate::state::{Cpi, CPI_WIRE_RAW_PATCHED, CPI_WIRE_STATIC, Expr, IfElseArgs};

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
            0x00,
        ];
        let mut slice = bytes.as_slice();
        IfElseArgs::deserialize(&mut slice).expect("sdk generic patched from node");
        assert!(slice.is_empty());
    }

    #[test]
    fn deserializes_generic_patched_cpi_if_else_args() {
        let patch_offset = 4u16;
        let source_index = 2u8;
        let step: Vec<u8> = vec![
            CPI_WIRE_RAW_PATCHED,
            0x00,
            0x03,
            0x0c,
            0x00,
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
            0x00,
            patch_offset as u8,
            (patch_offset >> 8) as u8,
            source_index,
        ];
        let bytes = vec![0x01, 0x01, 0x01]
            .into_iter()
            .chain(step)
            .chain([IF_ELSE_ARM_SKIP])
            .collect::<Vec<_>>();
        let mut slice = bytes.as_slice();
        IfElseArgs::deserialize(&mut slice).expect("generic patched IfElseArgs");
        assert!(slice.is_empty());
    }

    #[test]
    fn deserializes_sdk_dust_burn_if_else_args() {
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
        let bytes: Vec<u8> = vec![
            0x01, 0x01,
            0x02,
            0x02, 0x00, 0x03, 0x00, 0x00,
            0x00, 0x03, 0x02, 0x01, 0x00, 0x11,
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
