use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::get_stack_height;
use anchor_lang::solana_program::clock::Clock;
use anchor_lang::solana_program::rent::Rent;
use spl_token::solana_program::program_pack::Pack;
use spl_token::state::{Account as SplAccount, Mint as SplMint};
use spl_token_2022::extension::transfer_fee::{TransferFeeAmount, TransferFeeConfig};
use spl_token_2022::extension::{
    default_account_state::DefaultAccountState, BaseStateWithExtensions, StateWithExtensions,
};
use spl_token_2022::state::{Account as Spl2022Account, Mint as Spl2022Mint};

use crate::{
    error::ErrorCode,
    pseudocode,
    state::types::{LetArgs, LetBinding, ValueType},
    state::value_codec::{encode_typed, TypedValue, ValueBytes},
};

use super::frame_access::{FrameReader, FrameWriter};
use super::frame_account::FrameAccount;
use super::let_exec::{eval_expr, get_remaining, infer_expr_ty};

const SPL_TOKEN_ACCOUNT_LEN: usize = SplAccount::LEN;
const SPL_TOKEN_MINT_LEN: usize = SplMint::LEN;

/// Base fields unpacked once per Token-2022 token account (`account_index`) per `ifx_let`.
#[derive(Clone, Copy, Default)]
struct Token2022AccountCache {
    base: Option<(u64, u64, u8)>,
    transfer_fee_withheld: Option<u64>,
}

/// Base + extension fields unpacked once per Token-2022 mint per `ifx_let`.
#[derive(Clone, Copy, Default)]
struct Token2022MintCache {
    base: Option<(u64, u8)>,
    transfer_fee_config: Option<(u16, u64, u64)>,
    default_account_state: Option<u8>,
}

/// Per-`ifx_let` batch: short borrows + owned field cache (no full account-data heap copy).
struct LetBatchCache {
    token2022_accounts: Vec<Option<Token2022AccountCache>>,
    token2022_mints: Vec<Option<Token2022MintCache>>,
}

impl LetBatchCache {
    fn new() -> Self {
        Self {
            token2022_accounts: Vec::new(),
            token2022_mints: Vec::new(),
        }
    }

    fn account_slot(&mut self, account_index: u8) -> &mut Token2022AccountCache {
        let i = account_index as usize;
        if i >= self.token2022_accounts.len() {
            self.token2022_accounts
                .resize_with(i + 1, || None);
        }
        self.token2022_accounts[i]
            .get_or_insert_with(Token2022AccountCache::default)
    }

    fn mint_slot(&mut self, account_index: u8) -> &mut Token2022MintCache {
        let i = account_index as usize;
        if i >= self.token2022_mints.len() {
            self.token2022_mints.resize_with(i + 1, || None);
        }
        self.token2022_mints[i]
            .get_or_insert_with(Token2022MintCache::default)
    }
}

fn ensure_token2022_account_base<'info>(
    remaining: &'info [AccountInfo<'info>],
    cache: &mut LetBatchCache,
    account_index: u8,
) -> Result<(u64, u64, u8)> {
    let slot = cache.account_slot(account_index);
    if let Some(base) = slot.base {
        return Ok(base);
    }
    let acc = get_remaining(remaining, account_index)?;
    require_owner_bytes(acc, &spl_token_2022::ID.to_bytes())?;
    let data = acc.try_borrow_data()?;
    require!(
        data.len() >= Spl2022Account::LEN,
        ErrorCode::AccountDataLenMismatch
    );
    let parsed = StateWithExtensions::<Spl2022Account>::unpack(&data)
        .map_err(|_| ErrorCode::SplToken2022UnpackFailed)?;
    let base = (
        parsed.base.amount,
        parsed.base.delegated_amount,
        parsed.base.state as u8,
    );
    slot.base = Some(base);
    Ok(base)
}

fn ensure_token2022_transfer_fee_withheld<'info>(
    remaining: &'info [AccountInfo<'info>],
    cache: &mut LetBatchCache,
    account_index: u8,
) -> Result<u64> {
    let slot = cache.account_slot(account_index);
    if let Some(v) = slot.transfer_fee_withheld {
        return Ok(v);
    }
    let acc = get_remaining(remaining, account_index)?;
    require_owner_bytes(acc, &spl_token_2022::ID.to_bytes())?;
    let data = acc.try_borrow_data()?;
    require!(
        data.len() >= Spl2022Account::LEN,
        ErrorCode::AccountDataLenMismatch
    );
    let parsed = StateWithExtensions::<Spl2022Account>::unpack(&data)
        .map_err(|_| ErrorCode::SplToken2022UnpackFailed)?;
    let ext = parsed
        .get_extension::<TransferFeeAmount>()
        .map_err(|_| ErrorCode::Token2022ExtensionNotPresent)?;
    let v = ext.withheld_amount.into();
    slot.transfer_fee_withheld = Some(v);
    Ok(v)
}

