//! One program-log line per Ifx statement (compact Rust-like pseudocode).
//!
//! Format documented in `docs/debugging.md`. Examples:
//! - `let $3: u64 = lamports(acct[0]); //= 1500000000`
//! - `assert!($3 >= $1); // ok`
//! - `if $5 > 0 then patched_cpi else skip -> then`

use anchor_lang::solana_program::log::sol_log;

use crate::state::{
    value_codec::{decode_typed, TypedValue},
    Expr, LetBinding, Cpi, ValueType,
};
use crate::state::structured_cpi_payload::PatchLogSink;
use crate::state::types::Value;

const MAX_LINE: usize = 480;

struct LineBuf {
    buf: [u8; MAX_LINE],
    len: usize,
}

impl LineBuf {
    fn new() -> Self {
        Self {
            buf: [0u8; MAX_LINE],
            len: 0,
        }
    }

    fn push_str(&mut self, s: &str) -> bool {
        self.push_bytes(s.as_bytes())
    }

    fn push_bytes(&mut self, s: &[u8]) -> bool {
        if self.len.saturating_add(s.len()) > MAX_LINE {
            return false;
        }
        self.buf[self.len..self.len + s.len()].copy_from_slice(s);
        self.len += s.len();
        true
    }

    fn push_char(&mut self, c: u8) -> bool {
        self.push_bytes(&[c])
    }

    fn push_u8(&mut self, n: u8) -> bool {
        self.push_u64(u64::from(n))
    }

    fn push_u32(&mut self, n: u32) -> bool {
        self.push_u64(u64::from(n))
    }

    fn push_u64(&mut self, mut n: u64) -> bool {
        if n == 0 {
            return self.push_char(b'0');
        }
        let mut tmp = [0u8; 20];
        let mut i = 0usize;
        while n > 0 {
            tmp[i] = b'0' + (n % 10) as u8;
            n /= 10;
            i += 1;
        }
        while i > 0 {
            i -= 1;
            if !self.push_char(tmp[i]) {
                return false;
            }
        }
        true
    }

    fn push_i64(&mut self, n: i64) -> bool {
        if n < 0 {
            return self.push_char(b'-') && self.push_u64((-n) as u64);
        }
        self.push_u64(n as u64)
    }

    fn push_i128(&mut self, n: i128) -> bool {
        if n < 0 {
            return self.push_char(b'-') && self.push_u128((-n) as u128);
        }
        self.push_u128(n as u128)
    }

    fn push_u128(&mut self, mut n: u128) -> bool {
        if n == 0 {
            return self.push_char(b'0');
        }
        let mut tmp = [0u8; 40];
        let mut i = 0usize;
        while n > 0 {
            tmp[i] = b'0' + (n % 10) as u8;
            n /= 10;
            i += 1;
        }
        while i > 0 {
            i -= 1;
            if !self.push_char(tmp[i]) {
                return false;
            }
        }
        true
    }

    fn emit(&self) {
        if self.len == 0 {
            return;
        }
        if let Ok(s) = core::str::from_utf8(&self.buf[..self.len]) {
            sol_log(s);
        }
    }
}

pub fn ty_name(ty: ValueType) -> &'static str {
    match ty {
        ValueType::Bool => "bool",
        ValueType::U8 => "u8",
        ValueType::U16 => "u16",
        ValueType::U32 => "u32",
        ValueType::U64 => "u64",
        ValueType::U128 => "u128",
        ValueType::I8 => "i8",
        ValueType::I16 => "i16",
        ValueType::I32 => "i32",
        ValueType::I64 => "i64",
        ValueType::I128 => "i128",
        ValueType::F32 => "f32",
        ValueType::F64 => "f64",
        ValueType::Pubkey => "pubkey",
    }
}

fn expr_atom(expr: &Expr) -> bool {
    matches!(
        expr,
        Expr::Value(_)
            | Expr::ConstBool(_)
            | Expr::ConstU8(_)
            | Expr::ConstU16(_)
            | Expr::ConstU32(_)
            | Expr::ConstU64(_)
            | Expr::ConstU128(_)
            | Expr::ConstI8(_)
            | Expr::ConstI16(_)
            | Expr::ConstI32(_)
            | Expr::ConstI64(_)
            | Expr::ConstI128(_)
            | Expr::ConstF32(_)
            | Expr::ConstF64(_)
            | Expr::ConstPubkey(_)
    )
}

