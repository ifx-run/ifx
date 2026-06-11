//! Multi-binding `ifx_let` batch with deduped remaining accounts.

use std::collections::HashMap;

use ifx_core::wire::{Expr, LetBinding, ValueType};
use solana_sdk::instruction::{AccountMeta, Instruction};
use solana_sdk::pubkey::Pubkey;

use crate::error::ScratchError;
use crate::ix::let_args_from_bindings;
use crate::scratch::FrameScratch;
use crate::typed::ScratchValue;

pub struct LetBuilderFinish<'a> {
    pub args: ifx_core::wire::LetArgs,
    pub bindings: Vec<ScratchValue>,
    pub remaining: Vec<AccountMeta>,
    pub scratch: &'a FrameScratch,
}

pub struct LetBuilder<'a> {
    scratch: &'a mut FrameScratch,
    accounts: Vec<AccountMeta>,
    index_by_key: HashMap<Pubkey, usize>,
    bindings: Vec<ScratchValue>,
}

impl<'a> LetBuilder<'a> {
    pub(crate) fn new(scratch: &'a mut FrameScratch) -> Self {
        Self {
            scratch,
            accounts: Vec::new(),
            index_by_key: HashMap::new(),
            bindings: Vec::new(),
        }
    }

    fn account_index(&mut self, account: Pubkey) -> u8 {
        if let Some(&idx) = self.index_by_key.get(&account) {
            return idx as u8;
        }
        let idx = self.accounts.len();
        self.index_by_key.insert(account, idx);
        self.accounts.push(AccountMeta {
            pubkey: account,
            is_signer: false,
            is_writable: false,
        });
        idx as u8
    }

    fn push(&mut self, sv: ScratchValue) -> ScratchValue {
        self.bindings.push(sv.clone());
        sv
    }

    fn plan_at(&mut self, binding: LetBinding, account: Pubkey) -> Result<ScratchValue, ScratchError> {
        let i = self.account_index(account);
        let sv = self
            .scratch
            .plan_at_remaining_index(binding, i)?;
        Ok(self.push(sv))
    }

    pub fn let_eval(&mut self, expr: Expr) -> Result<ScratchValue, ScratchError> {
        let sv = self.scratch.let_eval(expr)?;
        Ok(self.push(sv))
    }

    pub fn let_const_u64(&mut self, n: u64) -> Result<ScratchValue, ScratchError> {
        let sv = self.scratch.let_const_u64(n)?;
        Ok(self.push(sv))
    }

    pub fn let_const_bool(&mut self, v: bool) -> Result<ScratchValue, ScratchError> {
        let sv = self.scratch.let_const_bool(v)?;
        Ok(self.push(sv))
    }

    pub fn lamports(&mut self, account: Pubkey) -> Result<ScratchValue, ScratchError> {
        self.plan_at(LetBinding::AccountLamports { account_index: 0 }, account)
    }

    pub fn data_len(&mut self, account: Pubkey) -> Result<ScratchValue, ScratchError> {
        self.plan_at(LetBinding::AccountDataLen { account_index: 0 }, account)
    }

    pub fn let_account_key(&mut self, account: Pubkey) -> Result<ScratchValue, ScratchError> {
        self.plan_at(LetBinding::AccountKey { account_index: 0 }, account)
    }

    pub fn spl_token_amount(&mut self, account: Pubkey) -> Result<ScratchValue, ScratchError> {
        self.plan_at(LetBinding::SplTokenAccountAmount { account_index: 0 }, account)
    }

    pub fn spl_mint_decimals(&mut self, account: Pubkey) -> Result<ScratchValue, ScratchError> {
        self.plan_at(LetBinding::SplMintDecimals { account_index: 0 }, account)
    }

    pub fn clock_slot(&mut self) -> Result<ScratchValue, ScratchError> {
        let sv = self.scratch.clock_slot()?;
        Ok(self.push(sv))
    }

    pub fn rent_minimum_balance(&mut self, data_len: u32) -> Result<ScratchValue, ScratchError> {
        let sv = self.scratch.rent_minimum_balance(data_len)?;
        Ok(self.push(sv))
    }

    pub fn let_account_data_slice(
        &mut self,
        account: Pubkey,
        expected_owner: Pubkey,
        ty: ValueType,
        offset: u32,
    ) -> Result<ScratchValue, ScratchError> {
        let data_idx = self.account_index(account);
        let owner_idx = self.account_index(expected_owner);
        let sv = self.scratch.plan(
            LetBinding::AccountDataSlice {
                ty,
                account_index: data_idx,
                offset,
                expected_program_owner: owner_idx,
            },
            &[],
        )?;
        Ok(self.push(sv))
    }

    pub fn finish(&self) -> LetBuilderFinish<'_> {
        LetBuilderFinish {
            args: let_args_from_bindings(
                &self.bindings.iter().map(|v| v.binding.clone()).collect::<Vec<_>>(),
            ),
            bindings: self.bindings.clone(),
            remaining: self.accounts.clone(),
            scratch: self.scratch,
        }
    }

    pub fn build_ix(&mut self) -> Result<Instruction, ScratchError> {
        let fin = self.finish();
        self.scratch.ix_let_batch(&fin.bindings, &fin.remaining)
    }
}