fn ensure_token2022_mint_base<'info>(
    remaining: &'info [AccountInfo<'info>],
    cache: &mut LetBatchCache,
    account_index: u8,
) -> Result<(u64, u8)> {
    let slot = cache.mint_slot(account_index);
    if let Some(base) = slot.base {
        return Ok(base);
    }
    let acc = get_remaining(remaining, account_index)?;
    require_owner_bytes(acc, &spl_token_2022::ID.to_bytes())?;
    let data = acc.try_borrow_data()?;
    require!(data.len() >= Spl2022Mint::LEN, ErrorCode::AccountDataLenMismatch);
    let parsed = StateWithExtensions::<Spl2022Mint>::unpack(&data)
        .map_err(|_| ErrorCode::SplToken2022UnpackFailed)?;
    let base = (parsed.base.supply, parsed.base.decimals);
    slot.base = Some(base);
    Ok(base)
}

fn ensure_token2022_transfer_fee_config<'info>(
    remaining: &'info [AccountInfo<'info>],
    cache: &mut LetBatchCache,
    account_index: u8,
) -> Result<(u16, u64, u64)> {
    let slot = cache.mint_slot(account_index);
    if let Some(cfg) = slot.transfer_fee_config {
        return Ok(cfg);
    }
    let acc = get_remaining(remaining, account_index)?;
    require_owner_bytes(acc, &spl_token_2022::ID.to_bytes())?;
    let data = acc.try_borrow_data()?;
    require!(data.len() >= Spl2022Mint::LEN, ErrorCode::AccountDataLenMismatch);
    let parsed = StateWithExtensions::<Spl2022Mint>::unpack(&data)
        .map_err(|_| ErrorCode::SplToken2022UnpackFailed)?;
    let ext = parsed
        .get_extension::<TransferFeeConfig>()
        .map_err(|_| ErrorCode::Token2022ExtensionNotPresent)?;
    let cfg = (
        ext.newer_transfer_fee.transfer_fee_basis_points.into(),
        ext.newer_transfer_fee.maximum_fee.into(),
        ext.withheld_amount.into(),
    );
    slot.transfer_fee_config = Some(cfg);
    Ok(cfg)
}

fn ensure_token2022_default_account_state<'info>(
    remaining: &'info [AccountInfo<'info>],
    cache: &mut LetBatchCache,
    account_index: u8,
) -> Result<u8> {
    let slot = cache.mint_slot(account_index);
    if let Some(v) = slot.default_account_state {
        return Ok(v);
    }
    let acc = get_remaining(remaining, account_index)?;
    require_owner_bytes(acc, &spl_token_2022::ID.to_bytes())?;
    let data = acc.try_borrow_data()?;
    require!(data.len() >= Spl2022Mint::LEN, ErrorCode::AccountDataLenMismatch);
    let parsed = StateWithExtensions::<Spl2022Mint>::unpack(&data)
        .map_err(|_| ErrorCode::SplToken2022UnpackFailed)?;
    let ext = parsed
        .get_extension::<DefaultAccountState>()
        .map_err(|_| ErrorCode::Token2022ExtensionNotPresent)?;
    let v: u8 = ext.state;
    slot.default_account_state = Some(v);
    Ok(v)
}

pub fn execute_let<'info>(
    frame: &'info AccountInfo<'info>,
    remaining: &'info [AccountInfo<'info>],
    args: LetArgs,
) -> Result<()> {
    require!(get_stack_height() == 1, ErrorCode::LetNotTopLevel);

    let mut cache = LetBatchCache::new();
    let fa = FrameAccount::try_from(frame)?;
    let frame_key = *frame.key;
    let frame_data_len = fa.layout().total_data_len();
    for binding in args.bindings.iter() {
        let (ty, bytes) = fa.with_read(|tape| {
            eval_binding(
                &tape,
                remaining,
                &mut cache,
                binding,
                frame_key,
                frame_data_len,
            )
        })?;
        let idx = fa.with_write(|tape| tape.append_value(ty, bytes.as_slice()))?;
        pseudocode::log_let_binding(idx, binding, ty, bytes.as_slice());
    }

    Ok(())
}

