//! Wire types for Ifx instructions and Frame tape.
//!
//! - [`Expr`]: Borsh flat enum, discriminant **0–42** (see `docs/implementation.md` §5).
//!   Encoded with `borsh`, not `AnchorSerialize`. IDL shape: `state/expr_idl_type.json`.
//! - [`LetBinding`]: Anchor enum, discriminant **0–24** (see `docs/typed-let-bindings.md`).
//! - [`Value`]: binding index into `Frame::payload_at` / `tape`.

use anchor_lang::prelude::*;

use super::patch_list::PatchList;
use super::u8_len_vec::U8LenVec;
use super::u16_len_vec::U16LenVec;

/// Reference to a bound value by **binding index** (0-based append order).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct Value {
    pub index: u8,
}

/// Primitive types supported in Frame tape and `ifx_let` (little-endian, fixed width).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ValueType {
    /// 1 byte
    Bool,
    /// 1 byte, unsigned
    U8,
    /// 2 bytes, unsigned
    U16,
    /// 4 bytes, unsigned
    U32,
    /// 8 bytes, unsigned
    U64,
    /// 16 bytes, unsigned
    U128,
    /// 1 byte, signed
    I8,
    /// 2 bytes, signed
    I16,
    /// 4 bytes, signed
    I32,
    /// 8 bytes, signed
    I64,
    /// 16 bytes, signed
    I128,
    /// 4 bytes, IEEE-754
    F32,
    /// 8 bytes, IEEE-754
    F64,
}

impl ValueType {
    pub const fn size(self) -> usize {
        match self {
            ValueType::Bool | ValueType::U8 | ValueType::I8 => 1,
            ValueType::U16 | ValueType::I16 => 2,
            ValueType::U32 | ValueType::I32 | ValueType::F32 => 4,
            ValueType::U64 | ValueType::I64 | ValueType::F64 => 8,
            ValueType::U128 | ValueType::I128 => 16,
        }
    }

    pub const fn supports_arithmetic(self) -> bool {
        !matches!(self, ValueType::Bool)
    }

    pub const fn supports_ordering(self) -> bool {
        self.supports_arithmetic()
    }

    pub const fn supports_neg(self) -> bool {
        matches!(
            self,
            ValueType::I8
                | ValueType::I16
                | ValueType::I32
                | ValueType::I64
                | ValueType::I128
                | ValueType::F32
                | ValueType::F64
        )
    }
}

