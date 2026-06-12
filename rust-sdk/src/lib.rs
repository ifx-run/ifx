//! Off-chain Ifx SDK — build `ifx_create_frame`, `ifx_let`, `ifx_assert`, `ifx_patched_cpi`,
//! `ifx_if_else`, and related instructions as [`solana_sdk::instruction::Instruction`] values.
//!
//! Same layer as `@ifx-run/sdk` and `go-sdk`: wire encoding and planner helpers only —
//! **no** RPC, wallet, or transaction submission wrapper.
//!
//! # Example
//!
//! Typical **business tx** on an existing Frame (create Frame is a separate one-time tx):
//! read a token balance mid-flow, then **close the ATA only when amount is zero** —
//! otherwise **Skip** so the rest of the transaction still succeeds.
//!
//! ```no_run
//! use ifx_sdk::expr;
//! use ifx_sdk::if_else::{args, cpi, skip};
//! use ifx_sdk::patched_cpi::{build_static_cpi, with_owner_signer};
//! use ifx_sdk::scratch::FrameScratch;
//! # use solana_sdk::pubkey::Pubkey;
//!
//! # fn plan(
//! #     scratch: &mut FrameScratch,
//! #     token_account: Pubkey,
//! #     owner: Pubkey,
//! #     rent_destination: Pubkey,
//! #     close_tpl: solana_sdk::instruction::Instruction,
//! # ) -> Result<(), ifx_sdk::ScratchError> {
//! scratch.ix_reset();
//!
//! let mut b = scratch.let_builder();
//! let amount = b.spl_token_amount(token_account)?;
//! b.build_ix()?;
//!
//! let close_ix = with_owner_signer(&close_tpl, owner, true);
//! let close_built = build_static_cpi(&close_ix)?;
//!
//! scratch.ix_if_else(
//!     &args(
//!         expr::is_zero(expr::r(&amount)),
//!         cpi(close_built.cpi.clone()),
//!         skip(),
//!     ),
//!     &close_built.remaining,
//! )?;
//! # Ok(())
//! # }
//! ```
//!
//! Full guide, examples, and integration tests: <https://github.com/ifx-run/ifx/tree/main/rust-sdk>.

#![deny(unsafe_code)]

pub mod binding;
pub mod constants;
pub mod cpi;
pub mod decode;
pub mod error;
pub mod expr;
pub mod frame;
pub mod frame_authority;
pub mod if_else;
pub mod ix;
pub mod let_bindings;
pub mod let_builder;
pub mod patched_cpi;
#[cfg(test)]
mod parity;
pub mod scratch;
pub mod typed;
pub mod wire_ix;

pub use ifx_core as core;

pub use binding::{eval_const_bool, eval_const_u64, infer_binding_ty, remap_account_index};
pub use constants::*;
pub use cpi::{
    encode_cpi, normalize_remaining, normalize_remaining_metas, resolve_cpi_remaining,
    CpiWireBuildResult,
};
pub use decode::{decode_frame_account, DecodedFrame};
pub use error::ScratchError;
pub use frame::{encode_create_frame_args, frame_pda};
pub use frame_authority::{
    frame_authority_requires_signer, frame_write_authority_meta, prepend_write_authority_remaining,
    public_frame_authority,
};
pub use if_else::{args as if_else_args, cpi as if_else_cpi, revert as if_else_revert, skip as if_else_skip};
pub use ix::{
    build_ix_assert, build_ix_assert_multi, build_ix_close_frame, build_ix_create_frame,
    build_ix_cpi, build_ix_if_else, build_ix_let, build_ix_reset_frame, if_else_args_skip_skip,
    let_args_from_bindings, CreateFrameParams, CreateFrameResult, IxOpts,
};
pub use let_builder::{LetBuilder, LetBuilderFinish};
pub use patched_cpi::{
    build_raw_cpi, build_static_cpi, build_structured_cpi, frame_value, raw_cpi_patch,
    structured_system_transfer, system_transfer_template, with_owner_signer,
};
pub use scratch::{FrameScratch, PlanNewFrameParams, PlanNewFrameResult};
pub use typed::ScratchValue;
pub use wire_ix::{AssertMultiArgs, IfElseArgs};