fn bin_fmt(buf: &mut LineBuf, op: &str, lhs: &Expr, rhs: &Expr) -> bool {
    let wrap_l = !expr_atom(lhs);
    let wrap_r = !expr_atom(rhs);
    (if wrap_l { buf.push_char(b'(') } else { true })
        && fmt_expr(buf, lhs)
        && (if wrap_l { buf.push_char(b')') } else { true })
        && buf.push_char(b' ')
        && buf.push_str(op)
        && buf.push_char(b' ')
        && (if wrap_r { buf.push_char(b'(') } else { true })
        && fmt_expr(buf, rhs)
        && (if wrap_r { buf.push_char(b')') } else { true })
}

fn tern_fmt(buf: &mut LineBuf, name: &str, a: &Expr, b: &Expr, c: &Expr) -> bool {
    buf.push_str(name)
        && buf.push_char(b'(')
        && fmt_expr(buf, a)
        && buf.push_char(b',')
        && fmt_expr(buf, b)
        && buf.push_char(b',')
        && fmt_expr(buf, c)
        && buf.push_char(b')')
}

fn fmt_expr(buf: &mut LineBuf, expr: &Expr) -> bool {
    match expr {
        Expr::Value(v) => buf.push_char(b'$') && buf.push_u8(v.index),
        Expr::ConstBool(v) => buf.push_str(if *v { "true" } else { "false" }),
        Expr::ConstU8(v) => buf.push_u64(u64::from(*v)),
        Expr::ConstU16(v) => buf.push_u64(u64::from(*v)),
        Expr::ConstU32(v) => buf.push_u32(*v),
        Expr::ConstU64(v) => buf.push_u64(*v),
        Expr::ConstU128(v) => buf.push_u128(*v),
        Expr::ConstI8(v) => buf.push_i64(i64::from(*v)),
        Expr::ConstI16(v) => buf.push_i64(i64::from(*v)),
        Expr::ConstI32(v) => buf.push_i64(i64::from(*v)),
        Expr::ConstI64(v) => buf.push_i64(*v),
        Expr::ConstI128(v) => buf.push_i128(*v),
        Expr::ConstF32(v) => {
            buf.push_str("f32(") && buf.push_u64(v.to_bits() as u64) && buf.push_char(b')')
        }
        Expr::ConstF64(v) => buf.push_str("f64(") && buf.push_u64(v.to_bits()) && buf.push_char(b')'),
        Expr::Not { operand } => buf.push_char(b'!') && fmt_expr(buf, operand),
        Expr::Neg { operand } => buf.push_char(b'-') && fmt_expr(buf, operand),
        Expr::IsZero { operand } => buf.push_str("isZero(") && fmt_expr(buf, operand) && buf.push_char(b')'),
        Expr::NonZero { operand } => buf.push_str("nonZero(") && fmt_expr(buf, operand) && buf.push_char(b')'),
        Expr::AsU64 { operand } => buf.push_str("asU64(") && fmt_expr(buf, operand) && buf.push_char(b')'),
        Expr::AsU128 { operand } => buf.push_str("asU128(") && fmt_expr(buf, operand) && buf.push_char(b')'),
        Expr::Add { lhs, rhs } => bin_fmt(buf, "+", lhs, rhs),
        Expr::Sub { lhs, rhs } => bin_fmt(buf, "-", lhs, rhs),
        Expr::Mul { lhs, rhs } => bin_fmt(buf, "*", lhs, rhs),
        Expr::Div { lhs, rhs } => bin_fmt(buf, "/", lhs, rhs),
        Expr::DivFloor { lhs, rhs } => bin_fmt(buf, "divFloor", lhs, rhs),
        Expr::DivCeil { lhs, rhs } => bin_fmt(buf, "divCeil", lhs, rhs),
        Expr::Min { lhs, rhs } => bin_fmt(buf, ".min", lhs, rhs),
        Expr::Max { lhs, rhs } => bin_fmt(buf, ".max", lhs, rhs),
        Expr::Eq { lhs, rhs } => bin_fmt(buf, "==", lhs, rhs),
        Expr::Ne { lhs, rhs } => bin_fmt(buf, "!=", lhs, rhs),
        Expr::Gt { lhs, rhs } => bin_fmt(buf, ">", lhs, rhs),
        Expr::Ge { lhs, rhs } => bin_fmt(buf, ">=", lhs, rhs),
        Expr::Lt { lhs, rhs } => bin_fmt(buf, "<", lhs, rhs),
        Expr::Le { lhs, rhs } => bin_fmt(buf, "<=", lhs, rhs),
        Expr::SaturatingSub { lhs, rhs } => bin_fmt(buf, "satSub", lhs, rhs),
        Expr::And { lhs, rhs } => bin_fmt(buf, "&&", lhs, rhs),
        Expr::Or { lhs, rhs } => bin_fmt(buf, "||", lhs, rhs),
        Expr::BpsMulFloor { amount, bps } => bin_fmt(buf, "bpsMulFloor", amount, bps),
        Expr::BpsMulCeil { amount, bps } => bin_fmt(buf, "bpsMulCeil", amount, bps),
        Expr::MulDivFloor { a, b, c } => tern_fmt(buf, "mulDivFloor", a, b, c),
        Expr::MulDivCeil { a, b, c } => tern_fmt(buf, "mulDivCeil", a, b, c),
        Expr::Clamp { value, lo, hi } => tern_fmt(buf, "clamp", value, lo, hi),
        Expr::Select { cond, then_expr, else_expr } => {
            buf.push_str("select(")
                && fmt_expr(buf, cond)
                && buf.push_char(b',')
                && fmt_expr(buf, then_expr)
                && buf.push_char(b',')
                && fmt_expr(buf, else_expr)
                && buf.push_char(b')')
        }
        Expr::ConstPubkey(_) => buf.push_str("pubkey(...)"),
    }
}

