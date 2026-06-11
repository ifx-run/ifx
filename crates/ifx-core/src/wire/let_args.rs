//! Arguments for `ifx_let`.

use anchor_lang::prelude::*;

use crate::U8LenVec;

use super::let_binding::LetBinding;

/// Parallel bindings for a single top-level `ifx_let`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct LetArgs {
    pub bindings: U8LenVec<LetBinding>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::{AnchorDeserialize, AnchorSerialize};

    #[test]
    fn anchor_encode_spl_token_amount_matches_sdk() {
        let args = LetArgs {
            bindings: U8LenVec(vec![LetBinding::SplTokenAccountAmount {
                account_index: 0,
            }]),
        };
        let mut buf = Vec::new();
        args.serialize(&mut buf).unwrap();
        assert_eq!(buf.as_slice(), &[1, 9, 0]);
    }

    #[test]
    fn decode_sdk_spl_token_amount_wire() {
        // SDK `encodeLetArgs`: u8 len=1, enum tag=9 (SplTokenAccountAmount), account_index=0
        let bytes = [1u8, 9u8, 0u8];
        let args = LetArgs::deserialize(&mut &bytes[..]).unwrap();
        assert_eq!(args.bindings.len(), 1);
        assert!(matches!(
            args.bindings[0],
            LetBinding::SplTokenAccountAmount { account_index: 0 }
        ));
    }

    #[test]
    fn roundtrip_bindings_vec() {
        let args = LetArgs {
            bindings: U8LenVec(vec![LetBinding::AccountLamports { account_index: 0 }]),
        };
        let mut buf = Vec::new();
        args.serialize(&mut buf).unwrap();
        assert_eq!(buf[0], 1);
        let back = LetArgs::deserialize(&mut buf.as_slice()).unwrap();
        assert_eq!(back.bindings.len(), 1);
    }
}
