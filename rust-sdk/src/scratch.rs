//! Off-chain Frame tape planner (`cursor` + binding indices).

use std::collections::HashMap;

use ifx_core::layout::{plan_record_offsets, record_byte_length};
use ifx_core::U8LenVec;
use ifx_core::wire::{Expr, LetBinding, ValueType};
use solana_sdk::instruction::{AccountMeta, Instruction};
use solana_sdk::pubkey::Pubkey;

use crate::binding::{eval_const_bool, eval_const_u64, infer_binding_ty, remap_account_index};
use crate::constants::{index_cap_for_tape_len, DEFAULT_IFX_PROGRAM_ID};
use crate::error::ScratchError;
use crate::frame_authority::public_frame_authority;
use crate::ix::{
    build_ix_assert, build_ix_create_frame, build_ix_let, build_ix_reset_frame,
    let_args_from_bindings, CreateFrameParams, IxOpts,
};
use crate::let_builder::LetBuilder;
use crate::typed::ScratchValue;
use crate::wire_ix::AssertMultiArgs;

/// Result of [`FrameScratch::plan_new_frame`].
pub struct PlanNewFrameResult {
    pub scratch: FrameScratch,
    pub ix_create: Instruction,
    pub frame: Pubkey,
    pub frame_bump: u8,
}

pub struct PlanNewFrameParams<'a> {
    pub payer: Pubkey,
    pub frame_id: &'a [u8; 32],
    pub authority: Pubkey,
    pub tape_len: u32,
    pub program_id: Option<Pubkey>,
}

/// Off-chain mirror of on-chain Frame session planning.
#[derive(Clone, Debug)]
pub struct FrameScratch {
    pub frame: Pubkey,
    pub program_id: Pubkey,
    pub authority: Pubkey,
    pub tape_len: Option<u32>,
    pub index_cap: Option<u16>,
    pub cursor: u32,
    pub next_index: u8,
    index_types: HashMap<u8, ValueType>,
}

impl FrameScratch {
    pub fn new(
        frame: Pubkey,
        tape_len: Option<u32>,
        program_id: Option<Pubkey>,
        authority: Pubkey,
    ) -> Self {
        let program_id = program_id.unwrap_or(DEFAULT_IFX_PROGRAM_ID);
        let index_cap = tape_len.map(index_cap_for_tape_len);
        Self {
            frame,
            program_id,
            authority,
            tape_len,
            index_cap,
            cursor: 0,
            next_index: 0,
            index_types: HashMap::new(),
        }
    }

    pub fn plan_new_frame(params: PlanNewFrameParams<'_>) -> Result<PlanNewFrameResult, ScratchError> {
        let program_id = params.program_id.unwrap_or(DEFAULT_IFX_PROGRAM_ID);
        let created = build_ix_create_frame(CreateFrameParams {
            payer: params.payer,
            frame_id: params.frame_id,
            authority: params.authority,
            tape_len: params.tape_len,
            opts: IxOpts {
                program_id: Some(program_id),
            },
        })?;
        Ok(PlanNewFrameResult {
            scratch: Self::new(
                created.frame,
                Some(params.tape_len),
                Some(program_id),
                params.authority,
            ),
            ix_create: created.instruction,
            frame: created.frame,
            frame_bump: created.frame_bump,
        })
    }

    pub fn plan_public_frame(params: PlanNewFrameParams<'_>) -> Result<PlanNewFrameResult, ScratchError> {
        let program_id = params.program_id.unwrap_or(DEFAULT_IFX_PROGRAM_ID);
        let authority = public_frame_authority(&params.payer, params.frame_id, &program_id);
        Self::plan_new_frame(PlanNewFrameParams {
            payer: params.payer,
            frame_id: params.frame_id,
            authority,
            tape_len: params.tape_len,
            program_id: Some(program_id),
        })
    }

    pub fn ix_opts(&self) -> IxOpts {
        IxOpts {
            program_id: Some(self.program_id),
        }
    }