fn fmt_typed_value(buf: &mut LineBuf, ty: ValueType, bytes: &[u8]) -> bool {
    let Ok(v) = decode_typed(ty, bytes) else {
        return buf.push_str("?");
    };
    match v {
        TypedValue::Bool(b) => buf.push_str(if b { "true" } else { "false" }),
        TypedValue::U8(n) => buf.push_u64(u64::from(n)),
        TypedValue::U16(n) => buf.push_u64(u64::from(n)),
        TypedValue::U32(n) => buf.push_u32(n),
        TypedValue::U64(n) => buf.push_u64(n),
        TypedValue::U128(n) => buf.push_u128(n),
        TypedValue::I8(n) => buf.push_i64(i64::from(n)),
        TypedValue::I16(n) => buf.push_i64(i64::from(n)),
        TypedValue::I32(n) => buf.push_i64(i64::from(n)),
        TypedValue::I64(n) => buf.push_i64(n),
        TypedValue::I128(n) => buf.push_i128(n),
        TypedValue::F32(n) => {
            buf.push_str("f32(") && buf.push_u64(n.to_bits() as u64) && buf.push_char(b')')
        }
        TypedValue::F64(n) => buf.push_str("f64(") && buf.push_u64(n.to_bits()) && buf.push_char(b')'),
        TypedValue::Pubkey(_) => buf.push_str("pubkey(...)"),
    }
}

