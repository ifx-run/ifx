//! Re-export from [`ifx_core::wire::cpi`].

pub use ifx_core::wire::cpi::*;

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::AnchorDeserialize;
    use borsh::BorshSerialize;
    use std::io::Cursor;

    use crate::state::{Expr, IfElseArgs, IfElseArm, StructuredCpiPatch, Value};
    use crate::state::structured_cpi_payload::AmountDecimalsPatch;

    fn encode_cpi(cpi: &Cpi) -> Vec<u8> {
        borsh::to_vec(cpi).unwrap()
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
        let wire = encode_cpi(&cpi);
        let mut slice = wire.as_slice();
        let back: Cpi = Cpi::deserialize(&mut slice).unwrap();
        assert_eq!(back, cpi);
    }

    #[test]
    fn structured_system_transfer_deserialize_reader_leaves_trailing_bytes() {
        let step = Cpi::Structured {
            accounts_start: 0,
            accounts_len: 3,
            patch: StructuredCpiPatch::SystemTransfer {
                lamports: Value { index: 0 },
            },
        };
        let mut wire = encode_cpi(&step);
        wire.push(0x42);
        let mut reader = Cursor::new(wire.as_slice());
        let back = Cpi::deserialize_reader(&mut reader).unwrap();
        assert_eq!(back, step);
        assert_eq!(reader.position() as usize, wire.len() - 1);
        assert_eq!(wire[reader.position() as usize], 0x42);
    }

    #[test]
    fn structured_wire_places_accounts_before_patch() {
        let cpi = Cpi::Structured {
            accounts_start: 0,
            accounts_len: 3,
            patch: StructuredCpiPatch::SystemTransfer {
                lamports: Value { index: 0 },
            },
        };
        let wire = encode_cpi(&cpi);
        assert_eq!(wire[0], CPI_WIRE_STRUCTURED);
        assert_eq!(wire[1], 0);
        assert_eq!(wire[2], 3);
        assert_eq!(wire[3], 0, "SystemTransfer variant");
        assert_eq!(wire[4], 0, "lamports binding index");
    }

    #[test]
    fn if_else_structured_then_static_via_deserialize_reader() {
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
            data: ifx_core::U16LenVec(vec![17u8]),
        };

        let mut args_bytes = Vec::new();
        Expr::ConstBool(true).serialize(&mut args_bytes).unwrap();
        IfElseArm::Cpi(vec![structured, sync])
            .serialize_wire(&mut args_bytes)
            .unwrap();
        IfElseArm::Skip.serialize_wire(&mut args_bytes).unwrap();

        let mut reader = Cursor::new(args_bytes.as_slice());
        let back = IfElseArgs::deserialize_reader(&mut reader).unwrap();
        assert!(matches!(back.cond, Expr::ConstBool(true)));
        assert_eq!(reader.position() as usize, args_bytes.len());
    }
}
