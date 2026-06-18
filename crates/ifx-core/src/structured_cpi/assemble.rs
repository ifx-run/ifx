//! Assemble official-program ix `data` from [`StructuredCpiPatch`] + frame bindings.

use anchor_lang::solana_program::{
    program_option::COption,
    pubkey::Pubkey,
    system_instruction,
    system_program,
};
use solana_stake_interface::program::ID as STAKE_PROGRAM_ID;
use spl_token::instruction::TokenInstruction;
use spl_token_2022::extension::transfer_fee::instruction::TransferFeeInstruction;
use spl_token_2022::instruction::TokenInstruction as Token2022Instruction;

use super::error::StructuredCpiError;
use super::frame::StructuredCpiFrame;
use crate::layout::ValueBytes;
use crate::wire::structured_cpi_payload::{
    AmountDecimalsFeePatch, AmountDecimalsPatch, FreezeAuthPatch, InitializeMintPatch,
    LamportsSpacePatch, PubkeyValue, SetTransferFeePatch, UnwrapLamportsPatch,
};
use crate::wire::{StructuredCpiPatch, Value, ValueType};

type Result<T> = std::result::Result<T, StructuredCpiError>;

/// Build instruction `data` from typed structured patch (no template blob).
pub fn assemble_structured_cpi(
    patch: &StructuredCpiPatch,
    program_id: &Pubkey,
    frame: &impl StructuredCpiFrame,
) -> Result<Vec<u8>> {
    match patch {
        StructuredCpiPatch::SystemTransfer { lamports } => {
            require_system_program(program_id)?;
            pack_system(system_instruction::transfer(
                &Pubkey::default(),
                &Pubkey::default(),
                read_u64(frame, lamports)?,
            ))
        }
        StructuredCpiPatch::SystemCreateAccount(ls) => {
            require_system_program(program_id)?;
            let (lamports, space) = resolve_lamports_space(frame, ls)?;
            pack_system(system_instruction::create_account(
                &Pubkey::default(),
                &Pubkey::default(),
                lamports,
                space,
                &Pubkey::default(),
            ))
        }
        StructuredCpiPatch::SystemAllocate { space } => {
            require_system_program(program_id)?;
            pack_system(system_instruction::allocate(
                &Pubkey::default(),
                read_u64(frame, space)?,
            ))
        }

        StructuredCpiPatch::TokenTransfer { amount } => {
            pack_token(program_id, &spl_token::ID, TokenInstruction::Transfer {
                amount: read_u64(frame, amount)?,
            })
        }
        StructuredCpiPatch::TokenApprove { amount } => {
            pack_token(program_id, &spl_token::ID, TokenInstruction::Approve {
                amount: read_u64(frame, amount)?,
            })
        }
        StructuredCpiPatch::TokenMintTo { amount } => {
            pack_token(program_id, &spl_token::ID, TokenInstruction::MintTo {
                amount: read_u64(frame, amount)?,
            })
        }
        StructuredCpiPatch::TokenBurn { amount } => {
            pack_token(program_id, &spl_token::ID, TokenInstruction::Burn {
                amount: read_u64(frame, amount)?,
            })
        }
        StructuredCpiPatch::TokenAmountToUiAmount { amount } => {
            pack_token(
                program_id,
                &spl_token::ID,
                TokenInstruction::AmountToUiAmount {
                    amount: read_u64(frame, amount)?,
                },
            )
        }
        StructuredCpiPatch::TokenTransferChecked(ad) => {
            let (amount, decimals) = resolve_amount_decimals(frame, ad)?;
            pack_token(
                program_id,
                &spl_token::ID,
                TokenInstruction::TransferChecked { amount, decimals },
            )
        }
        StructuredCpiPatch::TokenApproveChecked(ad) => {
            let (amount, decimals) = resolve_amount_decimals(frame, ad)?;
            pack_token(
                program_id,
                &spl_token::ID,
                TokenInstruction::ApproveChecked { amount, decimals },
            )
        }
        StructuredCpiPatch::TokenMintToChecked(ad) => {
            let (amount, decimals) = resolve_amount_decimals(frame, ad)?;
            pack_token(
                program_id,
                &spl_token::ID,
                TokenInstruction::MintToChecked { amount, decimals },
            )
        }
        StructuredCpiPatch::TokenBurnChecked(ad) => {
            let (amount, decimals) = resolve_amount_decimals(frame, ad)?;
            pack_token(
                program_id,
                &spl_token::ID,
                TokenInstruction::BurnChecked { amount, decimals },
            )
        }
        StructuredCpiPatch::TokenInitializeMultisig { m } => pack_token(
            program_id,
            &spl_token::ID,
            TokenInstruction::InitializeMultisig {
                m: read_u8(frame, m)?,
            },
        ),
        StructuredCpiPatch::TokenInitializeMint(shape) => pack_token(
            program_id,
            &spl_token::ID,
            resolve_initialize_mint(frame, shape, InitializeMintKind::V1)?,
        ),
        StructuredCpiPatch::TokenInitializeMint2(shape) => pack_token(
            program_id,
            &spl_token::ID,
            resolve_initialize_mint(frame, shape, InitializeMintKind::V2)?,
        ),

        StructuredCpiPatch::Token2022Transfer { amount } => {
            pack_token(program_id, &spl_token_2022::ID, TokenInstruction::Transfer {
                amount: read_u64(frame, amount)?,
            })
        }
        StructuredCpiPatch::Token2022Approve { amount } => {
            pack_token(program_id, &spl_token_2022::ID, TokenInstruction::Approve {
                amount: read_u64(frame, amount)?,
            })
        }
        StructuredCpiPatch::Token2022MintTo { amount } => {
            pack_token(program_id, &spl_token_2022::ID, TokenInstruction::MintTo {
                amount: read_u64(frame, amount)?,
            })
        }
        StructuredCpiPatch::Token2022Burn { amount } => {
            pack_token(program_id, &spl_token_2022::ID, TokenInstruction::Burn {
                amount: read_u64(frame, amount)?,
            })
        }
        StructuredCpiPatch::Token2022AmountToUiAmount { amount } => pack_token(
            program_id,
            &spl_token_2022::ID,
            TokenInstruction::AmountToUiAmount {
                amount: read_u64(frame, amount)?,
            },
        ),
        StructuredCpiPatch::Token2022TransferChecked(ad) => {
            let (amount, decimals) = resolve_amount_decimals(frame, ad)?;
            pack_token(
                program_id,
                &spl_token_2022::ID,
                TokenInstruction::TransferChecked { amount, decimals },
            )
        }
        StructuredCpiPatch::Token2022ApproveChecked(ad) => {
            let (amount, decimals) = resolve_amount_decimals(frame, ad)?;
            pack_token(
                program_id,
                &spl_token_2022::ID,
                TokenInstruction::ApproveChecked { amount, decimals },
            )
        }
        StructuredCpiPatch::Token2022MintToChecked(ad) => {
            let (amount, decimals) = resolve_amount_decimals(frame, ad)?;
            pack_token(
                program_id,
                &spl_token_2022::ID,
                TokenInstruction::MintToChecked { amount, decimals },
            )
        }
        StructuredCpiPatch::Token2022BurnChecked(ad) => {
            let (amount, decimals) = resolve_amount_decimals(frame, ad)?;
            pack_token(
                program_id,
                &spl_token_2022::ID,
                TokenInstruction::BurnChecked { amount, decimals },
            )
        }
        StructuredCpiPatch::Token2022InitializeMultisig { m } => pack_token(
            program_id,
            &spl_token_2022::ID,
            TokenInstruction::InitializeMultisig {
                m: read_u8(frame, m)?,
            },
        ),
        StructuredCpiPatch::Token2022TransferCheckedWithFee(fee_patch) => {
            let (amount, decimals, fee) = resolve_amount_decimals_fee(frame, fee_patch)?;
            pack_transfer_fee(
                program_id,
                TransferFeeInstruction::TransferCheckedWithFee {
                    amount,
                    decimals,
                    fee,
                },
            )
        }
        StructuredCpiPatch::Token2022SetTransferFee(fee_patch) => {
            let (basis_points, maximum_fee) = resolve_set_transfer_fee(frame, fee_patch)?;
            pack_transfer_fee(
                program_id,
                TransferFeeInstruction::SetTransferFee {
                    transfer_fee_basis_points: basis_points,
                    maximum_fee,
                },
            )
        }
        StructuredCpiPatch::Token2022InitializeMint(shape) => pack_token(
            program_id,
            &spl_token_2022::ID,
            resolve_initialize_mint(frame, shape, InitializeMintKind::V1)?,
        ),
        StructuredCpiPatch::Token2022InitializeMint2(shape) => pack_token(
            program_id,
            &spl_token_2022::ID,
            resolve_initialize_mint(frame, shape, InitializeMintKind::V2)?,
        ),

        StructuredCpiPatch::StakeWithdraw { lamports } => {
            require_stake_program(program_id)?;
            Ok(pack_stake_u64(4, read_u64(frame, lamports)?))
        }
        StructuredCpiPatch::StakeSplit { lamports } => {
            require_stake_program(program_id)?;
            Ok(pack_stake_u64(3, read_u64(frame, lamports)?))
        }
        StructuredCpiPatch::StakeDeactivate => {
            require_stake_program(program_id)?;
            Ok(pack_stake_unit(5))
        }
        StructuredCpiPatch::StakeDelegateStake => {
            require_stake_program(program_id)?;
            Ok(pack_stake_unit(2))
        }
        StructuredCpiPatch::TokenUnwrapLamports(shape) => {
            pack_token_unwrap_lamports(program_id, resolve_unwrap_lamports(frame, shape)?)
        }
    }
}

