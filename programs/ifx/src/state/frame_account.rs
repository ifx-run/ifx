use std::collections::BTreeSet;
use std::fmt;

use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::AccountMeta;
use anchor_lang::solana_program::system_program;

use crate::error::ErrorCode;
use crate::state::Frame;

use super::frame_access::{FrameMut, FrameRef};
use super::frame_layout::{read_authority, FrameLayout};

/// Zero-copy Frame account wrapper (same pattern as exact `MaybeUninitializedTokenAccount`).
///
/// Implements Anchor account traits; instruction handlers call [`FrameAccount::try_from`]
/// on the `UncheckedAccount` from `#[derive(Accounts)]` (exact parses `remaining_accounts`
/// the same way). Writes go directly into account data; [`AccountsExit`] is a no-op.
#[derive(Clone)]
pub struct FrameAccount<'info> {
    info: &'info AccountInfo<'info>,
    layout: FrameLayout,
    /// Cached `Frame.authority` from account data.
    pub authority: Pubkey,
}

impl fmt::Debug for FrameAccount<'_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("FrameAccount")
            .field("authority", &self.authority)
            .field("layout", &self.layout)
            .field("info", &self.info)
            .finish()
    }
}

impl<'info> FrameAccount<'info> {
    #[inline(never)]
    pub fn try_from(info: &'info AccountInfo<'info>) -> Result<Self> {
        if info.owner == &system_program::ID && info.lamports() == 0 {
            return Err(anchor_lang::error::ErrorCode::AccountNotInitialized.into());
        }
        if info.owner != &Frame::owner() {
            return Err(
                anchor_lang::error::Error::from(
                    anchor_lang::error::ErrorCode::AccountOwnedByWrongProgram,
                )
                .with_pubkeys((*info.owner, Frame::owner())),
            );
        }
        let data = info.try_borrow_data()?;
        let layout = FrameLayout::parse(&data).map_err(Error::from)?;
        let authority = read_authority(&data).map_err(Error::from)?;
        Ok(Self {
            info,
            layout,
            authority,
        })
    }

    pub fn with_read<R>(&self, f: impl FnOnce(FrameRef<'_>) -> Result<R>) -> Result<R> {
        let data = self.info.try_borrow_data()?;
        let frame = FrameRef::new(&data, self.layout).map_err(Error::from)?;
        f(frame)
    }

    pub fn with_write<R>(&self, f: impl FnOnce(&mut FrameMut<'_>) -> Result<R>) -> Result<R> {
        let mut data = self.info.try_borrow_mut_data()?;
        let mut frame = FrameMut::new(&mut data, self.layout).map_err(Error::from)?;
        f(&mut frame)
    }

    pub fn layout(&self) -> FrameLayout {
        self.layout
    }

    pub fn close_to(&self, sol_destination: AccountInfo<'info>) -> Result<()> {
        let dest_starting_lamports = sol_destination.lamports();
        **sol_destination.lamports.borrow_mut() = dest_starting_lamports
            .checked_add(self.info.lamports())
            .ok_or(ErrorCode::IntegerOverflow)?;
        **self.info.lamports.borrow_mut() = 0;
        self.info.assign(&system_program::ID);
        self.info.resize(0).map_err(Error::from)
    }
}

impl<'info, B> Accounts<'info, B> for FrameAccount<'info> {
    #[inline(never)]
    fn try_accounts(
        _program_id: &Pubkey,
        accounts: &mut &'info [AccountInfo<'info>],
        _ix_data: &[u8],
        _bumps: &mut B,
        _reallocs: &mut BTreeSet<Pubkey>,
    ) -> Result<Self> {
        if accounts.is_empty() {
            return Err(anchor_lang::error::ErrorCode::AccountNotEnoughKeys.into());
        }
        let account = &accounts[0];
        *accounts = &accounts[1..];
        Self::try_from(account)
    }
}

impl<'info> AccountsExit<'info> for FrameAccount<'info> {
    fn exit(&self, _program_id: &Pubkey) -> Result<()> {
        // In-place writes during handler; no Borsh write-back.
        Ok(())
    }
}

impl<'info> AccountsClose<'info> for FrameAccount<'info> {
    fn close(&self, sol_destination: AccountInfo<'info>) -> Result<()> {
        self.close_to(sol_destination)
    }
}

impl DuplicateMutableAccountKeys for FrameAccount<'_> {
    fn duplicate_mutable_account_keys(&self) -> Vec<Pubkey> {
        // No exit serialization; omit from duplicate-mutable-exit checks.
        vec![]
    }
}

impl ToAccountMetas for FrameAccount<'_> {
    fn to_account_metas(&self, is_signer: Option<bool>) -> Vec<AccountMeta> {
        let is_signer = is_signer.unwrap_or(self.info.is_signer);
        let meta = match self.info.is_writable {
            false => AccountMeta::new_readonly(*self.info.key, is_signer),
            true => AccountMeta::new(*self.info.key, is_signer),
        };
        vec![meta]
    }
}

impl<'info> ToAccountInfos<'info> for FrameAccount<'info> {
    fn to_account_infos(&self) -> Vec<AccountInfo<'info>> {
        vec![self.info.clone()]
    }
}

impl<'info> AsRef<AccountInfo<'info>> for FrameAccount<'info> {
    fn as_ref(&self) -> &AccountInfo<'info> {
        self.info
    }
}

impl Key for FrameAccount<'_> {
    fn key(&self) -> Pubkey {
        *self.info.key
    }
}
