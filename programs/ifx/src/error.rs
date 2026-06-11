//! Anchor error codes for the Ifx program (6000 + variant index).
//!
//! Full table: `docs/errors.md`.

use anchor_lang::prelude::*;

#[error_code]
#[derive(PartialEq)]
pub enum ErrorCode {
    /// `ifx_let` was invoked via CPI (must be transaction top level).
    #[msg("ifx_let must be invoked at transaction top level (stack height 1)")]
    LetNotTopLevel,
    /// `Value.index` + type size exceeds `Frame::tape`, or layout plan diverged.
    #[msg("Tape offset and type exceed Frame::tape bounds")]
    TapeOutOfBounds,
    /// `ifx_close_frame` signer is not `Frame.authority`.
    #[msg("Only the frame authority may close this PDA")]
    UnauthorizedClose,
    /// `Pubkey::default()` passed as `authority` at create.
    #[msg("Invalid frame authority")]
    InvalidAuthority,
    /// `tape_len` is 0 or above `MAX_FRAME_TAPE_LEN`.
    #[msg("Frame tape length must be at least 1")]
    InvalidTapeLen,
    /// `ifx_assert` condition evaluated to `false`.
    #[msg("Assertion failed")]
    AssertFailed,
    /// Selected `IfElseArm::Revert`.
    #[msg("ifx_if_else branch selected Revert")]
    IfElseRevert,
    /// Binding or CPI references a missing `remaining_accounts` entry.
    #[msg("Invalid remaining account index")]
    InvalidAccountIndex,
    /// `accounts_start + accounts_len` invalid for CPI remaining slice.
    #[msg("Invalid CPI account range in remaining accounts")]
    InvalidAccountRange,
    /// Account data shorter than slice or typed layout requires.
    #[msg("Account data too short for load offset/type")]
    AccountDataTooShort,
    /// Signed/unsigned arithmetic overflow.
    #[msg("Integer overflow")]
    IntegerOverflow,
    /// Subtraction underflow.
    #[msg("Integer underflow")]
    IntegerUnderflow,
    /// Divisor is zero.
    #[msg("Division by zero")]
    DivisionByZero,
    /// Binary operator incompatible with operand type (e.g. `Add` on `Bool`).
    #[msg("Unsupported binary operator for value type")]
    UnsupportedBinaryOp,
    /// Unary operator incompatible with operand type (e.g. `Neg` on unsigned).
    #[msg("Unsupported unary operator for value type")]
    UnsupportedUnaryOp,
    /// Float compare with NaN.
    #[msg("Float comparison is undefined (e.g. NaN)")]
    FloatUnordered,
    /// Stored type tag or encode size does not match binding.
    #[msg("Load source type does not match binding value type")]
    LoadTypeMismatch,
    /// Expression result type does not match the evaluation context (e.g. `Add` operands differ).
    #[msg("Expression result type does not match binding value type")]
    ExprTypeMismatch,
    /// Literal invalid for target expression type.
    #[msg("Invalid constant for expression operand")]
    InvalidExprOperand,
    /// Patch copy exceeds `Cpi.data` length.
    #[msg("CPI patch range exceeds arm data length")]
    PatchDataOutOfRange,
    /// Corrupt or unknown type byte in `Frame::tape`.
    #[msg("Invalid value type tag in Frame tape")]
    InvalidValueTypeTag,
    /// `Value.index` out of range or binding not yet appended.
    #[msg("Invalid Frame binding index")]
    InvalidValueIndex,
    /// `index_count == index_cap` at append.
    #[msg("Frame binding index cap reached")]
    IndexCapReached,
    /// Account owner does not match typed load or owner check.
    #[msg("Account owner does not match expected program")]
    AccountOwnerMismatch,
    /// Account data length does not match expected SPL layout.
    #[msg("Account data length does not match expected layout")]
    AccountDataLenMismatch,
    /// SPL Token account/mint unpack failed.
    #[msg("Failed to unpack SPL token account or mint")]
    SplTokenUnpackFailed,
    /// Token-2022 extension opcode on account without that extension.
    #[msg("Token-2022 extension not present on account")]
    Token2022ExtensionNotPresent,
    /// Token-2022 account/mint unpack failed.
    #[msg("Failed to unpack SPL token-2022 account or mint")]
    SplToken2022UnpackFailed,
    /// `AsU64` when value exceeds `u64::MAX`.
    #[msg("Cast value does not fit target type")]
    CastOverflow,
    /// `ifx_patched_cpi` requires at least one patch (not static-only).
    #[msg("ifx_patched_cpi requires at least one patch")]
    InvalidPatchedCpiPatches,
    /// Structured CPI program id does not match patch variant.
    #[msg("Structured CPI program id does not match patch")]
    InvalidStructuredCpiProgram,
    /// Instruction data trailing bytes or CPI payload invalid.
    #[msg("Invalid instruction data")]
    InvalidInstructionData,
    /// Failed to unpack SPL stake account (`StakeStateV2`).
    #[msg("Failed to unpack stake account")]
    StakeUnpackFailed,
    /// Stake field requires `Initialized` or `Stake` state (e.g. delegation on uninitialized).
    #[msg("Stake account state does not expose the requested field")]
    StakeStateMismatch,
    /// `ifx_reset_frame` was invoked via CPI (must be transaction top level).
    #[msg("ifx_reset_frame must be invoked at transaction top level (stack height 1)")]
    ResetNotTopLevel,
    /// `ifx_close_frame` was invoked via CPI (must be transaction top level).
    #[msg("ifx_close_frame must be invoked at transaction top level (stack height 1)")]
    CloseNotTopLevel,
    /// `ifx_create_frame` was invoked via CPI (must be transaction top level).
    #[msg("ifx_create_frame must be invoked at transaction top level (stack height 1)")]
    CreateNotTopLevel,
    /// On-curve `authority` missing or wrong signer on `reset` / `let`.
    #[msg("Frame write requires authority signer")]
    UnauthorizedFrameWrite,
    /// SPL mint optional field (`mint_authority` / `freeze_authority`) is unset.
    #[msg("SPL mint optional authority is not set")]
    SplMintOptionEmpty,
    /// `ifx_assert_multi` short-circuited on a false condition.
    /// Failing index (u8) is in **return data** when available; see pseudocode logs.
    #[msg("Assertion failed in ifx_assert_multi")]
    AssertFailedMulti,
}
