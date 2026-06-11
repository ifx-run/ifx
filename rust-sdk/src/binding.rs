//! `LetBinding` account-index remap and eval helpers.

use ifx_core::wire::{Expr, LetBinding, ValueType};

use crate::error::ScratchError;

use std::collections::HashMap;

use ifx_core::layout::{infer_expr_ty, ExprTypeContext, LayoutError};

struct PlannerCtx<'a> {
    index_types: &'a HashMap<u8, ValueType>,
}

impl ExprTypeContext for PlannerCtx<'_> {
    fn binding_value_type(&self, index: u8) -> Result<ValueType, LayoutError> {
        self.index_types
            .get(&index)
            .copied()
            .ok_or(LayoutError::InvalidValueIndex)
    }
}

/// Frame tape type implied by a `LetBinding` (Eval uses prior planner bindings).
pub fn infer_binding_ty(
    binding: &LetBinding,
    index_types: &HashMap<u8, ValueType>,
) -> Result<ValueType, ScratchError> {
    match binding {
        LetBinding::Eval { expr } => infer_expr_ty(&PlannerCtx { index_types }, expr)
            .map_err(|e| ScratchError::BindingType(format!("eval type: {e:?}"))),
        _ => Ok(binding.value_type()),
    }
}

/// Set `account_index` on account-scoped bindings (LetBuilder dedup).
pub fn remap_account_index(binding: LetBinding, account_index: u8) -> LetBinding {
    use LetBinding::*;
    match binding {
        AccountDataSlice {
            ty,
            offset,
            expected_program_owner,
            ..
        } => AccountDataSlice {
            ty,
            account_index,
            offset,
            expected_program_owner,
        },
        AccountLamports { .. } => AccountLamports { account_index },
        SplTokenAccountAmount { .. } => SplTokenAccountAmount { account_index },
        SplTokenAccountDelegatedAmount { .. } => SplTokenAccountDelegatedAmount { account_index },
        SplTokenAccountState { .. } => SplTokenAccountState { account_index },
        SplMintSupply { .. } => SplMintSupply { account_index },
        SplMintDecimals { .. } => SplMintDecimals { account_index },
        SplToken2022AccountAmount { .. } => SplToken2022AccountAmount { account_index },
        SplToken2022AccountDelegatedAmount { .. } => {
            SplToken2022AccountDelegatedAmount { account_index }
        }
        SplToken2022AccountState { .. } => SplToken2022AccountState { account_index },
        SplToken2022MintSupply { .. } => SplToken2022MintSupply { account_index },
        SplToken2022MintDecimals { .. } => SplToken2022MintDecimals { account_index },
        SplToken2022AccountTransferFeeWithheld { .. } => {
            SplToken2022AccountTransferFeeWithheld { account_index }
        }
        SplToken2022MintTransferFeeBasisPoints { .. } => {
            SplToken2022MintTransferFeeBasisPoints { account_index }
        }
        SplToken2022MintTransferFeeMaximum { .. } => {
            SplToken2022MintTransferFeeMaximum { account_index }
        }
        SplToken2022MintWithheldAmount { .. } => SplToken2022MintWithheldAmount { account_index },
        SplToken2022MintDefaultAccountState { .. } => {
            SplToken2022MintDefaultAccountState { account_index }
        }
        AccountDataLen { .. } => AccountDataLen { account_index },
        AccountKey { .. } => AccountKey { account_index },
        AccountIsSigner { .. } => AccountIsSigner { account_index },
        AccountIsWritable { .. } => AccountIsWritable { account_index },
        StakeDelegationStake { .. } => StakeDelegationStake { account_index },
        StakeDelegationActivationEpoch { .. } => StakeDelegationActivationEpoch { account_index },
        StakeDelegationDeactivationEpoch { .. } => {
            StakeDelegationDeactivationEpoch { account_index }
        }
        StakeLockupUnixTimestamp { .. } => StakeLockupUnixTimestamp { account_index },
        StakeLockupEpoch { .. } => StakeLockupEpoch { account_index },
        StakeAuthorizedStaker { .. } => StakeAuthorizedStaker { account_index },
        StakeAuthorizedWithdrawer { .. } => StakeAuthorizedWithdrawer { account_index },
        StakeDelegationVoter { .. } => StakeDelegationVoter { account_index },
        SplMintIsInitialized { .. } => SplMintIsInitialized { account_index },
        SplMintMintAuthority { .. } => SplMintMintAuthority { account_index },
        SplMintFreezeAuthority { .. } => SplMintFreezeAuthority { account_index },
        SplToken2022MintIsInitialized { .. } => SplToken2022MintIsInitialized { account_index },
        SplToken2022MintMintAuthority { .. } => SplToken2022MintMintAuthority { account_index },
        SplToken2022MintFreezeAuthority { .. } => SplToken2022MintFreezeAuthority { account_index },
        AccountProgramOwner { .. } => AccountProgramOwner { account_index },
        AccountExecutable { .. } => AccountExecutable { account_index },
        AccountRentEpoch { .. } => AccountRentEpoch { account_index },
        SplTokenAccountMint { .. } => SplTokenAccountMint { account_index },
        SplTokenAccountOwner { .. } => SplTokenAccountOwner { account_index },
        SplTokenAccountDelegate { .. } => SplTokenAccountDelegate { account_index },
        SplTokenAccountCloseAuthority { .. } => SplTokenAccountCloseAuthority { account_index },
        SplTokenAccountIsNative { .. } => SplTokenAccountIsNative { account_index },
        SplTokenAccountOwnerIsDerived { .. } => SplTokenAccountOwnerIsDerived { account_index },
        SplToken2022AccountMint { .. } => SplToken2022AccountMint { account_index },
        SplToken2022AccountOwner { .. } => SplToken2022AccountOwner { account_index },
        SplToken2022AccountDelegate { .. } => SplToken2022AccountDelegate { account_index },
        SplToken2022AccountCloseAuthority { .. } => {
            SplToken2022AccountCloseAuthority { account_index }
        }
        SplToken2022AccountIsNative { .. } => SplToken2022AccountIsNative { account_index },
        SplToken2022AccountOwnerIsDerived { .. } => {
            SplToken2022AccountOwnerIsDerived { account_index }
        }
        StakeAccountState { .. } => StakeAccountState { account_index },
        StakeLockupCustodian { .. } => StakeLockupCustodian { account_index },
        StakeRentExemptReserve { .. } => StakeRentExemptReserve { account_index },
        StakeCreditsObserved { .. } => StakeCreditsObserved { account_index },
        StakeStakeFlags { .. } => StakeStakeFlags { account_index },
        UpgradeableProgramDataTag { .. } => UpgradeableProgramDataTag { account_index },
        UpgradeableProgramDataUpgradeAuthority { .. } => {
            UpgradeableProgramDataUpgradeAuthority { account_index }
        }
        UpgradeableProgramProgramDataAddress { .. } => {
            UpgradeableProgramProgramDataAddress { account_index }
        }
        other => other,
    }
}

pub fn eval_const_u64(n: u64) -> LetBinding {
    LetBinding::Eval {
        expr: Expr::ConstU64(n),
    }
}

pub fn eval_const_bool(v: bool) -> LetBinding {
    LetBinding::Eval {
        expr: Expr::ConstBool(v),
    }
}