enum InitializeMintKind {
    V1,
    V2,
}

fn pack_system(ix: anchor_lang::solana_program::instruction::Instruction) -> Result<Vec<u8>> {
    Ok(ix.data)
}

fn pack_token(
    program_id: &Pubkey,
    expected: &Pubkey,
    instruction: TokenInstruction<'_>,
) -> Result<Vec<u8>> {
    require_token_program(program_id, expected)?;
    Ok(instruction.pack())
}

fn pack_transfer_fee(
    program_id: &Pubkey,
    fee_ix: TransferFeeInstruction,
) -> Result<Vec<u8>> {
    require_token_2022_program(program_id)?;
    let mut data = Token2022Instruction::TransferFeeExtension.pack();
    fee_ix.pack(&mut data);
    Ok(data)
}

fn resolve_initialize_mint(
    frame: &impl StructuredCpiFrame,
    patch: &InitializeMintPatch,
    kind: InitializeMintKind,
) -> Result<TokenInstruction<'static>> {
    let decimals = read_u8(frame, &patch.decimals)?;
    let mint_authority = resolve_pubkey_value(frame, &patch.mint_authority)?;
    let freeze_authority = resolve_freeze_auth(frame, &patch.freeze)?;
    Ok(match kind {
        InitializeMintKind::V1 => TokenInstruction::InitializeMint {
            decimals,
            mint_authority,
            freeze_authority,
        },
        InitializeMintKind::V2 => TokenInstruction::InitializeMint2 {
            decimals,
            mint_authority,
            freeze_authority,
        },
    })
}