    pub fn let_builder(&mut self) -> LetBuilder<'_> {
        LetBuilder::new(self)
    }

    pub fn ix_reset(&mut self) -> Instruction {
        self.cursor = 0;
        self.next_index = 0;
        self.index_types.clear();
        build_ix_reset_frame(self.frame, self.authority, self.ix_opts())
    }

    pub fn ix_let_single(&self, value: &ScratchValue) -> Result<Instruction, ScratchError> {
        let args = let_args_from_bindings(&[value.binding.clone()]);
        build_ix_let(
            self.frame,
            self.authority,
            &args,
            &value.remaining,
            self.ix_opts(),
        )
    }

    pub fn ix_let_batch(
        &self,
        bindings: &[ScratchValue],
        remaining: &[AccountMeta],
    ) -> Result<Instruction, ScratchError> {
        let args = let_args_from_bindings(
            &bindings.iter().map(|v| v.binding.clone()).collect::<Vec<_>>(),
        );
        build_ix_let(
            self.frame,
            self.authority,
            &args,
            remaining,
            self.ix_opts(),
        )
    }

    pub fn ix_assert(&self, cond: &Expr) -> Result<Instruction, ScratchError> {
        build_ix_assert(self.frame, cond, self.ix_opts())
    }

    pub fn let_eval(&mut self, expr: Expr) -> Result<ScratchValue, ScratchError> {
        self.plan(LetBinding::Eval { expr }, &[])
    }

    pub fn let_const_u64(&mut self, n: u64) -> Result<ScratchValue, ScratchError> {
        self.plan(eval_const_u64(n), &[])
    }

    pub fn let_const_bool(&mut self, v: bool) -> Result<ScratchValue, ScratchError> {
        self.plan(eval_const_bool(v), &[])
    }

    pub fn let_lamports(&mut self, account: Pubkey) -> Result<ScratchValue, ScratchError> {
        self.plan(
            LetBinding::AccountLamports { account_index: 0 },
            &[readonly_meta(account)],
        )
    }

    pub fn plan_at_remaining_index(
        &mut self,
        binding: LetBinding,
        remaining_account_index: u8,
    ) -> Result<ScratchValue, ScratchError> {
        self.plan(
            remap_account_index(binding, remaining_account_index),
            &[],
        )
    }

    pub fn ix_assert_multi(&self, conds: &[Expr]) -> Result<Instruction, ScratchError> {
        crate::ix::build_ix_assert_multi(
            self.frame,
            &AssertMultiArgs {
                conds: U8LenVec(conds.to_vec()),
            },
            self.ix_opts(),
        )
    }

    pub fn ix_close(&self, authority: Pubkey) -> Instruction {
        crate::ix::build_ix_close_frame(self.frame, authority, self.ix_opts())
    }

    pub fn ix_cpi(&self, built: &crate::cpi::CpiWireBuildResult) -> Result<Instruction, ScratchError> {
        crate::ix::build_ix_cpi(self.frame, &built.cpi, &built.remaining, self.ix_opts())
    }

    pub fn ix_if_else(
        &self,
        args: &crate::wire_ix::IfElseArgs,
        remaining: &[AccountMeta],
    ) -> Result<Instruction, ScratchError> {
        crate::ix::build_ix_if_else(self.frame, args, remaining, self.ix_opts())
    }

    pub(crate) fn plan(
        &mut self,
        binding: LetBinding,
        let_remaining: &[AccountMeta],
    ) -> Result<ScratchValue, ScratchError> {
        let ty = infer_binding_ty(&binding, &self.index_types)?;
        let binding_index = self.next_index;
        if let Some(cap) = self.index_cap {
            if binding_index as u16 >= cap {
                return Err(ScratchError::IndexCapReached {
                    index: binding_index,
                    cap,
                });
            }
        }
        let (_, end_cursor) = plan_record_offsets(self.cursor, ty).map_err(|_| {
            ScratchError::TapeExceeded {
                end_cursor: self.cursor,
                tape_len: self.tape_len.unwrap_or(u32::MAX),
                record_len: record_byte_length(ty),
            }
        })?;
        if let Some(tape_len) = self.tape_len {
            if end_cursor > tape_len {
                return Err(ScratchError::TapeExceeded {
                    end_cursor,
                    tape_len,
                    record_len: record_byte_length(ty),
                });
            }
        }
        self.cursor = end_cursor;
        self.next_index = self.next_index.saturating_add(1);
        self.index_types.insert(binding_index, ty);
        Ok(ScratchValue {
            binding,
            index: binding_index,
            ty,
            remaining: let_remaining.to_vec(),
        })
    }
}