fn eval_binding<'info>(
    frame: &impl FrameReader,
    remaining: &'info [AccountInfo<'info>],
    cache: &mut LetBatchCache,
    binding: &LetBinding,
    frame_key: Pubkey,
    frame_data_len: u32,
) -> Result<(ValueType, ValueBytes)> {
    let bytes = match binding {
        LetBinding::AccountDataSlice {
            ty,
            account_index,
            offset,
            expected_program_owner,
        } => load_account_data_slice(
            remaining,
            *account_index,
            *offset,
            *ty,
            *expected_program_owner,
        )?,
        LetBinding::AccountLamports { account_index } => {
            load_account_lamports(remaining, *account_index)?
        }
        LetBinding::AccountDataLen { account_index } => {
            load_account_data_len(remaining, *account_index, frame_key, frame_data_len)?
        }
        LetBinding::AccountKey { account_index } => {
            load_account_key(remaining, *account_index)?
        }
        LetBinding::ConstPubkey { bytes } => {
            encode_typed(ValueType::Pubkey, TypedValue::Pubkey(*bytes))?
        }
        LetBinding::FrameGeneration => {
            encode_typed(ValueType::U64, TypedValue::U64(frame.generation()?))?
        }
        LetBinding::FrameIndexCount => {
            encode_typed(ValueType::U16, TypedValue::U16(frame.index_count()?))?
        }
        LetBinding::Eval { expr } => {
            let ty = infer_expr_ty(frame, expr)?;
            return Ok((ty, eval_expr(frame, ty, expr)?));
        }
        LetBinding::SysvarClockSlot => {
            encode_typed(ValueType::U64, TypedValue::U64(Clock::get()?.slot))?
        }
        LetBinding::SysvarClockEpochStartTimestamp => {
            encode_typed(
                ValueType::I64,
                TypedValue::I64(Clock::get()?.epoch_start_timestamp),
            )?
        }
        LetBinding::SysvarClockEpoch => {
            encode_typed(ValueType::U64, TypedValue::U64(Clock::get()?.epoch))?
        }
        LetBinding::SysvarClockLeaderScheduleEpoch => {
            encode_typed(
                ValueType::U64,
                TypedValue::U64(Clock::get()?.leader_schedule_epoch),
            )?
        }
        LetBinding::SysvarClockUnixTimestamp => {
            encode_typed(
                ValueType::I64,
                TypedValue::I64(Clock::get()?.unix_timestamp),
            )?
        }
        LetBinding::SysvarRentMinimumBalance { data_len } => {
            let rent = Rent::get()?;
            let min = rent.minimum_balance(*data_len as usize);
            encode_typed(ValueType::U64, TypedValue::U64(min))?
        }
        LetBinding::SplTokenAccountAmount { account_index } => {
            let acc = load_spl_token_account(remaining, *account_index)?;
            encode_typed(ValueType::U64, TypedValue::U64(acc.amount))?
        }
        LetBinding::SplTokenAccountDelegatedAmount { account_index } => {
            let acc = load_spl_token_account(remaining, *account_index)?;
            encode_typed(ValueType::U64, TypedValue::U64(acc.delegated_amount))?
        }
        LetBinding::SplTokenAccountState { account_index } => {
            let acc = load_spl_token_account(remaining, *account_index)?;
            encode_typed(ValueType::U8, TypedValue::U8(acc.state as u8))?
        }
        LetBinding::SplMintSupply { account_index } => {
            let mint = load_spl_token_mint(remaining, *account_index)?;
            encode_typed(ValueType::U64, TypedValue::U64(mint.supply))?
        }
        LetBinding::SplMintDecimals { account_index } => {
            let mint = load_spl_token_mint(remaining, *account_index)?;
            encode_typed(ValueType::U8, TypedValue::U8(mint.decimals))?
        }
        LetBinding::SplToken2022AccountAmount { account_index } => {
            let (amount, _, _) =
                ensure_token2022_account_base(remaining, cache, *account_index)?;
            encode_typed(ValueType::U64, TypedValue::U64(amount))?
        }
        LetBinding::SplToken2022AccountDelegatedAmount { account_index } => {
            let (_, delegated, _) =
                ensure_token2022_account_base(remaining, cache, *account_index)?;
            encode_typed(ValueType::U64, TypedValue::U64(delegated))?
        }
        LetBinding::SplToken2022AccountState { account_index } => {
            let (_, _, state) = ensure_token2022_account_base(remaining, cache, *account_index)?;
            encode_typed(ValueType::U8, TypedValue::U8(state))?
        }
        LetBinding::SplToken2022MintSupply { account_index } => {
            let (supply, _) = ensure_token2022_mint_base(remaining, cache, *account_index)?;
            encode_typed(ValueType::U64, TypedValue::U64(supply))?
        }
        LetBinding::SplToken2022MintDecimals { account_index } => {
            let (_, decimals) = ensure_token2022_mint_base(remaining, cache, *account_index)?;
            encode_typed(ValueType::U8, TypedValue::U8(decimals))?
        }
        LetBinding::SplToken2022AccountTransferFeeWithheld { account_index } => {
            let withheld =
                ensure_token2022_transfer_fee_withheld(remaining, cache, *account_index)?;
            encode_typed(ValueType::U64, TypedValue::U64(withheld))?
        }
        LetBinding::SplToken2022MintTransferFeeBasisPoints { account_index } => {
            let (bps, _, _) =
                ensure_token2022_transfer_fee_config(remaining, cache, *account_index)?;
            encode_typed(ValueType::U16, TypedValue::U16(bps))?
        }
        LetBinding::SplToken2022MintTransferFeeMaximum { account_index } => {
            let (_, max, _) =
                ensure_token2022_transfer_fee_config(remaining, cache, *account_index)?;
            encode_typed(ValueType::U64, TypedValue::U64(max))?
        }
        LetBinding::SplToken2022MintWithheldAmount { account_index } => {
            let (_, _, withheld) =
                ensure_token2022_transfer_fee_config(remaining, cache, *account_index)?;
            encode_typed(ValueType::U64, TypedValue::U64(withheld))?
        }
        LetBinding::SplToken2022MintDefaultAccountState { account_index } => {
            let state =
                ensure_token2022_default_account_state(remaining, cache, *account_index)?;
            encode_typed(ValueType::U8, TypedValue::U8(state))?
        }
    };
    Ok((binding.value_type(), bytes))
}