fn resolve_unwrap_lamports(
    frame: &impl StructuredCpiFrame,
    patch: &UnwrapLamportsPatch,
) -> Result<COption<u64>> {
    match patch {
        UnwrapLamportsPatch::All => Ok(COption::None),
        UnwrapLamportsPatch::Amount(v) => Ok(COption::Some(read_u64(frame, v)?)),
    }
}

fn pack_token_unwrap_lamports(program_id: &Pubkey, amount: COption<u64>) -> Result<Vec<u8>> {
    require_token_program(program_id, &spl_token::ID)?;
    let mut data = vec![45u8];
    match amount {
        COption::None => data.push(0),
        COption::Some(lamports) => {
            data.push(1);
            data.extend_from_slice(&lamports.to_le_bytes());
        }
    }
    Ok(data)
}

fn resolve_lamports_space(
    frame: &impl StructuredCpiFrame,
    ls: &LamportsSpacePatch,
) -> Result<(u64, u64)> {
    match ls {
        LamportsSpacePatch::LamportsOnly { lamports, space } => {
            Ok((read_u64(frame, lamports)?, *space))
        }
        LamportsSpacePatch::SpaceOnly { lamports, space } => {
            Ok((*lamports, read_u64(frame, space)?))
        }
        LamportsSpacePatch::Both { lamports, space } => {
            Ok((read_u64(frame, lamports)?, read_u64(frame, space)?))
        }
    }
}

