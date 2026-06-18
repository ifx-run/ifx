//! Golden wire parity vs TS / Go SDK tests.

#[cfg(test)]
mod tests {
    use anchor_lang::AnchorSerialize;
    use ifx_core::wire::structured_cpi_payload::{
        AmountDecimalsFeePatch, AmountDecimalsPatch, FreezeAuthPatch, InitializeMintPatch,
        LamportsSpacePatch, PubkeyValue, SetTransferFeePatch, UnwrapLamportsPatch,
    };
    use ifx_core::wire::structured_cpi_patch::StructuredCpiPatch;
    use ifx_core::wire::{Cpi, Expr, IfElseArm, Value};
    use ifx_core::U16LenVec;

    use crate::cpi::encode_cpi;
    use crate::expr;
    use crate::ix::{build_ix_if_else, if_else_args_skip_skip, IxOpts};
    use crate::wire_ix::IfElseArgs;

    fn frame_value(index: u8) -> Value {
        Value { index }
    }

    fn init_mint_patch() -> InitializeMintPatch {
        InitializeMintPatch {
            decimals: frame_value(0),
            mint_authority: PubkeyValue::FromFrame(frame_value(1)),
            freeze: FreezeAuthPatch::None,
        }
    }

    /// Mirrors Go `structuredPatchWireKeys` / TS `STRUCTURED_CPI_PATCH_WIRE` (34 variants, tags 0–33).
    fn all_sample_structured_patches() -> Vec<(&'static str, StructuredCpiPatch)> {
        vec![
            (
                "systemTransfer",
                StructuredCpiPatch::SystemTransfer {
                    lamports: frame_value(0),
                },
            ),
            (
                "systemCreateAccount",
                StructuredCpiPatch::SystemCreateAccount(LamportsSpacePatch::LamportsOnly {
                    lamports: frame_value(0),
                    space: 165,
                }),
            ),
            (
                "systemAllocate",
                StructuredCpiPatch::SystemAllocate {
                    space: frame_value(0),
                },
            ),
            (
                "tokenTransfer",
                StructuredCpiPatch::TokenTransfer {
                    amount: frame_value(0),
                },
            ),
            (
                "tokenApprove",
                StructuredCpiPatch::TokenApprove {
                    amount: frame_value(0),
                },
            ),
            (
                "tokenMintTo",
                StructuredCpiPatch::TokenMintTo {
                    amount: frame_value(0),
                },
            ),
            (
                "tokenBurn",
                StructuredCpiPatch::TokenBurn {
                    amount: frame_value(0),
                },
            ),
            (
                "tokenTransferChecked",
                StructuredCpiPatch::TokenTransferChecked(AmountDecimalsPatch::AmountOnly {
                    amount: frame_value(0),
                    decimals: 9,
                }),
            ),
            (
                "tokenApproveChecked",
                StructuredCpiPatch::TokenApproveChecked(AmountDecimalsPatch::AmountOnly {
                    amount: frame_value(0),
                    decimals: 9,
                }),
            ),
            (
                "tokenMintToChecked",
                StructuredCpiPatch::TokenMintToChecked(AmountDecimalsPatch::AmountOnly {
                    amount: frame_value(0),
                    decimals: 9,
                }),
            ),
            (
                "tokenBurnChecked",
                StructuredCpiPatch::TokenBurnChecked(AmountDecimalsPatch::AmountOnly {
                    amount: frame_value(0),
                    decimals: 9,
                }),
            ),
            (
                "tokenAmountToUiAmount",
                StructuredCpiPatch::TokenAmountToUiAmount {
                    amount: frame_value(0),
                },
            ),
            (
                "tokenInitializeMint",
                StructuredCpiPatch::TokenInitializeMint(init_mint_patch()),
            ),
            (
                "tokenInitializeMint2",
                StructuredCpiPatch::TokenInitializeMint2(init_mint_patch()),
            ),
            (
                "tokenInitializeMultisig",
                StructuredCpiPatch::TokenInitializeMultisig { m: frame_value(0) },
            ),
            (
                "token2022Transfer",
                StructuredCpiPatch::Token2022Transfer {
                    amount: frame_value(0),
                },
            ),
            (
                "token2022Approve",
                StructuredCpiPatch::Token2022Approve {
                    amount: frame_value(0),
                },
            ),
            (
                "token2022MintTo",
                StructuredCpiPatch::Token2022MintTo {
                    amount: frame_value(0),
                },
            ),
            (
                "token2022Burn",
                StructuredCpiPatch::Token2022Burn {
                    amount: frame_value(0),
                },
            ),
            (
                "token2022TransferChecked",
                StructuredCpiPatch::Token2022TransferChecked(AmountDecimalsPatch::AmountOnly {
                    amount: frame_value(0),
                    decimals: 9,
                }),
            ),
            (
                "token2022ApproveChecked",
                StructuredCpiPatch::Token2022ApproveChecked(AmountDecimalsPatch::AmountOnly {
                    amount: frame_value(0),
                    decimals: 9,
                }),
            ),
            (
                "token2022MintToChecked",
                StructuredCpiPatch::Token2022MintToChecked(AmountDecimalsPatch::AmountOnly {
                    amount: frame_value(0),
                    decimals: 9,
                }),
            ),
            (
                "token2022BurnChecked",
                StructuredCpiPatch::Token2022BurnChecked(AmountDecimalsPatch::AmountOnly {
                    amount: frame_value(0),
                    decimals: 9,
                }),
            ),
            (
                "token2022AmountToUiAmount",
                StructuredCpiPatch::Token2022AmountToUiAmount {
                    amount: frame_value(0),
                },
            ),
            (
                "token2022InitializeMint",
                StructuredCpiPatch::Token2022InitializeMint(init_mint_patch()),
            ),
            (
                "token2022InitializeMint2",
                StructuredCpiPatch::Token2022InitializeMint2(init_mint_patch()),
            ),
            (
                "token2022InitializeMultisig",
                StructuredCpiPatch::Token2022InitializeMultisig { m: frame_value(0) },
            ),
            (
                "token2022TransferCheckedWithFee",
                StructuredCpiPatch::Token2022TransferCheckedWithFee(
                    AmountDecimalsFeePatch::AmountOnly {
                        amount: frame_value(0),
                        decimals: 9,
                        fee: 1,
                    },
                ),
            ),
            (
                "token2022SetTransferFee",
                StructuredCpiPatch::Token2022SetTransferFee(SetTransferFeePatch::BpsOnly {
                    basis_points: frame_value(0),
                    maximum_fee: 1000,
                }),
            ),
            (
                "stakeWithdraw",
                StructuredCpiPatch::StakeWithdraw {
                    lamports: frame_value(0),
                },
            ),
            (
                "stakeSplit",
                StructuredCpiPatch::StakeSplit {
                    lamports: frame_value(0),
                },
            ),
            ("stakeDeactivate", StructuredCpiPatch::StakeDeactivate),
            ("stakeDelegateStake", StructuredCpiPatch::StakeDelegateStake),
            (
                "tokenUnwrapLamports",
                StructuredCpiPatch::TokenUnwrapLamports(UnwrapLamportsPatch::Amount(
                    frame_value(0),
                )),
            ),
        ]
    }

