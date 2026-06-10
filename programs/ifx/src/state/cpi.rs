//! CPI step wire: [`Cpi`] = Static | RawPatched | Structured([`StructuredCpiPatch`]).
//!
//! Borsh layout (variant tag = `CPI_WIRE_*`):
//! - **Static:** `[0][accounts_start][accounts_len][U16LenVec data]`
//! - **RawPatched:** `[1][accounts_start][accounts_len][data][PatchList]`
//! - **Structured:** `[2][accounts_start][accounts_len][StructuredCpiPatch…]`

use anchor_lang::prelude::*;
use borsh::{BorshDeserialize, BorshSerialize};

use super::patch_list::PatchList;
use super::structured_cpi_patch::StructuredCpiPatch;
use super::u16_len_vec::U16LenVec;

pub const CPI_WIRE_STATIC: u8 = 0;
pub const CPI_WIRE_RAW_PATCHED: u8 = 1;
pub const CPI_WIRE_STRUCTURED: u8 = 2;

/// One CPI step for [`super::IfElseArm::Cpi`] or [`crate::ifx_patched_cpi`].
#[derive(BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
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

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::AnchorDeserialize;
    use crate::state::structured_cpi_payload::AmountDecimalsPatch;
    use crate::state::Value;

    fn encode_cpi(cpi: &Cpi) -> Vec<u8> {
        borsh::to_vec(cpi).unwrap()
    }

    #[test]
    fn static_cpi_borsh_roundtrip() {
        let cpi = Cpi::Static {
            accounts_start: 0,
            accounts_len: 3,
            data: U16LenVec(vec![0x02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        };
        let wire = encode_cpi(&cpi);
        assert_eq!(wire[0], CPI_WIRE_STATIC);
        assert_eq!(wire[1], 0);
        assert_eq!(wire[2], 3);
        let mut slice = wire.as_slice();
        let back: Cpi = Cpi::deserialize(&mut slice).unwrap();
        assert_eq!(back, cpi);
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
        use std::io::Cursor;

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
    fn sdk_token_transfer_structured_deserializes() {
        use anchor_lang::AnchorDeserialize;

        // SDK: encodeCpi(structured tokenTransfer($0))
        let wire: &[u8] = &[2, 0, 4, 3, 0];
        let mut slice = wire;
        let back = Cpi::deserialize(&mut slice).expect("Cpi::deserialize");
        assert!(slice.is_empty());
        assert!(matches!(
            back,
            Cpi::Structured {
                accounts_start: 0,
                accounts_len: 4,
                patch: StructuredCpiPatch::TokenTransfer { amount: Value { index: 0 } },
            }
        ));
    }

    #[test]
    fn sdk_token2022_burn_checked_both_deserializes() {
        use anchor_lang::AnchorDeserialize;

        // SDK: encodeCpi(structured token2022BurnChecked.both($0, $2))
        let wire: &[u8] = &[2, 0, 4, 22, 1, 0, 2];
        let mut slice = wire;
        let back = Cpi::deserialize(&mut slice).expect("Cpi::deserialize");
        assert!(slice.is_empty());
        assert!(matches!(
            back,
            Cpi::Structured {
                accounts_start: 0,
                accounts_len: 4,
                patch: StructuredCpiPatch::Token2022BurnChecked(
                    AmountDecimalsPatch::Both {
                        amount: Value { index: 0 },
                        decimals: Value { index: 2 },
                    }
                ),
            }
        ));
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
        use std::io::Cursor;

        use crate::state::{Expr, IfElseArm, IfElseArgs};

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

        let mut args_bytes = Vec::new();
        Expr::ConstBool(true)
            .serialize(&mut args_bytes)
            .unwrap();
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