fn resolve_amount_decimals(
    frame: &impl StructuredCpiFrame,
    ad: &AmountDecimalsPatch,
) -> Result<(u64, u8)> {
    match ad {
        AmountDecimalsPatch::AmountOnly { amount, decimals } => {
            Ok((read_u64(frame, amount)?, *decimals))
        }
        AmountDecimalsPatch::Both { amount, decimals } => {
            Ok((read_u64(frame, amount)?, read_u8(frame, decimals)?))
        }
        AmountDecimalsPatch::DecimalsOnly { amount, decimals } => {
            Ok((*amount, read_u8(frame, decimals)?))
        }
    }
}

fn resolve_amount_decimals_fee(
    frame: &impl StructuredCpiFrame,
    patch: &AmountDecimalsFeePatch,
) -> Result<(u64, u8, u64)> {
    match patch {
        AmountDecimalsFeePatch::AmountOnly {
            amount,
            decimals,
            fee,
        } => Ok((read_u64(frame, amount)?, *decimals, *fee)),
        AmountDecimalsFeePatch::DecimalsOnly {
            amount,
            decimals,
            fee,
        } => Ok((*amount, read_u8(frame, decimals)?, *fee)),
        AmountDecimalsFeePatch::FeeOnly {
            amount,
            decimals,
            fee,
        } => Ok((*amount, *decimals, read_u64(frame, fee)?)),
        AmountDecimalsFeePatch::AmountDecimals {
            amount,
            decimals,
            fee,
        } => Ok((read_u64(frame, amount)?, read_u8(frame, decimals)?, *fee)),
        AmountDecimalsFeePatch::AmountFee {
            amount,
            decimals,
            fee,
        } => Ok((read_u64(frame, amount)?, *decimals, read_u64(frame, fee)?)),
        AmountDecimalsFeePatch::DecimalsFee {
            amount,
            decimals,
            fee,
        } => Ok((*amount, read_u8(frame, decimals)?, read_u64(frame, fee)?)),
        AmountDecimalsFeePatch::AllFromFrame {
            amount,
            decimals,
            fee,
        } => Ok((
            read_u64(frame, amount)?,
            read_u8(frame, decimals)?,
            read_u64(frame, fee)?,
        )),
    }
}

fn resolve_set_transfer_fee(
    frame: &impl StructuredCpiFrame,
    patch: &SetTransferFeePatch,
) -> Result<(u16, u64)> {
    match patch {
        SetTransferFeePatch::BpsOnly {
            basis_points,
            maximum_fee,
        } => Ok((read_u16(frame, basis_points)?, *maximum_fee)),
        SetTransferFeePatch::MaxOnly {
            basis_points,
            maximum_fee,
        } => Ok((*basis_points, read_u64(frame, maximum_fee)?)),
        SetTransferFeePatch::Both {
            basis_points,
            maximum_fee,
        } => Ok((read_u16(frame, basis_points)?, read_u64(frame, maximum_fee)?)),
    }
}

