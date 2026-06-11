//! Ifx off-chain SDK — instructions and wire encoding only (no RPC / wallet wrapper).
//!
//! Same layer as `@ifx-run/sdk` and `go-sdk`. Depends on [`ifx_core`] for shared types
//! and codecs.
//!
//! # Status (Terminal B)
//!
//! | Phase | Scope |
//! |-------|--------|
//! | **R1** | `ifx-core` wire / layout / structured-cpi golden vs TS |
//! | **R2** | `FrameScratch`, `LetBuilder`, `expr`, `ix_*` (incl. CPI / if_else / close) | ✅ |
//! | **R3** | Integration tests / examples / decode (debug) | ✅ minimal localnet + docs; dust/orchestration backlog |
//!
//! # Publishing
//!
//! Crates.io crate name: **`ifx-sdk`**. Source directory: **`rust-sdk/`**.

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
