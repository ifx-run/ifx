//! `ifx_let` binding variants (Anchor wire tags `0`–`67`).

use anchor_lang::prelude::*;

use super::expr::Expr;
use super::value_type::ValueType;

/// One `ifx_let` binding: wire tag selects variant; Frame `ty` is implied (or explicit for slices/eval).
///
/// Variant order matches opcode tags `0`–`67` (see `docs/typed-let-bindings.md`).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum LetBinding {
    /// Owner-checked raw slice of `account.data[offset..]` (caller supplies `ty`; no layout unpack).
    ///
    /// `remaining[expected_program_owner].key` must equal `remaining[account_index].owner`.
    /// **→ `ty`.**
    AccountDataSlice {
        /// Caller-supplied type of the copied bytes.
        ty: ValueType,
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
        /// Start byte of the slice in the account data.
        offset: u32,
        /// Index of the remaining account whose address must equal the data account's owner.
        expected_program_owner: u8,
    },
    /// `remaining[i].lamports` (native SOL balance). **→ `U64`.**
    AccountLamports {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Evaluate `expr` and append to frame tape.
    ///
    /// Storage type is inferred on-chain via [`infer_expr_ty`](crate::layout::infer_expr_ty)
    /// (same rules as `@ifx-run/sdk` `inferIfxTyFromExpr`). SDK `letEval` infers off-chain for layout.
    Eval {
        /// Expression evaluated and appended to the tape.
        expr: Expr,
    },
    /// `Clock::get()?.slot`. **→ `U64`.** No `remaining` account.
    SysvarClockSlot,
    /// `Clock::get()?.epoch_start_timestamp`. **→ `I64`.**
    SysvarClockEpochStartTimestamp,
    /// `Clock::get()?.epoch`. **→ `U64`.**
    SysvarClockEpoch,
    /// `Clock::get()?.leader_schedule_epoch`. **→ `U64`.**
    SysvarClockLeaderScheduleEpoch,
    /// `Clock::get()?.unix_timestamp`. **→ `I64`.**
    SysvarClockUnixTimestamp,
    /// `Rent::get()?.minimum_balance(data_len)`. **→ `U64`.**
    SysvarRentMinimumBalance {
        /// Data length passed to `Rent::minimum_balance`.
        data_len: u32,
    },
    /// SPL Token account `amount` (`owner == spl_token::ID`, 165-byte account). **→ `U64`.**
    SplTokenAccountAmount {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// SPL Token account `delegated_amount`. **→ `U64`.**
    SplTokenAccountDelegatedAmount {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// SPL Token account `state` (`AccountState` discriminant). **→ `U8`.**
    SplTokenAccountState {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// SPL Token mint `supply`. **→ `U64`.**
    SplMintSupply {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// SPL Token mint `decimals`. **→ `U8`.**
    SplMintDecimals {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 account `amount` (`owner == spl_token_2022::ID`). **→ `U64`.**
    SplToken2022AccountAmount {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 account `delegated_amount`. **→ `U64`.**
    SplToken2022AccountDelegatedAmount {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 account `state`. **→ `U8`.**
    SplToken2022AccountState {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 mint `supply`. **→ `U64`.**
    SplToken2022MintSupply {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 mint `decimals`. **→ `U8`.**
    SplToken2022MintDecimals {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 `TransferFeeAmount.withheld_amount` on token account. **→ `U64`.**
    SplToken2022AccountTransferFeeWithheld {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 mint current `transfer_fee_basis_points`. **→ `U16`.**
    SplToken2022MintTransferFeeBasisPoints {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 mint current `maximum_fee`. **→ `U64`.**
    SplToken2022MintTransferFeeMaximum {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 mint `TransferFeeConfig.withheld_amount`. **→ `U64`.**
    SplToken2022MintWithheldAmount {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 mint `DefaultAccountState.state`. **→ `U8`.**
    SplToken2022MintDefaultAccountState {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// `remaining[i].data_len()` (account data byte length). **→ `U32`.**
    AccountDataLen {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// `remaining[i].key` (account address). **→ `Pubkey`.**
    AccountKey {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Wire literal public key (no ALT; prefer [`LetBinding::AccountKey`] when possible). **→ `Pubkey`.**
    ConstPubkey {
        /// 32-byte public key literal.
        bytes: [u8; 32],
    },
    /// `Frame.generation` (increments on reset). **→ `U64`.** No `remaining` account.
    FrameGeneration,
    /// `Frame.index_count` (bindings since last reset). **→ `U16`.** No `remaining` account.
    FrameIndexCount,
    /// `remaining[i].is_signer` (runtime account meta). **→ `Bool`.**
    AccountIsSigner {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// `remaining[i].is_writable` (runtime account meta). **→ `Bool`.**
    AccountIsWritable {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Stake delegation `stake` lamports (`Stake` state). **→ `U64`.**
    StakeDelegationStake {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Stake delegation `activation_epoch`. **→ `U64`.**
    StakeDelegationActivationEpoch {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Stake delegation `deactivation_epoch`. **→ `U64`.**
    StakeDelegationDeactivationEpoch {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Stake meta `lockup.unix_timestamp`. **→ `I64`.**
    StakeLockupUnixTimestamp {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Stake meta `lockup.epoch`. **→ `U64`.**
    StakeLockupEpoch {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Stake meta `authorized.staker`. **→ `Pubkey`.**
    StakeAuthorizedStaker {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Stake meta `authorized.withdrawer`. **→ `Pubkey`.**
    StakeAuthorizedWithdrawer {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Stake delegation `voter_pubkey`. **→ `Pubkey`.**
    StakeDelegationVoter {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// SPL mint `is_initialized`. **→ `Bool`.**
    SplMintIsInitialized {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// SPL mint `mint_authority` when set. **→ `Pubkey`.** `COption::None` → `SplMintOptionEmpty`.
    SplMintMintAuthority {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// SPL mint `freeze_authority` when set. **→ `Pubkey`.** `COption::None` → `SplMintOptionEmpty`.
    SplMintFreezeAuthority {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 mint base `is_initialized`. **→ `Bool`.**
    SplToken2022MintIsInitialized {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 mint base `mint_authority` when set. **→ `Pubkey`.**
    SplToken2022MintMintAuthority {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 mint base `freeze_authority` when set. **→ `Pubkey`.**
    SplToken2022MintFreezeAuthority {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// `remaining[i].owner` (program id that owns the account). **→ `Pubkey`.**
    AccountProgramOwner {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// `remaining[i].executable`. **→ `Bool`.**
    AccountExecutable {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// `remaining[i].rent_epoch`. **→ `U64`.**
    AccountRentEpoch {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// SPL Token account `mint`. **→ `Pubkey`.**
    SplTokenAccountMint {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// SPL Token account `owner`. **→ `Pubkey`.**
    SplTokenAccountOwner {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// SPL Token account `delegate` when set. **→ `Pubkey`.**
    SplTokenAccountDelegate {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// SPL Token account `close_authority` when set. **→ `Pubkey`.**
    SplTokenAccountCloseAuthority {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// SPL Token account `is_native` when set. **→ `U64`.**
    SplTokenAccountIsNative {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// SPL Token ATA: `remaining[i].key` equals derived ATA(owner, mint). **→ `Bool`.**
    SplTokenAccountOwnerIsDerived {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 account `mint`. **→ `Pubkey`.**
    SplToken2022AccountMint {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 account `owner`. **→ `Pubkey`.**
    SplToken2022AccountOwner {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 account `delegate` when set. **→ `Pubkey`.**
    SplToken2022AccountDelegate {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 account `close_authority` when set. **→ `Pubkey`.**
    SplToken2022AccountCloseAuthority {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 account `is_native` when set. **→ `U64`.**
    SplToken2022AccountIsNative {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Token-2022 ATA derivation check. **→ `Bool`.**
    SplToken2022AccountOwnerIsDerived {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Stake account state tag (0–3). **→ `U8`.**
    StakeAccountState {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Stake meta `lockup.custodian`. **→ `Pubkey`.**
    StakeLockupCustodian {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Stake meta `rent_exempt_reserve`. **→ `U64`.**
    StakeRentExemptReserve {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Stake `credits_observed` (`Stake` state). **→ `U64`.**
    StakeCreditsObserved {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Stake flags byte (`Stake` state). **→ `U8`.**
    StakeStakeFlags {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Upgradeable loader ProgramData enum tag. **→ `U32`.**
    UpgradeableProgramDataTag {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Upgradeable loader ProgramData upgrade authority when set. **→ `Pubkey`.**
    UpgradeableProgramDataUpgradeAuthority {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
    /// Upgradeable loader Program → programdata address. **→ `Pubkey`.**
    UpgradeableProgramProgramDataAddress {
        /// Index into post-gate `remaining_accounts`.
        account_index: u8,
    },
}

impl LetBinding {
    /// Frame tape type for bindings with a fixed wire type.
    ///
    /// For [`LetBinding::Eval`], use [`infer_expr_ty`](crate::layout::infer_expr_ty).
    pub fn value_type(&self) -> ValueType {
        use LetBinding::*;
        use ValueType::*;
        match self {
            Eval { .. } => panic!("Eval binding type requires infer_expr_ty"),
            AccountDataSlice { ty, .. } => *ty,
            AccountLamports { .. }
            | SysvarClockSlot
            | SysvarClockEpoch
            | SysvarClockLeaderScheduleEpoch
            | SysvarRentMinimumBalance { .. }
            | SplTokenAccountAmount { .. }
            | SplTokenAccountDelegatedAmount { .. }
            | SplMintSupply { .. }
            | SplToken2022AccountAmount { .. }
            | SplToken2022AccountDelegatedAmount { .. }
            | SplToken2022MintSupply { .. }
            | SplToken2022AccountTransferFeeWithheld { .. }
            | SplToken2022MintTransferFeeMaximum { .. }
            | SplToken2022MintWithheldAmount { .. } => U64,
            SysvarClockEpochStartTimestamp | SysvarClockUnixTimestamp => I64,
            SplTokenAccountState { .. }
            | SplMintDecimals { .. }
            | SplToken2022AccountState { .. }
            | SplToken2022MintDecimals { .. }
            | SplToken2022MintDefaultAccountState { .. } => U8,
            SplToken2022MintTransferFeeBasisPoints { .. } => U16,
            AccountDataLen { .. } => U32,
            AccountKey { .. }
            | ConstPubkey { .. }
            | AccountProgramOwner { .. }
            | SplTokenAccountMint { .. }
            | SplTokenAccountOwner { .. }
            | SplTokenAccountDelegate { .. }
            | SplTokenAccountCloseAuthority { .. }
            | SplToken2022AccountMint { .. }
            | SplToken2022AccountOwner { .. }
            | SplToken2022AccountDelegate { .. }
            | SplToken2022AccountCloseAuthority { .. }
            | StakeAuthorizedStaker { .. }
            | StakeAuthorizedWithdrawer { .. }
            | StakeDelegationVoter { .. }
            | StakeLockupCustodian { .. }
            | SplMintMintAuthority { .. }
            | SplMintFreezeAuthority { .. }
            | SplToken2022MintMintAuthority { .. }
            | SplToken2022MintFreezeAuthority { .. }
            | UpgradeableProgramDataUpgradeAuthority { .. }
            | UpgradeableProgramProgramDataAddress { .. } => Pubkey,
            FrameGeneration => U64,
            FrameIndexCount => U16,
            AccountIsSigner { .. }
            | AccountIsWritable { .. }
            | AccountExecutable { .. }
            | SplMintIsInitialized { .. }
            | SplToken2022MintIsInitialized { .. }
            | SplTokenAccountOwnerIsDerived { .. }
            | SplToken2022AccountOwnerIsDerived { .. } => Bool,
            AccountRentEpoch { .. }
            | SplTokenAccountIsNative { .. }
            | SplToken2022AccountIsNative { .. }
            | StakeRentExemptReserve { .. }
            | StakeCreditsObserved { .. }
            | StakeDelegationStake { .. }
            | StakeDelegationActivationEpoch { .. }
            | StakeDelegationDeactivationEpoch { .. }
            | StakeLockupEpoch { .. } => U64,
            StakeLockupUnixTimestamp { .. } => I64,
            StakeAccountState { .. } | StakeStakeFlags { .. } => U8,
            UpgradeableProgramDataTag { .. } => U32,
        }
    }
}