fn resolve_pubkey_value(frame: &impl StructuredCpiFrame, value: &PubkeyValue) -> Result<Pubkey> {
    match value {
        PubkeyValue::FromFrame(v) => read_pubkey(frame, v),
        PubkeyValue::Literal(pk) => Ok(Pubkey::new_from_array(*pk)),
    }
}

fn resolve_freeze_auth(
    frame: &impl StructuredCpiFrame,
    freeze: &FreezeAuthPatch,
) -> Result<COption<Pubkey>> {
    match freeze {
        FreezeAuthPatch::None => Ok(COption::None),
        FreezeAuthPatch::SomeValue(v) => Ok(COption::Some(read_pubkey(frame, v)?)),
        FreezeAuthPatch::SomeLiteral(pk) => Ok(COption::Some(Pubkey::new_from_array(*pk))),
    }
}

fn require_system_program(program_id: &Pubkey) -> Result<()> {
    if program_id != &system_program::ID {
        return Err(StructuredCpiError::InvalidProgram);
    }
    Ok(())
}

fn require_token_program(program_id: &Pubkey, expected: &Pubkey) -> Result<()> {
    if program_id != expected {
        return Err(StructuredCpiError::InvalidProgram);
    }
    Ok(())
}

fn require_token_2022_program(program_id: &Pubkey) -> Result<()> {
    require_token_program(program_id, &spl_token_2022::ID)
}

fn require_stake_program(program_id: &Pubkey) -> Result<()> {
    if program_id.to_bytes() != STAKE_PROGRAM_ID.to_bytes() {
        return Err(StructuredCpiError::InvalidProgram);
    }
    Ok(())
}

/// Stake ix bincode variant + optional `u64` payload (matches `StakeInstruction` wire).
fn pack_stake_u64(variant: u32, lamports: u64) -> Vec<u8> {
    let mut data = Vec::with_capacity(12);
    data.extend_from_slice(&variant.to_le_bytes());
    data.extend_from_slice(&lamports.to_le_bytes());
    data
}

fn pack_stake_unit(variant: u32) -> Vec<u8> {
    variant.to_le_bytes().to_vec()
}

fn read_typed(frame: &impl StructuredCpiFrame, index: u8, expected: ValueType) -> Result<ValueBytes> {
    let ty = frame.read_value_type(index)?;
    if !(ty == expected) {
        return Err(StructuredCpiError::LoadTypeMismatch);
    }
    frame.read_bytes(index, expected)
}

fn read_u8(frame: &impl StructuredCpiFrame, source: &Value) -> Result<u8> {
    Ok(read_typed(frame, source.index, ValueType::U8)?.as_slice()[0])
}

fn read_u16(frame: &impl StructuredCpiFrame, source: &Value) -> Result<u16> {
    let bytes = read_typed(frame, source.index, ValueType::U16)?;
    Ok(u16::from_le_bytes(bytes.as_slice().try_into().unwrap()))
}

fn read_u64(frame: &impl StructuredCpiFrame, source: &Value) -> Result<u64> {
    let bytes = read_typed(frame, source.index, ValueType::U64)?;
    Ok(u64::from_le_bytes(bytes.as_slice().try_into().unwrap()))
}

