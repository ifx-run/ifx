//! On-chain executor for Ifx: Frame scratch tape, expressions, and conditional CPI.
//!
//! # Integration
//!
//! - **Off-chain transaction building:** use [`@ifx-run/sdk`](../../sdk/README.md) for layout
//!   planning and instruction encoding.
//! - **On-chain CPI:** depend on this crate with `features = ["cpi"]`.
//! - **Wire types:** [`Expr`](state::types::Expr) serializes with **Borsh** (flat enum,
//!   tags 0–43). Do not encode `Expr` with Anchor's recursive instruction coder.
//!
//! See `docs/rust-integration.md`, `docs/implementation.md`, and `docs/errors.md`.

#![allow(clippy::diverging_sub_expression)] // Anchor `#[program]` expander

pub mod constants;
pub mod error;
pub mod instructions;
pub mod pseudocode;
pub mod state;

use anchor_lang::prelude::*;

#[cfg(not(feature = "no-entrypoint"))]
use solana_security_txt::security_txt;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD");

// Embedded for Solscan security.txt — see docs/mainnet-verification.md.
#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    name: "Ifx Program",
    project_url: "https://github.com/ifx-run/ifx",
    contacts: "link:https://github.com/ifx-run/ifx/security/advisories",
    policy: "https://github.com/ifx-run/ifx/blob/main/docs/SECURITY.md",
    preferred_languages: "en,zh",
    source_code: "https://github.com/ifx-run/ifx"
}

#[program]
pub mod ifx {
    use super::*;

    /// Create a new [`Frame`] PDA — one-time provisioning per `(payer, frame_id)`.
    ///
    /// Allocates `tape_len` bytes of scratch tape (+ fixed `payload_at` index table),
    /// sets `cursor = 0`, `index_count = 0`, and stores `authority` for later
    /// [`ifx_close_frame`] and write gates on [`ifx_reset_frame`] / [`ifx_let`].
    /// The PDA seeds are `[FRAME_SEED, payer, frame_id]`.
    ///
    /// **Off-curve `authority`** (e.g. Frame PDA) → public scratch. **On-curve** → private Frame.
    /// Top-level only. See `docs/frame-authority.md`.
    #[instruction(discriminator = [IX_DISC_CREATE_FRAME])]
    pub fn ifx_create_frame(
        ctx: Context<CreateFrame>,
        frame_id: [u8; 32],
        authority: Pubkey,
        tape_len: u32,
    ) -> Result<()> {
        create_frame::handler(ctx, frame_id, authority, tape_len)
    }

    /// Close a [`Frame`] PDA and return rent to `authority`.
    ///
    /// Requires `authority` signer to match `Frame.authority`. Top-level only.
    /// Typical usage: standalone teardown tx when the Frame is no longer needed.
    #[instruction(discriminator = [IX_DISC_CLOSE_FRAME])]
    pub fn ifx_close_frame<'info>(ctx: Context<'info, CloseFrame<'info>>) -> Result<()> {
        close_frame::handler(ctx)
    }

    /// Reset Frame scratch: `cursor = 0`, `index_count = 0` (lazy — does not zero `tape`).
    ///
    /// Call at the start of a business tx when reusing an existing PDA with a clean
    /// tape. Omit only when a later tx in the **same landed bundle** intentionally
    /// continues bindings written by an earlier tx (same scratch session).
    ///
    /// Does not change `authority` or account size — only clears session data.
    /// Top-level only. **Public** Frame (off-curve `authority`): no `remaining_accounts`.
    /// **Private** Frame: `remaining_accounts[0]` = on-curve `authority` signer.
    #[instruction(discriminator = [IX_DISC_RESET_FRAME])]
    pub fn ifx_reset_frame<'info>(ctx: Context<'info, ResetFrame<'info>>) -> Result<()> {
        reset_frame::handler(ctx)
    }

    /// Evaluate `bindings` in order and append typed records to `Frame::tape`.
    ///
    /// Each binding writes `[ty:1][payload]`, records `payload_at[index]`, and advances
    /// `cursor`. Sources include account lamports/data, sysvar syscalls, typed SPL
    /// unpacks, and [`Expr`] evaluation (`Eval`). Bindings may reference earlier slots
    /// in the same batch via [`Expr::Value`] (binding **index**).
    ///
    /// **Constraints:** must run at transaction top level (stack height 1).
    /// **Private** Frame: `remaining_accounts[0]` = `authority` signer; let bindings
    /// index `remaining_accounts[1..]`. **Public** Frame: bindings index from `[0]`.
    #[instruction(discriminator = [IX_DISC_LET])]
    pub fn ifx_let<'info>(ctx: Context<'info, Let<'info>>, args: LetArgs) -> Result<()> {
        let_op::handler(ctx, args)
    }

    /// Require `cond` to evaluate to `true`; otherwise revert with [`ErrorCode::AssertFailed`].
    ///
    /// `cond` is an [`Expr`] over values already in `Frame::tape` (via prior
    /// [`ifx_let`]) or nested compare/arithmetic. Use for global guards that must
    /// hold before later steps proceed (contrast [`ifx_if_else`] branch-local `Revert`).
    #[instruction(discriminator = [IX_DISC_ASSERT])]
    pub fn ifx_assert<'info>(ctx: Context<'info, Assert<'info>>, cond: Expr) -> Result<()> {
        assert::handler(ctx, cond)
    }

    /// Unconditional patched CPI into an existing program.
    ///
    /// `arm` is a [`Cpi`] step (see [`state::cpi`] wire: Static | RawPatched | Structured).
    #[instruction(discriminator = [IX_DISC_PATCHED_CPI])]
    pub fn ifx_patched_cpi<'info>(
        ctx: Context<'info, IfxPatchedCpi<'info>>,
        arm: Cpi,
    ) -> Result<()> {
        patched_cpi_ix::handler(ctx, arm)
    }

    /// Conditional branch: evaluate `cond`, then run exactly one [`IfElseArm`].
    ///
    /// - `cond == true` → `then_arm`
    /// - `cond == false` → `else_arm`
    ///
    /// Each arm is [`IfElseArm::Skip`], [`IfElseArm::Revert`], or an ordered sequence of
    /// [`IfElseArm::Cpi`] steps (1–254 per arm; wire tag encodes count — see `state/if_else_arm.rs`).
    ///
    /// `remaining_accounts` layout matches [`ifx_patched_cpi`] when an arm invokes CPI.
    #[instruction(discriminator = [IX_DISC_IF_ELSE])]
    pub fn ifx_if_else<'info>(ctx: Context<'info, IfElse<'info>>, args: IfElseArgs) -> Result<()> {
        if_else::handler(ctx, args)
    }
}
