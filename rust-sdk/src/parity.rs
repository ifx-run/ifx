//! Golden wire parity vs TS / Go SDK tests.

#[cfg(test)]
mod tests {
    use anchor_lang::AnchorSerialize;
    use ifx_core::wire::structured_cpi_payload::AmountDecimalsPatch;
    use ifx_core::wire::structured_cpi_patch::StructuredCpiPatch;
    use ifx_core::wire::{Cpi, Expr, IfElseArm, Value};
    use ifx_core::U16LenVec;

    use crate::cpi::encode_cpi;
    use crate::expr;
    use crate::ix::{build_ix_if_else, if_else_args_skip_skip, IxOpts};
    use crate::wire_ix::IfElseArgs;

    #[test]
    fn structured_cpi_encode_matches_sdk() {
        let patch = StructuredCpiPatch::TokenTransferChecked(AmountDecimalsPatch::AmountOnly {
            amount: Value { index: 3 },
            decimals: 9,
        });
        let cpi = Cpi::Structured {
            accounts_start: 1,
            accounts_len: 4,
            patch,
        };
        assert_eq!(
            encode_cpi(&cpi).unwrap(),
            vec![2, 1, 4, 7, 0, 3, 9]
        );
    }

    #[test]
    fn if_else_skip_skip_body_matches_sdk() {
        let args = if_else_args_skip_skip();
        let mut body = Vec::new();
        args.serialize(&mut body).unwrap();
        assert_eq!(body, vec![0x01, 0x01, 0x00, 0x00]);
    }

    #[test]
    fn if_else_ix_data_includes_discriminator() {
        let frame = solana_sdk::pubkey::Pubkey::new_unique();
        let ix = build_ix_if_else(
            frame,
            &IfElseArgs {
                cond: Expr::ConstBool(true),
                then_arm: IfElseArm::Skip,
                else_arm: IfElseArm::Skip,
            },
            &[],
            IxOpts::default(),
        )
        .unwrap();
        assert_eq!(ix.data[0], crate::constants::IX_DISC_IF_ELSE);
        assert_eq!(&ix.data[1..], &[0x01, 0x01, 0x00, 0x00]);
    }

    #[test]
    fn expr_eq_u64_golden() {
        let e = expr::eq(expr::u64(1), expr::u64(2));
        let buf = borsh::to_vec(&e).unwrap();
        assert_eq!(buf[0], 36); // Eq discriminant (borsh flat enum, see ifx-core wire/expr.rs)
    }

    #[test]
    fn static_cpi_roundtrip_bytes() {
        let cpi = Cpi::Static {
            accounts_start: 0,
            accounts_len: 3,
            data: U16LenVec(vec![
                2, 0, 0, 0, 0xb8, 0x0b, 0, 0, 0, 0, 0, 0,
            ]),
        };
        let wire = encode_cpi(&cpi).unwrap();
        assert_eq!(wire[0], 0);
        assert_eq!(wire[1], 0);
        assert_eq!(wire[2], 3);
    }
}