fn read_pubkey(frame: &impl StructuredCpiFrame, source: &Value) -> Result<Pubkey> {
    let bytes = read_typed(frame, source.index, ValueType::Pubkey)?;
    Ok(Pubkey::new_from_array(
        bytes.as_slice().try_into().unwrap(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::layout::ValueBytes;
    use crate::wire::structured_cpi_payload::UnwrapLamportsPatch;
    use crate::wire::StructuredCpiPatch;

    struct MockFrame {
        types: Vec<ValueType>,
        payloads: Vec<ValueBytes>,
    }

    impl MockFrame {
        fn with_slots(slots: &[(ValueType, &[u8])]) -> Self {
            Self {
                types: slots.iter().map(|(ty, _)| *ty).collect(),
                payloads: slots
                    .iter()
                    .map(|(ty, bytes)| ValueBytes::copy_from(*ty, bytes).unwrap())
                    .collect(),
            }
        }
    }

    impl StructuredCpiFrame for MockFrame {
        fn read_value_type(&self, index: u8) -> Result<ValueType> {
            self.types
                .get(index as usize)
                .copied()
                .ok_or(StructuredCpiError::FrameRead)
        }

        fn read_bytes(&self, index: u8, ty: ValueType) -> Result<ValueBytes> {
            if self.types.get(index as usize).copied() != Some(ty) {
                return Err(StructuredCpiError::LoadTypeMismatch);
            }
            self.payloads
                .get(index as usize)
                .copied()
                .ok_or(StructuredCpiError::FrameRead)
        }
    }

    fn v(idx: u8) -> Value {
        Value { index: idx }
    }

    #[test]
    fn token_patch_rejects_wrong_program_id() {
        let frame = MockFrame::with_slots(&[(ValueType::U64, &1u64.to_le_bytes())]);
        let patch = StructuredCpiPatch::TokenTransferChecked(AmountDecimalsPatch::AmountOnly {
            amount: v(0),
            decimals: 9,
        });
        let err = assemble_structured_cpi(&patch, &system_program::ID, &frame).unwrap_err();
        assert_eq!(err, StructuredCpiError::InvalidProgram);
    }

    #[test]
    fn system_transfer_rejects_token_program_id() {
        let frame = MockFrame::with_slots(&[(ValueType::U64, &1u64.to_le_bytes())]);
        let patch = StructuredCpiPatch::SystemTransfer { lamports: v(0) };
        let err = assemble_structured_cpi(&patch, &spl_token::ID, &frame).unwrap_err();
        assert_eq!(err, StructuredCpiError::InvalidProgram);
    }

    #[test]
    fn patch_count_unchanged() {
        assert_eq!(StructuredCpiPatch::COUNT, 34);
    }

    #[test]
    fn system_transfer_matches_official_pack() {
        let frame = MockFrame::with_slots(&[(ValueType::U64, &500u64.to_le_bytes())]);
        let data = assemble_structured_cpi(
            &StructuredCpiPatch::SystemTransfer { lamports: v(0) },
            &system_program::ID,
            &frame,
        )
        .unwrap();
        assert_eq!(
            data,
            system_instruction::transfer(&Pubkey::default(), &Pubkey::default(), 500).data
        );
    }

    #[test]
    fn token_transfer_checked_matches_official_pack() {
        let frame = MockFrame::with_slots(&[(ValueType::U64, &42u64.to_le_bytes())]);
        let patch = StructuredCpiPatch::TokenTransferChecked(AmountDecimalsPatch::AmountOnly {
            amount: v(0),
            decimals: 9,
        });
        let data = assemble_structured_cpi(&patch, &spl_token::ID, &frame).unwrap();
        assert_eq!(
            data,
            TokenInstruction::TransferChecked {
                amount: 42,
                decimals: 9,
            }
            .pack()
        );
    }

    #[test]
    fn token_initialize_mint2_matches_official_pack() {
        let auth = Pubkey::new_unique();
        let frame = MockFrame::with_slots(&[
            (ValueType::U8, &[6u8]),
            (ValueType::Pubkey, auth.as_ref()),
        ]);
        let patch = StructuredCpiPatch::TokenInitializeMint2(InitializeMintPatch {
            decimals: v(0),
            mint_authority: PubkeyValue::FromFrame(v(1)),
            freeze: FreezeAuthPatch::None,
        });
        let data = assemble_structured_cpi(&patch, &spl_token::ID, &frame).unwrap();
        assert_eq!(
            data,
            TokenInstruction::InitializeMint2 {
                decimals: 6,
                mint_authority: auth,
                freeze_authority: COption::None,
            }
            .pack()
        );
    }

    #[test]
    fn token2022_transfer_checked_with_fee_matches_official_pack() {
        let frame = MockFrame::with_slots(&[(ValueType::U64, &100u64.to_le_bytes())]);
        let patch =
            StructuredCpiPatch::Token2022TransferCheckedWithFee(AmountDecimalsFeePatch::AmountOnly {
                amount: v(0),
                decimals: 6,
                fee: 3,
            });
        let data = assemble_structured_cpi(&patch, &spl_token_2022::ID, &frame).unwrap();
        let mut expected = Token2022Instruction::TransferFeeExtension.pack();
        TransferFeeInstruction::TransferCheckedWithFee {
            amount: 100,
            decimals: 6,
            fee: 3,
        }
        .pack(&mut expected);
        assert_eq!(data, expected);
    }

    #[test]
    fn token2022_set_transfer_fee_matches_official_pack() {
        let frame = MockFrame::with_slots(&[(ValueType::U16, &250u16.to_le_bytes())]);
        let patch = StructuredCpiPatch::Token2022SetTransferFee(SetTransferFeePatch::BpsOnly {
            basis_points: v(0),
            maximum_fee: 1_000_000,
        });
        let data = assemble_structured_cpi(&patch, &spl_token_2022::ID, &frame).unwrap();
        let mut expected = Token2022Instruction::TransferFeeExtension.pack();
        TransferFeeInstruction::SetTransferFee {
            transfer_fee_basis_points: 250,
            maximum_fee: 1_000_000,
        }
        .pack(&mut expected);
        assert_eq!(data, expected);
    }

    #[test]
    fn stake_withdraw_matches_bincode_layout() {
        let frame = MockFrame::with_slots(&[(ValueType::U64, &1_500_000_000u64.to_le_bytes())]);
        let patch = StructuredCpiPatch::StakeWithdraw { lamports: v(0) };
        let stake_id = Pubkey::new_from_array(STAKE_PROGRAM_ID.to_bytes());
        let data = assemble_structured_cpi(&patch, &stake_id, &frame).unwrap();
        assert_eq!(data, pack_stake_u64(4, 1_500_000_000));
    }

    #[test]
    fn stake_deactivate_matches_bincode_layout() {
        let frame = MockFrame::with_slots(&[]);
        let patch = StructuredCpiPatch::StakeDeactivate;
        let stake_id = Pubkey::new_from_array(STAKE_PROGRAM_ID.to_bytes());
        let data = assemble_structured_cpi(&patch, &stake_id, &frame).unwrap();
        assert_eq!(data, pack_stake_unit(5));
    }

    #[test]
    fn token_unwrap_lamports_all_matches_coption_layout() {
        let frame = MockFrame::with_slots(&[]);
        let patch = StructuredCpiPatch::TokenUnwrapLamports(UnwrapLamportsPatch::All);
        let data =
            assemble_structured_cpi(&patch, &spl_token::ID, &frame).unwrap();
        assert_eq!(data, vec![45, 0]);
    }

    #[test]
    fn token_unwrap_lamports_amount_matches_coption_layout() {
        let frame = MockFrame::with_slots(&[(ValueType::U64, &42u64.to_le_bytes())]);
        let patch = StructuredCpiPatch::TokenUnwrapLamports(UnwrapLamportsPatch::Amount(v(0)));
        let data =
            assemble_structured_cpi(&patch, &spl_token::ID, &frame).unwrap();
        assert_eq!(data, vec![45, 1, 42, 0, 0, 0, 0, 0, 0, 0]);
    }

    #[test]
    fn token_unwrap_lamports_rejects_token_2022_program_id() {
        let frame = MockFrame::with_slots(&[]);
        let patch = StructuredCpiPatch::TokenUnwrapLamports(UnwrapLamportsPatch::All);
        let err = assemble_structured_cpi(&patch, &spl_token_2022::ID, &frame)
            .unwrap_err();
        assert!(matches!(err, StructuredCpiError::InvalidProgram));
    }
}