fn require_owner_bytes(acc: &AccountInfo<'_>, expected: &[u8; 32]) -> Result<()> {
    require!(
        acc.owner.to_bytes() == *expected,
        ErrorCode::AccountOwnerMismatch
    );
    Ok(())
}

fn load_account_data_slice<'info>(
    remaining: &'info [AccountInfo<'info>],
    account_index: u8,
    offset: u32,
    ty: ValueType,
    expected_program_owner: u8,
) -> Result<ValueBytes> {
    let acc = get_remaining(remaining, account_index)?;
    let owner_ref = get_remaining(remaining, expected_program_owner)?;
    require!(*acc.owner == *owner_ref.key, ErrorCode::AccountOwnerMismatch);
    let data = acc.try_borrow_data()?;
    let off = offset as usize;
    let end = off
        .checked_add(ty.size())
        .ok_or(ErrorCode::AccountDataTooShort)?;
    require!(data.len() >= end, ErrorCode::AccountDataTooShort);
    ValueBytes::copy_from(ty, &data[off..end])
}

fn load_account_lamports<'info>(
    remaining: &'info [AccountInfo<'info>],
    account_index: u8,
) -> Result<ValueBytes> {
    let acc = get_remaining(remaining, account_index)?;
    let lamports = acc.lamports();
    encode_typed(ValueType::U64, TypedValue::U64(lamports))
}

fn load_account_key<'info>(
    remaining: &'info [AccountInfo<'info>],
    account_index: u8,
) -> Result<ValueBytes> {
    let acc = get_remaining(remaining, account_index)?;
    encode_typed(ValueType::Pubkey, TypedValue::Pubkey(acc.key.to_bytes()))
}

fn load_account_data_len<'info>(
    remaining: &'info [AccountInfo<'info>],
    account_index: u8,
    frame_key: Pubkey,
    frame_data_len: u32,
) -> Result<ValueBytes> {
    let acc = get_remaining(remaining, account_index)?;
    let len = if acc.key == &frame_key {
        // Caller may already hold a data borrow on `frame`; use cached layout length.
        frame_data_len
    } else {
        u32::try_from(acc.data_len()).map_err(|_| ErrorCode::IntegerOverflow)?
    };
    encode_typed(ValueType::U32, TypedValue::U32(len))
}

fn load_spl_token_account<'info>(
    remaining: &'info [AccountInfo<'info>],
    account_index: u8,
) -> Result<SplAccount> {
    let acc = get_remaining(remaining, account_index)?;
    require_owner_bytes(acc, &spl_token::ID.to_bytes())?;
    let data = acc.try_borrow_data()?;
    require!(
        data.len() == SPL_TOKEN_ACCOUNT_LEN,
        ErrorCode::AccountDataLenMismatch
    );
    SplAccount::unpack(&data).map_err(|_| ErrorCode::SplTokenUnpackFailed.into())
}

fn load_spl_token_mint<'info>(
    remaining: &'info [AccountInfo<'info>],
    account_index: u8,
) -> Result<SplMint> {
    let acc = get_remaining(remaining, account_index)?;
    require_owner_bytes(acc, &spl_token::ID.to_bytes())?;
    let data = acc.try_borrow_data()?;
    require!(data.len() == SPL_TOKEN_MINT_LEN, ErrorCode::AccountDataLenMismatch);
    SplMint::unpack(&data).map_err(|_| ErrorCode::SplTokenUnpackFailed.into())
}
