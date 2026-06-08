use anchor_lang::prelude::*;

use crate::{
    constants::{
        index_cap_for_tape_len, ACCOUNT_DISC_FRAME, MAX_FRAME_TAPE_LEN, MIN_TAPE_LEN,
    },
    error::ErrorCode,
};

#[cfg(feature = "idl-build")]
mod expr_idl;
#[cfg(feature = "idl-build")]
mod u8_len_vec_idl;
#[cfg(feature = "idl-build")]
mod u16_len_vec_idl;

pub mod patch_list;
pub mod if_else_arm;
pub mod frame_access;
pub mod frame_account;
pub mod frame_error;
pub mod frame_layout;
pub mod let_binding_exec;
pub mod let_exec;
pub mod tape;
pub mod types;
pub mod u8_len_vec;
pub mod u16_len_vec;
pub mod value_codec;
pub mod value_ops;
pub mod value_type_tag;

pub use frame_access::{FrameMut, FrameReader, FrameRef, FrameWriter};
pub use frame_account::FrameAccount;
pub use let_exec::{eval_bool, eval_expr, execute_let, infer_expr_ty};
pub use tape::plan_record_offsets;
pub use patch_list::PatchList;
pub use u8_len_vec::U8LenVec;
pub use u16_len_vec::U16LenVec;
pub use types::*;

/// Transaction-scoped SSA frame; `tape` is an append-only byte buffer per session.
#[account(discriminator = [ACCOUNT_DISC_FRAME])]
pub struct Frame {
    pub close_authority: Pubkey,
    /// Next append byte position in `tape` after `ifx_reset_frame` (or `ifx_create_frame`).
    pub cursor: u32,
    /// Bindings appended since last reset.
    pub index_count: u16,
    /// Fixed at create: `payload_at.len()` (= `index_cap_for_tape_len(tape_len)`).
    pub index_cap: u16,
    /// `payload_at[i]` = byte offset of binding `i` payload in `tape`.
    pub payload_at: Vec<u16>,
    pub tape: Vec<u8>,
}

impl Frame {
    /// Account data size for `init` (discriminator + fields + vec payloads).
    pub fn space_for(tape_len: u32) -> Result<usize> {
        require!(
            (MIN_TAPE_LEN..=MAX_FRAME_TAPE_LEN).contains(&tape_len),
            ErrorCode::InvalidTapeLen
        );
        let index_cap = index_cap_for_tape_len(tape_len) as usize;
        let tape_bytes = tape_len as usize;
        // disc + close_authority + cursor + index_count + index_cap
        // + payload_at vec (4 + cap*2) + tape vec (4 + tape_len)
        Ok(1 + 32 + 4 + 2 + 2 + 4 + index_cap * 2 + 4 + tape_bytes)
    }

    pub fn init(&mut self, close_authority: Pubkey, tape_len: u32) -> Result<()> {
        require!(
            (MIN_TAPE_LEN..=MAX_FRAME_TAPE_LEN).contains(&tape_len),
            ErrorCode::InvalidTapeLen
        );
        let index_cap = index_cap_for_tape_len(tape_len);
        self.close_authority = close_authority;
        self.cursor = 0;
        self.index_count = 0;
        self.index_cap = index_cap;
        self.payload_at = vec![0u16; index_cap as usize];
        self.tape = vec![0u8; tape_len as usize];
        Ok(())
    }

    pub fn tape_len_bytes(&self) -> usize {
        self.tape.len()
    }
}
