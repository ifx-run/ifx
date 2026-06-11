//! `FrameScratch` typed `let_*` planners (SPL, clock, stake, …).

use ifx_core::wire::{LetBinding, ValueType};
use solana_sdk::instruction::AccountMeta;
use solana_sdk::pubkey::Pubkey;

use crate::error::ScratchError;
use crate::scratch::FrameScratch;
use crate::typed::ScratchValue;

fn readonly_meta(pubkey: Pubkey) -> AccountMeta {
    AccountMeta {
        pubkey,
        is_signer: false,
        is_writable: false,
    }
}

macro_rules! let_one_account {
    ($($fn_name:ident => $variant:ident),* $(,)?) => {
        $(
            pub fn $fn_name(&mut self, account: Pubkey) -> Result<ScratchValue, ScratchError> {
                self.plan(
                    LetBinding::$variant { account_index: 0 },
                    &[readonly_meta(account)],
                )
            }
        )*
    };
}

impl FrameScratch {
    let_one_account! {
        let_spl_token_amount => SplTokenAccountAmount,
        let_spl_token_delegated_amount => SplTokenAccountDelegatedAmount,
        let_spl_token_account_state => SplTokenAccountState,
        let_spl_mint_supply => SplMintSupply,
        let_spl_mint_decimals => SplMintDecimals,
        let_spl_token2022_amount => SplToken2022AccountAmount,
        let_spl_token2022_delegated_amount => SplToken2022AccountDelegatedAmount,
        let_spl_token2022_account_state => SplToken2022AccountState,
        let_spl_token2022_transfer_fee_withheld => SplToken2022AccountTransferFeeWithheld,
        let_spl_token2022_mint_supply => SplToken2022MintSupply,
        let_spl_token2022_mint_decimals => SplToken2022MintDecimals,
        let_spl_token2022_mint_transfer_fee_bps => SplToken2022MintTransferFeeBasisPoints,
        let_spl_token2022_mint_transfer_fee_max => SplToken2022MintTransferFeeMaximum,
        let_spl_token2022_mint_withheld_amount => SplToken2022MintWithheldAmount,
        let_spl_token2022_mint_default_account_state => SplToken2022MintDefaultAccountState,
        let_account_key => AccountKey,
        let_stake_authorized_staker => StakeAuthorizedStaker,
        let_stake_authorized_withdrawer => StakeAuthorizedWithdrawer,
        let_stake_lockup_unix_timestamp => StakeLockupUnixTimestamp,
        let_stake_lockup_epoch => StakeLockupEpoch,
        let_stake_delegation_stake => StakeDelegationStake,
    }

    pub fn let_const_pubkey(&mut self, bytes: [u8; 32]) -> Result<ScratchValue, ScratchError> {
        self.plan(LetBinding::ConstPubkey { bytes }, &[])
    }

    pub fn let_frame_generation(&mut self) -> Result<ScratchValue, ScratchError> {
        self.plan(LetBinding::FrameGeneration, &[])
    }

    pub fn let_frame_index_count(&mut self) -> Result<ScratchValue, ScratchError> {
        self.plan(LetBinding::FrameIndexCount, &[])
    }

    pub fn clock_slot(&mut self) -> Result<ScratchValue, ScratchError> {
        self.plan(LetBinding::SysvarClockSlot, &[])
    }

    pub fn clock_epoch_start_timestamp(&mut self) -> Result<ScratchValue, ScratchError> {
        self.plan(LetBinding::SysvarClockEpochStartTimestamp, &[])
    }

    pub fn clock_epoch(&mut self) -> Result<ScratchValue, ScratchError> {
        self.plan(LetBinding::SysvarClockEpoch, &[])
    }

    pub fn clock_leader_schedule_epoch(&mut self) -> Result<ScratchValue, ScratchError> {
        self.plan(LetBinding::SysvarClockLeaderScheduleEpoch, &[])
    }

    pub fn clock_unix_timestamp(&mut self) -> Result<ScratchValue, ScratchError> {
        self.plan(LetBinding::SysvarClockUnixTimestamp, &[])
    }

    pub fn rent_minimum_balance(&mut self, data_len: u32) -> Result<ScratchValue, ScratchError> {
        self.plan(LetBinding::SysvarRentMinimumBalance { data_len }, &[])
    }

    pub fn let_account_data_slice(
        &mut self,
        account: Pubkey,
        expected_owner: Pubkey,
        ty: ValueType,
        offset: u32,
    ) -> Result<ScratchValue, ScratchError> {
        self.plan(
            LetBinding::AccountDataSlice {
                ty,
                account_index: 0,
                offset,
                expected_program_owner: 1,
            },
            &[readonly_meta(account), readonly_meta(expected_owner)],
        )
    }
}