fn fmt_binding_rhs(buf: &mut LineBuf, binding: &LetBinding) -> bool {
    use LetBinding::*;
    match binding {
        AccountDataSlice {
            account_index,
            offset,
            expected_program_owner,
            ..
        } => {
            buf.push_str("account_data_slice(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("], owner_prog[")
                && buf.push_u64(u64::from(*expected_program_owner))
                && buf.push_str("], ")
                && buf.push_u32(*offset)
                && buf.push_char(b')')
        }
        AccountLamports { account_index } => {
            buf.push_str("lamports(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        AccountDataLen { account_index } => {
            buf.push_str("account_data_len(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        AccountKey { account_index } => {
            buf.push_str("account_key(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        ConstPubkey { .. } => buf.push_str("const_pubkey(...)"),
        Eval { expr, .. } => fmt_expr(buf, expr),
        SysvarClockSlot => buf.push_str("clock.slot()"),
        SysvarClockEpochStartTimestamp => buf.push_str("clock.epoch_start_timestamp()"),
        SysvarClockEpoch => buf.push_str("clock.epoch()"),
        SysvarClockLeaderScheduleEpoch => buf.push_str("clock.leader_schedule_epoch()"),
        SysvarClockUnixTimestamp => buf.push_str("clock.unix_timestamp()"),
        SysvarRentMinimumBalance { data_len } => {
            buf.push_str("rent.minimum_balance(")
                && buf.push_u32(*data_len)
                && buf.push_char(b')')
        }
        SplTokenAccountAmount { account_index } => {
            buf.push_str("spl_token_amount(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        SplTokenAccountDelegatedAmount { account_index } => {
            buf.push_str("spl_token_delegated_amount(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        SplTokenAccountState { account_index } => {
            buf.push_str("spl_token_state(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        SplMintSupply { account_index } => {
            buf.push_str("spl_mint_supply(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        SplMintDecimals { account_index } => {
            buf.push_str("spl_mint_decimals(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        SplToken2022AccountAmount { account_index } => {
            buf.push_str("spl_token_2022_amount(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        SplToken2022AccountDelegatedAmount { account_index } => {
            buf.push_str("spl_token_2022_delegated_amount(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        SplToken2022AccountState { account_index } => {
            buf.push_str("spl_token_2022_state(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        SplToken2022MintSupply { account_index } => {
            buf.push_str("spl_token_2022_mint_supply(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        SplToken2022MintDecimals { account_index } => {
            buf.push_str("spl_token_2022_mint_decimals(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        SplToken2022AccountTransferFeeWithheld { account_index } => {
            buf.push_str("spl_token_2022_fee_withheld(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        SplToken2022MintTransferFeeBasisPoints { account_index } => {
            buf.push_str("spl_token_2022_fee_bps(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        SplToken2022MintTransferFeeMaximum { account_index } => {
            buf.push_str("spl_token_2022_fee_max(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        SplToken2022MintWithheldAmount { account_index } => {
            buf.push_str("spl_token_2022_mint_withheld(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        SplToken2022MintDefaultAccountState { account_index } => {
            buf.push_str("spl_token_2022_default_state(acc[")
                && buf.push_u64(u64::from(*account_index))
                && buf.push_str("])")
        }
        FrameGeneration => buf.push_str("frame.generation()"),
        FrameIndexCount => buf.push_str("frame.index_count()"),
    }
}

fn emit_line(build: impl FnOnce(&mut LineBuf) -> bool) {
    let mut buf = LineBuf::new();
    if build(&mut buf) {
        buf.emit();
    }
}

pub fn log_create_frame(tape_len: u32) {
    emit_line(|b| b.push_str("Frame::new(") && b.push_u32(tape_len) && b.push_char(b')'));
}

pub fn log_close_frame() {
    emit_line(|b| b.push_str("drop(frame)"));
}

pub fn log_reset_frame() {
    emit_line(|b| b.push_str("frame.reset()"));
}

pub fn log_let_binding(binding_index: u8, binding: &LetBinding, ty: ValueType, bytes: &[u8]) {
    emit_line(|b| {
        b.push_str("let $")
            && b.push_u8(binding_index)
            && b.push_str(": ")
            && b.push_str(ty_name(ty))
            && b.push_str(" = ")
            && fmt_binding_rhs(b, binding)
            && b.push_str("; //= ")
            && fmt_typed_value(b, ty, bytes)
    });
}

pub fn log_let_batch(
    bindings: &[LetBinding],
    binding_indices: &[u8],
    value_types: &[ValueType],
    values: &[Vec<u8>],
) {
    for (i, binding) in bindings.iter().enumerate() {
        log_let_binding(binding_indices[i], binding, value_types[i], &values[i]);
    }
}

pub fn log_assert(cond: &Expr, ok: bool) {
    emit_line(|b| {
        b.push_str("assert!(")
            && fmt_expr(b, cond)
            && b.push_char(b')')
            && b.push_str(if ok { "; // ok" } else { "; // fail" })
    });
}

fn push_if_else_arm_label(b: &mut LineBuf, arm: &crate::state::IfElseArm) -> bool {
    use crate::state::IfElseArm;

    match arm {
        IfElseArm::Skip => b.push_str("skip"),
        IfElseArm::Revert => b.push_str("revert"),
        IfElseArm::Cpi(steps) if steps.len() == 1 => b.push_str("cpi"),
        IfElseArm::Cpi(steps) => {
            b.push_str("cpi×")
                && b.push_u64(steps.len() as u64)
        }
    }
}

pub fn log_if_else(
    cond: &Expr,
    branch: bool,
    then_arm: &crate::state::IfElseArm,
    else_arm: &crate::state::IfElseArm,
) {
    emit_line(|b| {
        let taken = if branch { "then" } else { "else" };
        b.push_str("if ")
            && fmt_expr(b, cond)
            && b.push_str(" then ")
            && push_if_else_arm_label(b, then_arm)
            && b.push_str(" else ")
            && push_if_else_arm_label(b, else_arm)
            && b.push_str(" -> ")
            && b.push_str(taken)
    });
}

struct LinePatchLogSink<'a> {
    buf: &'a mut LineBuf,
    first: bool,
}

impl PatchLogSink for LinePatchLogSink<'_> {
    fn patch_binding(&mut self, field: &'static str, source: Value) -> bool {
        if !self.first {
            if !self.buf.push_str(", patch ") {
                return false;
            }
        } else {
            if !self.buf.push_str(" patch ") {
                return false;
            }
        }
        self.first = false;
        self.buf.push_str(field)
            && self.buf.push_str(" <- $")
            && self.buf.push_u8(source.index)
    }
}

pub fn log_cpi(arm: &Cpi) {
    emit_line(|b| {
        let (accounts_start, accounts_len, data, label) = match arm {
            Cpi::Static {
                accounts_start,
                accounts_len,
                data,
            } => (*accounts_start, *accounts_len, data.as_slice(), "static"),
            Cpi::RawPatched {
                accounts_start,
                accounts_len,
                data,
                patches,
            } => {
                let end = accounts_start
                    .checked_add(*accounts_len)
                    .unwrap_or(*accounts_start);
                let mut ok = b.push_str("cpi accts[")
                    && b.push_u64(u64::from(*accounts_start))
                    && b.push_str("..")
                    && b.push_u64(u64::from(end))
                    && b.push_str("] data=")
                    && b.push_u64(data.len() as u64);
                if patches.is_empty() {
                    return ok && b.push_str(" static");
                }
                for (i, patch) in patches.iter().enumerate() {
                    if i == 0 {
                        ok = ok && b.push_str(" patch");
                    } else {
                        ok = ok && b.push_str(", ");
                    }
                    ok = ok
                        && b.push_str(" +")
                        && b.push_u64(u64::from(patch.data_offset))
                        && b.push_str(" <- $")
                        && b.push_u8(patch.source.index);
                }
                return ok;
            }
            Cpi::Structured {
                accounts_start,
                accounts_len,
                patch,
            } => {
                let end = accounts_start
                    .checked_add(*accounts_len)
                    .unwrap_or(*accounts_start);
                let ok = b.push_str("cpi accts[")
                    && b.push_u64(u64::from(*accounts_start))
                    && b.push_str("..")
                    && b.push_u64(u64::from(end))
                    && b.push_str("] structured ")
                    && b.push_str(patch.log_label());
                let mut sink = LinePatchLogSink { buf: b, first: true };
                return ok && patch.append_log_bindings(&mut sink);
            }
        };
        let end = accounts_start
            .checked_add(accounts_len)
            .unwrap_or(accounts_start);
        b.push_str("cpi accts[")
            && b.push_u64(u64::from(accounts_start))
            && b.push_str("..")
            && b.push_u64(u64::from(end))
            && b.push_str("] data=")
            && b.push_u64(data.len() as u64)
            && b.push_str(" ")
            && b.push_str(label)
    });
}
