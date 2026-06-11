use anchor_lang::prelude::*;

use crate::{
    constants::{
        index_cap_for_tape_len, ACCOUNT_DISC_FRAME, MAX_FRAME_TAPE_LEN, MIN_TAPE_LEN,
    },
    error::ErrorCode,
};

#[cfg(feature = "idl-build")]
mod u8_len_vec_idl;
#[cfg(feature = "idl-build")]
mod u16_len_vec_idl;

pub mod patch_list;
pub mod structured_cpi_payload;
pub mod structured_cpi_patch;
pub mod cpi;
pub mod if_else_arm;
pub mod frame_access;
pub mod frame_account;
pub mod frame_authority;
pub mod frame_error;
pub mod frame_layout;
pub mod layout_map;
pub mod let_binding_exec;
pub mod let_exec;
pub mod stake_load;
pub mod upgradeable_load;
pub mod tape;
pub mod types;
pub mod u8_len_vec;
pub mod u16_len_vec;
pub mod value_codec;
pub mod value_ops;
pub mod value_type_tag;

pub use frame_access::{FrameMut, FrameReader, FrameRef, FrameWriter};
pub use frame_account::FrameAccount;
pub use frame_authority::{
    frame_authority_requires_signer, let_remaining_after_write_gate, require_frame_ix_top_level,
    verify_frame_write_authority, verify_reset_write_authority,
};
pub use let_exec::{eval_bool, eval_expr, execute_let, infer_expr_ty};
pub use tape::plan_record_offsets;
pub use patch_list::PatchList;
pub use cpi::{Cpi, CPI_WIRE_RAW_PATCHED, CPI_WIRE_STATIC, CPI_WIRE_STRUCTURED};
pub use structured_cpi_patch::StructuredCpiPatch;
pub use structured_cpi_payload::{
    AmountDecimalsFeePatch, AmountDecimalsPatch, FreezeAuthPatch, InitializeMintPatch,
    PubkeyValue,
    LamportsSpacePatch, SetTransferFeePatch,
};
pub use u8_len_vec::U8LenVec;
pub use u16_len_vec::U16LenVec;
pub use types::*;

/// Transaction-scoped SSA frame; `tape` is an append-only byte buffer per session.
#[account(discriminator = [ACCOUNT_DISC_FRAME])]
pub struct Frame {
    pub authority: Pubkey,
    /// Next append byte position in `tape` after `ifx_reset_frame` (or `ifx_create_frame`).
    pub cursor: u32,
    /// Bindings appended since last reset.
    pub index_count: u16,
    /// Fixed at create: `payload_at.len()` (= `index_cap_for_tape_len(tape_len)`).
    pub index_cap: u16,
    /// Incremented on each `ifx_reset_frame` (`wrapping_add`); `0` at create.
    pub generation: u64,
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
        // disc + authority + cursor + index_count + index_cap + generation
        // + payload_at vec (4 + cap*2) + tape vec (4 + tape_len)
        Ok(1 + 32 + 4 + 2 + 2 + 8 + 4 + index_cap * 2 + 4 + tape_bytes)
    }

    pub fn init(&mut self, authority: Pubkey, tape_len: u32) -> Result<()> {
        require!(
            (MIN_TAPE_LEN..=MAX_FRAME_TAPE_LEN).contains(&tape_len),
            ErrorCode::InvalidTapeLen
        );
        let index_cap = index_cap_for_tape_len(tape_len);
        self.authority = authority;
        self.cursor = 0;
        self.index_count = 0;
        self.index_cap = index_cap;
        self.generation = 0;
        self.payload_at = vec![0u16; index_cap as usize];
        self.tape = vec![0u8; tape_len as usize];
        Ok(())
    }

    pub fn tape_len_bytes(&self) -> usize {
        self.tape.len()
    }
}