/// Flat expression tree: one wire tag per operator (no nested `Unary`/`Binary` shells).
///
/// Variant order is the Borsh discriminant (0–42). See `docs/implementation.md` §5.
///
/// Uses `borsh` derives (not `#[derive(AnchorSerialize)]`) so we can supply a
/// non-recursive [`IdlBuild`] impl under `idl-build` without stack overflow.
#[derive(borsh::BorshSerialize, borsh::BorshDeserialize, Clone, Debug)]
pub enum Expr {
    /// Prior binding at `index`. **→ stored [`ValueType`].**
    Value(Value),
    /// Literal. **→ `Bool`.**
    ConstBool(bool),
    /// Literal. **→ `U8`.**
    ConstU8(u8),
    /// Literal. **→ `U16`.**
    ConstU16(u16),
    /// Literal. **→ `U32`.**
    ConstU32(u32),
    /// Literal. **→ `U64`.**
    ConstU64(u64),
    /// Literal. **→ `U128`.**
    ConstU128(u128),
    /// Literal. **→ `I8`.**
    ConstI8(i8),
    /// Literal. **→ `I16`.**
    ConstI16(i16),
    /// Literal. **→ `I32`.**
    ConstI32(i32),
    /// Literal. **→ `I64`.**
    ConstI64(i64),
    /// Literal. **→ `I128`.**
    ConstI128(i128),
    /// Literal. **→ `F32`.**
    ConstF32(f32),
    /// Literal. **→ `F64`.**
    ConstF64(f64),
    /// Logical not (operand must be `Bool`). **→ `Bool`.**
    Not { operand: Box<Expr> },
    /// Arithmetic negation (signed integer or float operand). **→ operand type.**
    Neg { operand: Box<Expr> },
    /// `operand == 0` for integer types. **→ `Bool`.**
    IsZero { operand: Box<Expr> },
    /// `operand != 0` for integer types. **→ `Bool`.**
    NonZero { operand: Box<Expr> },
    /// `u128 → u64` when `≤ u64::MAX`; smaller unsigned widens to `u64`. **→ `U64`.**
    AsU64 { operand: Box<Expr> },
    /// Zero-extends `u8`–`u64` to `u128`. **→ `U128`.**
    AsU128 { operand: Box<Expr> },
    /// Addition (lhs/rhs same arithmetic type). **→ lhs type.**
    Add {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Subtraction. **→ lhs type.**
    Sub {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Multiplication. **→ lhs type.**
    Mul {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Truncating division. **→ lhs type.**
    Div {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Floor division (`⌊lhs / rhs⌋`). **→ lhs type.**
    DivFloor {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Ceiling division (`⌈lhs / rhs⌉`). **→ lhs type.**
    DivCeil {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Minimum of lhs/rhs. **→ lhs type.**
    Min {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Maximum of lhs/rhs. **→ lhs type.**
    Max {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Equality (lhs/rhs same type). **→ `Bool`.**
    Eq {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Inequality. **→ `Bool`.**
    Ne {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Greater than. **→ `Bool`.**
    Gt {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Greater or equal. **→ `Bool`.**
    Ge {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Less than. **→ `Bool`.**
    Lt {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Less or equal. **→ `Bool`.**
    Le {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Subtraction saturating at type minimum (`0` for unsigned). **→ lhs type.**
    SaturatingSub {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Logical and (both operands `Bool`). **→ `Bool`.**
    And {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// Logical or (both operands `Bool`). **→ `Bool`.**
    Or {
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    /// `⌊amount × bps / 10_000⌋`. **→ `U64`.**
    BpsMulFloor {
        amount: Box<Expr>,
        bps: Box<Expr>,
    },
    /// `⌈amount × bps / 10_000⌉`. **→ `U64`.**
    BpsMulCeil {
        amount: Box<Expr>,
        bps: Box<Expr>,
    },
    /// `⌊a × b / c⌋` (`a`, `b`, `c` same type). **→ `a` type.**
    MulDivFloor {
        a: Box<Expr>,
        b: Box<Expr>,
        c: Box<Expr>,
    },
    /// `⌈a × b / c⌉`. **→ `a` type.**
    MulDivCeil {
        a: Box<Expr>,
        b: Box<Expr>,
        c: Box<Expr>,
    },
    /// Clamp `value` to `[lo, hi]` (all same type). **→ `value` type.**
    Clamp {
        value: Box<Expr>,
        lo: Box<Expr>,
        hi: Box<Expr>,
    },
    /// `cond ? then_expr : else_expr` (`cond` → `Bool`; branches same type). **→ branch type.**
    Select {
        cond: Box<Expr>,
        then_expr: Box<Expr>,
        else_expr: Box<Expr>,
    },
}

/// One `ifx_let` binding: wire tag selects variant; Frame `ty` is implied (or explicit for slices/eval).
///
/// Variant order matches opcode tags `0`–`24` (see `docs/typed-let-bindings.md`).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum LetBinding {
    /// Owner-checked raw slice of `account.data[offset..]` (caller supplies `ty`; no layout unpack).
    ///
    /// `remaining[expected_program_owner].key` must equal `remaining[account_index].owner`.
    /// **→ `ty`.**
    AccountDataSlice {
        ty: ValueType,
        account_index: u8,
        offset: u32,
        expected_program_owner: u8,
    },
    /// `remaining[i].lamports` (native SOL balance). **→ `U64`.**
    AccountLamports { account_index: u8 },
    /// Evaluate `expr` and append to frame tape.
    ///
    /// Storage type is inferred on-chain via [`infer_expr_ty`](crate::state::let_exec::infer_expr_ty)
    /// (same rules as `@ifx-run/sdk` `inferIfxTyFromExpr`). SDK `letEval` infers off-chain for layout.
    Eval {
        expr: Expr,
    },
    /// `Clock::get()?.slot`. **→ `U64`.** No `remaining` account.
    SysvarClockSlot,
    /// `Clock::get()?.epoch_start_timestamp`. **→ `I64`.**
    SysvarClockEpochStartTimestamp,
    /// `Clock::get()?.epoch`. **→ `U64`.**
    SysvarClockEpoch,
    /// `Clock::get()?.leader_schedule_epoch`. **→ `U64`.**
    SysvarClockLeaderScheduleEpoch,
    /// `Clock::get()?.unix_timestamp`. **→ `I64`.**
    SysvarClockUnixTimestamp,
    /// `Rent::get()?.minimum_balance(data_len)`. **→ `U64`.**
    SysvarRentMinimumBalance { data_len: u32 },
    /// SPL Token account `amount` (`owner == spl_token::ID`, 165-byte account). **→ `U64`.**
    SplTokenAccountAmount { account_index: u8 },
    /// SPL Token account `delegated_amount`. **→ `U64`.**
    SplTokenAccountDelegatedAmount { account_index: u8 },
    /// SPL Token account `state` (`AccountState` discriminant). **→ `U8`.**
    SplTokenAccountState { account_index: u8 },
    /// SPL Token mint `supply`. **→ `U64`.**
    SplMintSupply { account_index: u8 },
    /// SPL Token mint `decimals`. **→ `U8`.**
    SplMintDecimals { account_index: u8 },
    /// Token-2022 account `amount` (`owner == spl_token_2022::ID`). **→ `U64`.**
    SplToken2022AccountAmount { account_index: u8 },
    /// Token-2022 account `delegated_amount`. **→ `U64`.**
    SplToken2022AccountDelegatedAmount { account_index: u8 },
    /// Token-2022 account `state`. **→ `U8`.**
    SplToken2022AccountState { account_index: u8 },
    /// Token-2022 mint `supply`. **→ `U64`.**
    SplToken2022MintSupply { account_index: u8 },
    /// Token-2022 mint `decimals`. **→ `U8`.**
    SplToken2022MintDecimals { account_index: u8 },
    /// Token-2022 `TransferFeeAmount.withheld_amount` on token account. **→ `U64`.**
    SplToken2022AccountTransferFeeWithheld { account_index: u8 },
    /// Token-2022 mint current `transfer_fee_basis_points`. **→ `U16`.**
    SplToken2022MintTransferFeeBasisPoints { account_index: u8 },
    /// Token-2022 mint current `maximum_fee`. **→ `U64`.**
    SplToken2022MintTransferFeeMaximum { account_index: u8 },
    /// Token-2022 mint `TransferFeeConfig.withheld_amount`. **→ `U64`.**
    SplToken2022MintWithheldAmount { account_index: u8 },
    /// Token-2022 mint `DefaultAccountState.state`. **→ `U8`.**
    SplToken2022MintDefaultAccountState { account_index: u8 },
    /// `remaining[i].data_len()` (account data byte length). **→ `U32`.**
    AccountDataLen { account_index: u8 },
}

impl LetBinding {
    /// Frame tape type for bindings with a fixed wire type.
    ///
    /// For [`LetBinding::Eval`], use [`infer_expr_ty`](crate::state::let_exec::infer_expr_ty).
    pub fn value_type(&self) -> ValueType {
        use LetBinding::*;
        use ValueType::*;
        match self {
            Eval { .. } => panic!("Eval binding type requires infer_expr_ty"),
            AccountDataSlice { ty, .. } => *ty,
            AccountLamports { .. }
            | SysvarClockSlot
            | SysvarClockEpoch
            | SysvarClockLeaderScheduleEpoch
            | SysvarRentMinimumBalance { .. }
            | SplTokenAccountAmount { .. }
            | SplTokenAccountDelegatedAmount { .. }
            | SplMintSupply { .. }
            | SplToken2022AccountAmount { .. }
            | SplToken2022AccountDelegatedAmount { .. }
            | SplToken2022MintSupply { .. }
            | SplToken2022AccountTransferFeeWithheld { .. }
            | SplToken2022MintTransferFeeMaximum { .. }
            | SplToken2022MintWithheldAmount { .. } => U64,
            SysvarClockEpochStartTimestamp
            | SysvarClockUnixTimestamp => I64,
            SplTokenAccountState { .. }
            | SplMintDecimals { .. }
            | SplToken2022AccountState { .. }
            | SplToken2022MintDecimals { .. }
            | SplToken2022MintDefaultAccountState { .. } => U8,
            SplToken2022MintTransferFeeBasisPoints { .. } => U16,
            AccountDataLen { .. } => U32,
        }
    }
}

/// Parallel bindings for a single top-level `ifx_let`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct LetArgs {
    pub bindings: U8LenVec<LetBinding>,
}

/// Overwrite a slice of [`Cpi::data`] with bytes read from [`Frame::tape`] before invoke.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct CpiPatch {
    /// Byte offset into [`Cpi::data`] (not a Frame index; may exceed 255).
    pub data_offset: u16,
    /// Binding index in the Frame (`payload_at[index]` → tape payload bytes).
    pub source: Value,
}

/// Template CPI + optional tape patches (`ifx_patched_cpi` / `ifx_if_else` steps).
///
/// `remaining[accounts_start..accounts_start + accounts_len]` must be
/// `[program, …cpi_accounts]`. Empty [`PatchList`] = static step (template `data` as-is).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Cpi {
    pub accounts_start: u8,
    pub accounts_len: u8,
    /// Base instruction data; patches overwrite ranges before `invoke`.
    pub data: U16LenVec<u8>,
    pub patches: PatchList,
}

/// One side of `ifx_if_else`: skip, revert, or an ordered CPI step list.
///
/// Wire: single **u8 tag** — see [`super::if_else_arm`].
#[derive(Clone, Debug)]
pub enum IfElseArm {
    Skip,
    /// Ordered steps (each [`Cpi`]; static steps use an empty [`PatchList`]).
    Cpi(Vec<Cpi>),
    Revert,
}

/// Arguments for [`crate::ifx_if_else`]: `cond` must evaluate to **`Bool`**.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct IfElseArgs {
    pub cond: Expr,
    pub then_arm: IfElseArm,
    pub else_arm: IfElseArm,
}