    #[test]
    fn structured_cpi_patch_covers_all_wire_tags() {
        let samples = all_sample_structured_patches();
        assert_eq!(
            samples.len(),
            StructuredCpiPatch::COUNT as usize,
            "sample builders must cover every wire tag"
        );
        for (expected_tag, (name, patch)) in samples.iter().enumerate() {
            let patch_wire = borsh::to_vec(patch).expect(name);
            assert!(
                !patch_wire.is_empty(),
                "{name} tag {expected_tag}: empty encoded patch"
            );
            assert_eq!(
                patch_wire[0],
                expected_tag as u8,
                "{name} tag {expected_tag}: patch wire starts with {:?}, want top-level variant",
                patch_wire
            );

            let cpi = Cpi::Structured {
                accounts_start: 1,
                accounts_len: 4,
                patch: patch.clone(),
            };
            let wire = encode_cpi(&cpi).expect(name);
            assert_eq!(wire[0], 2, "{name}: CPI wire variant");
            assert_eq!(wire[1], 1, "{name}: accounts_start");
            assert_eq!(wire[2], 4, "{name}: accounts_len");
            assert_eq!(
                wire[3],
                expected_tag as u8,
                "{name} tag {expected_tag}: encode_cpi patch tag mismatch (wire={wire:?})"
            );
            assert_eq!(
                &wire[3..],
                patch_wire,
                "{name}: encode_cpi patch body must match standalone borsh"
            );
        }
    }

    #[test]
    fn system_transfer_tag_zero_includes_variant_byte() {
        // Mirrors Go TestEncodeStructuredCpiPatchSystemTransferTagZero / TS encodeStructuredCpiPatch.
        for idx in [0u8, 5] {
            let patch = StructuredCpiPatch::SystemTransfer {
                lamports: frame_value(idx),
            };
            let patch_wire = borsh::to_vec(&patch).unwrap();
            assert_eq!(patch_wire, vec![0, idx], "index {idx}");

            let cpi = Cpi::Structured {
                accounts_start: 0,
                accounts_len: 3,
                patch,
            };
            let wire = encode_cpi(&cpi).unwrap();
            assert_eq!(&wire[3..], &[0, idx], "index {idx}");
        }
    }

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