fn readonly_meta(pubkey: Pubkey) -> AccountMeta {
    AccountMeta {
        pubkey,
        is_signer: false,
        is_writable: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::{IFX_LOCALNET_PROGRAM_ID, IX_DISC_CREATE_FRAME, IX_DISC_LET};
    use ifx_core::wire::LetBinding;
    use solana_sdk::signature::{Keypair, Signer};

    fn on_curve_authority() -> Pubkey {
        Keypair::new().pubkey()
    }

    #[test]
    fn plan_public_frame_sets_frame_authority() {
        let payer = Pubkey::new_unique();
        let mut frame_id = [0u8; 32];
        frame_id[0] = 11;
        let plan = FrameScratch::plan_public_frame(PlanNewFrameParams {
            payer,
            frame_id: &frame_id,
            authority: Pubkey::default(),
            tape_len: 512,
            program_id: Some(IFX_LOCALNET_PROGRAM_ID),
        })
        .unwrap();
        assert_eq!(plan.scratch.authority, plan.frame);
        assert_eq!(plan.ix_create.data[0], IX_DISC_CREATE_FRAME);
        let auth = Pubkey::try_from(&plan.ix_create.data[1 + 32..1 + 64]).unwrap();
        assert_eq!(auth, plan.frame);
    }

    #[test]
    fn let_lamports_remaining_index() {
        let frame = Pubkey::new_unique();
        let user = Pubkey::new_unique();
        let mut s = FrameScratch::new(
            frame,
            Some(512),
            Some(IFX_LOCALNET_PROGRAM_ID),
            on_curve_authority(),
        );
        let sv = s.let_lamports(user).unwrap();
        assert_eq!(sv.remaining.len(), 1);
        assert_eq!(sv.remaining[0].pubkey, user);
        assert_eq!(sv.index, 0);
        let ix = s.ix_let_single(&sv).unwrap();
        assert_eq!(ix.accounts[2].pubkey, user);
    }

    #[test]
    fn let_const_u64_empty_remaining() {
        let frame = Pubkey::new_unique();
        let mut s = FrameScratch::new(
            frame,
            Some(512),
            Some(IFX_LOCALNET_PROGRAM_ID),
            on_curve_authority(),
        );
        let sv = s.let_const_u64(42).unwrap();
        assert!(sv.remaining.is_empty());
    }

    #[test]
    fn let_builder_dedupes_accounts() {
        let frame = Pubkey::new_unique();
        let user = Pubkey::new_unique();
        let mut s = FrameScratch::new(
            frame,
            Some(512),
            Some(IFX_LOCALNET_PROGRAM_ID),
            on_curve_authority(),
        );
        let mut b = s.let_builder();
        b.lamports(user).unwrap();
        b.data_len(user).unwrap();
        let fin = b.finish();
        assert_eq!(fin.remaining.len(), 1);
        let ix = b.build_ix().unwrap();
        assert_eq!(ix.accounts.len(), 3);
    }

    #[test]
    fn minimal_business_wire() {
        let frame = Pubkey::new_unique();
        let mut s = FrameScratch::new(
            frame,
            Some(512),
            Some(IFX_LOCALNET_PROGRAM_ID),
            on_curve_authority(),
        );
        s.ix_reset();
        let one = s.let_const_u64(1).unwrap();
        let ix = s.ix_let_single(&one).unwrap();
        assert_eq!(ix.data[0], IX_DISC_LET);
        assert_eq!(&ix.data[1..], &[1, 2, 5, 1, 0, 0, 0, 0, 0, 0, 0]);
        assert!(matches!(one.binding, LetBinding::Eval { .. }));
    }

    #[test]
    fn spl_token_amount_golden_matches_core() {
        let frame = Pubkey::new_unique();
        let token_acc = Pubkey::new_unique();
        let mut s = FrameScratch::new(
            frame,
            Some(512),
            Some(IFX_LOCALNET_PROGRAM_ID),
            on_curve_authority(),
        );
        let sv = s
            .plan(
                LetBinding::SplTokenAccountAmount { account_index: 0 },
                &[readonly_meta(token_acc)],
            )
            .unwrap();
        let ix = s.ix_let_single(&sv).unwrap();
        assert_eq!(&ix.data[1..], &[1, 9, 0]);
    }
}
