//! Structured CPI nested patch payloads — explicit variants per official ix layout.
//!
//! Wire: sub-tag + literals / [`Value`] binding refs (no instruction `data` blob).
//! Sub-family tags use `#[repr(u8)]` enums so wire bytes have a single source of truth.

use std::io::{Error as IoError, ErrorKind, Result as IoResult, Write};

use super::types::Value;

/// Append structured CPI patch fields that come from Frame bindings (`Value`).
pub trait PatchLogSink {
    /// One segment: ` patch field <- $N` (comma-separated after the first).
    fn patch_binding(&mut self, field: &'static str, source: Value) -> bool;
}

macro_rules! wire_tag_enum {
    ($(#[$meta:meta])* $vis:vis enum $name:ident { $($variant:ident = $val:expr),+ $(,)? }) => {
        $(#[$meta])*
        #[repr(u8)]
        $vis enum $name {
            $($variant = $val),+
        }

        impl $name {
            fn from_wire(byte: u8) -> IoResult<Self> {
                Ok(match byte {
                    $( $val => Self::$variant, )+
                    _ => return Err(invalid_payload()),
                })
            }

            const fn wire_byte(self) -> u8 {
                self as u8
            }
        }
    };
}

wire_tag_enum! {
    enum AmountDecimalsTag {
        AmountOnly = 0,
        Both = 1,
        DecimalsOnly = 2,
    }
}

wire_tag_enum! {
    enum LamportsSpaceTag {
        LamportsOnly = 0,
        SpaceOnly = 1,
        Both = 2,
    }
}

wire_tag_enum! {
    enum SetTransferFeeTag {
        BpsOnly = 0,
        MaxOnly = 1,
        Both = 2,
    }
}

wire_tag_enum! {
    enum AmountDecimalsFeeTag {
        AmountOnly = 0,
        DecimalsOnly = 1,
        FeeOnly = 2,
        AmountDecimals = 3,
        AmountFee = 4,
        DecimalsFee = 5,
        AllFromFrame = 6,
    }
}

wire_tag_enum! {
    enum PubkeyValueTag {
        FromFrame = 0,
        Literal = 1,
    }
}

wire_tag_enum! {
    /// Freeze authority on InitializeMint-family ix data (`COption<Pubkey>`).
    pub enum FreezeAuthTag {
        None = 0,
        SomeValue = 1,
        SomeLiteral = 2,
    }
}

/// `TransferChecked`-family: which slots come from Frame vs wire literals.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AmountDecimalsPatch {
    /// Amount from Frame; **decimals** literal (`u8` on wire).
    AmountOnly { amount: Value, decimals: u8 },
    /// Both **amount** and **decimals** from Frame.
    Both { amount: Value, decimals: Value },
    /// **Amount** literal (`u64`); decimals from Frame.
    DecimalsOnly { amount: u64, decimals: Value },
}

/// `CreateAccount`: lamports / space combinations (all-const forbidden → use Static CPI).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LamportsSpacePatch {
    /// Lamports from Frame; **space** literal (`u64`).
    LamportsOnly { lamports: Value, space: u64 },
    /// **Lamports** literal; space from Frame.
    SpaceOnly { lamports: u64, space: Value },
    /// Both lamports and space from Frame.
    Both { lamports: Value, space: Value },
}

/// Token-2022 `TransferCheckedWithFee` — at least one slot from Frame.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AmountDecimalsFeePatch {
    /// Amount from Frame; decimals + fee literals.
    AmountOnly { amount: Value, decimals: u8, fee: u64 },
    /// Decimals from Frame; amount + fee literals.
    DecimalsOnly { amount: u64, decimals: Value, fee: u64 },
    /// Fee from Frame; amount + decimals literals.
    FeeOnly { amount: u64, decimals: u8, fee: Value },
    /// Amount + decimals from Frame; fee literal.
    AmountDecimals { amount: Value, decimals: Value, fee: u64 },
    /// Amount + fee from Frame; decimals literal.
    AmountFee { amount: Value, decimals: u8, fee: Value },
    /// Decimals + fee from Frame; amount literal.
    DecimalsFee { amount: u64, decimals: Value, fee: Value },
    /// Amount, decimals, and fee all from Frame.
    AllFromFrame { amount: Value, decimals: Value, fee: Value },
}

/// Token-2022 TransferFee `SetTransferFee`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SetTransferFeePatch {
    /// **basis_points** from Frame; **maximum_fee** literal.
    BpsOnly { basis_points: Value, maximum_fee: u64 },
    /// basis_points literal; **maximum_fee** from Frame.
    MaxOnly { basis_points: u16, maximum_fee: Value },
    /// Both basis_points and maximum_fee from Frame.
    Both { basis_points: Value, maximum_fee: Value },
}

/// Pubkey field: Frame binding or wire literal (literal has no ALT).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PubkeyValue {
    /// 32-byte pubkey read from Frame (`AccountKey` / `ConstPubkey` binding).
    FromFrame(Value),
    /// Fixed 32-byte pubkey embedded in patch wire.
    Literal([u8; 32]),
}

/// SPL `InitializeMint*` — dynamic `decimals`; optional freeze via [`FreezeAuthPatch`].
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InitializeMintPatch {
    pub decimals: Value,
    pub mint_authority: PubkeyValue,
    pub freeze: FreezeAuthPatch,
}

fn append_pubkey_value_log(
    sink: &mut impl PatchLogSink,
    field: &'static str,
    value: &PubkeyValue,
) -> bool {
    match value {
        PubkeyValue::FromFrame(v) => sink.patch_binding(field, *v),
        PubkeyValue::Literal(_) => true,
    }
}

fn append_freeze_auth_log(sink: &mut impl PatchLogSink, freeze: &FreezeAuthPatch) -> bool {
    match freeze {
        FreezeAuthPatch::None | FreezeAuthPatch::SomeLiteral(_) => true,
        FreezeAuthPatch::SomeValue(v) => sink.patch_binding("freeze_authority", *v),
    }
}

impl InitializeMintPatch {
    pub(crate) fn append_log_bindings(&self, sink: &mut impl PatchLogSink) -> bool {
        sink.patch_binding("decimals", self.decimals)
            && append_pubkey_value_log(sink, "mint_authority", &self.mint_authority)
            && append_freeze_auth_log(sink, &self.freeze)
    }
}

/// Freeze authority value for InitializeMint-family patches.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FreezeAuthPatch {
    /// No freeze authority (`COption::None`).
    None,
    /// Freeze pubkey from Frame binding.
    SomeValue(Value),
    /// Fixed 32-byte freeze pubkey on wire.
    SomeLiteral([u8; 32]),
}

fn invalid_payload() -> IoError {
    IoError::new(ErrorKind::InvalidData, "invalid structured CPI patch payload")
}

fn read_u64(buf: &mut &[u8]) -> IoResult<u64> {
    if buf.len() < 8 {
        return Err(invalid_payload());
    }
    let (head, tail) = buf.split_at(8);
    *buf = tail;
    Ok(u64::from_le_bytes(head.try_into().unwrap()))
}

fn read_pubkey(buf: &mut &[u8]) -> IoResult<[u8; 32]> {
    if buf.len() < 32 {
        return Err(invalid_payload());
    }
    let (head, tail) = buf.split_at(32);
    *buf = tail;
    Ok(head.try_into().unwrap())
}

fn write_u64(writer: &mut impl Write, n: u64) -> IoResult<()> {
    writer.write_all(&n.to_le_bytes())
}

fn write_value(writer: &mut impl Write, source: Value) -> IoResult<()> {
    writer.write_all(&[source.index])
}

fn read_value(buf: &mut &[u8]) -> IoResult<Value> {
    if buf.is_empty() {
        return Err(invalid_payload());
    }
    let index = buf[0];
    *buf = &buf[1..];
    Ok(Value { index })
}

pub(crate) fn serialize_single_value(writer: &mut impl Write, v: Value) -> IoResult<()> {
    writer.write_all(&[0])?;
    write_value(writer, v)
}

pub(crate) fn deserialize_single_value(buf: &mut &[u8]) -> IoResult<Value> {
    if buf.is_empty() || buf[0] != 0 || buf.len() < 2 {
        return Err(invalid_payload());
    }
    *buf = &buf[1..];
    read_value(buf)
}

fn write_pubkey_value(writer: &mut impl Write, value: &PubkeyValue) -> IoResult<()> {
    match value {
        PubkeyValue::FromFrame(v) => {
            writer.write_all(&[PubkeyValueTag::FromFrame.wire_byte()])?;
            write_value(writer, *v)
        }
        PubkeyValue::Literal(pk) => {
            writer.write_all(&[PubkeyValueTag::Literal.wire_byte()])?;
            writer.write_all(pk)
        }
    }
}

fn read_pubkey_value(buf: &mut &[u8]) -> IoResult<PubkeyValue> {
    if buf.is_empty() {
        return Err(invalid_payload());
    }
    let tag = PubkeyValueTag::from_wire(buf[0])?;
    *buf = &buf[1..];
    Ok(match tag {
        PubkeyValueTag::FromFrame => PubkeyValue::FromFrame(read_value(buf)?),
        PubkeyValueTag::Literal => PubkeyValue::Literal(read_pubkey(buf)?),
    })
}

fn write_freeze_auth_patch(writer: &mut impl Write, freeze: &FreezeAuthPatch) -> IoResult<()> {
    match freeze {
        FreezeAuthPatch::None => writer.write_all(&[FreezeAuthTag::None.wire_byte()]),
        FreezeAuthPatch::SomeValue(v) => {
            writer.write_all(&[FreezeAuthTag::SomeValue.wire_byte()])?;
            write_value(writer, *v)
        }
        FreezeAuthPatch::SomeLiteral(pk) => {
            writer.write_all(&[FreezeAuthTag::SomeLiteral.wire_byte()])?;
            writer.write_all(pk)
        }
    }
}

fn read_freeze_auth_patch(buf: &mut &[u8]) -> IoResult<FreezeAuthPatch> {
    if buf.is_empty() {
        return Err(invalid_payload());
    }
    let tag = FreezeAuthTag::from_wire(buf[0])?;
    *buf = &buf[1..];
    Ok(match tag {
        FreezeAuthTag::None => FreezeAuthPatch::None,
        FreezeAuthTag::SomeValue => FreezeAuthPatch::SomeValue(read_value(buf)?),
        FreezeAuthTag::SomeLiteral => FreezeAuthPatch::SomeLiteral(read_pubkey(buf)?),
    })
}

pub(crate) fn write_initialize_mint_patch(
    writer: &mut impl Write,
    patch: &InitializeMintPatch,
) -> IoResult<()> {
    write_value(writer, patch.decimals)?;
    write_pubkey_value(writer, &patch.mint_authority)?;
    write_freeze_auth_patch(writer, &patch.freeze)
}

pub(crate) fn read_initialize_mint_patch(buf: &mut &[u8]) -> IoResult<InitializeMintPatch> {
    if buf.is_empty() {
        return Err(invalid_payload());
    }
    let decimals = read_value(buf)?;
    let mint_authority = read_pubkey_value(buf)?;
    let freeze = read_freeze_auth_patch(buf)?;
    Ok(InitializeMintPatch {
        decimals,
        mint_authority,
        freeze,
    })
}

impl LamportsSpacePatch {
    pub(crate) fn append_log_bindings(&self, sink: &mut impl PatchLogSink) -> bool {
        match self {
            Self::LamportsOnly { lamports, .. } => sink.patch_binding("lamports", *lamports),
            Self::SpaceOnly { space, .. } => sink.patch_binding("space", *space),
            Self::Both { lamports, space } => {
                sink.patch_binding("lamports", *lamports)
                    && sink.patch_binding("space", *space)
            }
        }
    }

    pub(crate) fn serialize_wire<W: Write>(&self, writer: &mut W) -> IoResult<()> {
        match self {
            Self::LamportsOnly { lamports, space } => {
                writer.write_all(&[LamportsSpaceTag::LamportsOnly.wire_byte()])?;
                write_value(writer, *lamports)?;
                write_u64(writer, *space)
            }
            Self::SpaceOnly { lamports, space } => {
                writer.write_all(&[LamportsSpaceTag::SpaceOnly.wire_byte()])?;
                write_u64(writer, *lamports)?;
                write_value(writer, *space)
            }
            Self::Both { lamports, space } => {
                writer.write_all(&[LamportsSpaceTag::Both.wire_byte()])?;
                write_value(writer, *lamports)?;
                write_value(writer, *space)
            }
        }
    }

    pub(crate) fn deserialize_wire(buf: &mut &[u8]) -> IoResult<Self> {
        if buf.is_empty() {
            return Err(invalid_payload());
        }
        let tag = LamportsSpaceTag::from_wire(buf[0])?;
        *buf = &buf[1..];
        match tag {
            LamportsSpaceTag::LamportsOnly => {
                let lamports = read_value(buf)?;
                let space = read_u64(buf)?;
                Ok(Self::LamportsOnly { lamports, space })
            }
            LamportsSpaceTag::SpaceOnly => {
                let lamports = read_u64(buf)?;
                let space = read_value(buf)?;
                Ok(Self::SpaceOnly { lamports, space })
            }
            LamportsSpaceTag::Both => {
                let lamports = read_value(buf)?;
                let space = read_value(buf)?;
                Ok(Self::Both { lamports, space })
            }
        }
    }
}

impl AmountDecimalsPatch {
    pub(crate) fn append_log_bindings(&self, sink: &mut impl PatchLogSink) -> bool {
        match self {
            Self::AmountOnly { amount, .. } => sink.patch_binding("amount", *amount),
            Self::Both { amount, decimals } => {
                sink.patch_binding("amount", *amount)
                    && sink.patch_binding("decimals", *decimals)
            }
            Self::DecimalsOnly { decimals, .. } => sink.patch_binding("decimals", *decimals),
        }
    }

    pub(crate) fn serialize_wire<W: Write>(&self, writer: &mut W) -> IoResult<()> {
        match self {
            Self::AmountOnly { amount, decimals } => {
                writer.write_all(&[AmountDecimalsTag::AmountOnly.wire_byte()])?;
                write_value(writer, *amount)?;
                writer.write_all(&[*decimals])
            }
            Self::Both { amount, decimals } => {
                writer.write_all(&[AmountDecimalsTag::Both.wire_byte()])?;
                write_value(writer, *amount)?;
                write_value(writer, *decimals)
            }
            Self::DecimalsOnly { amount, decimals } => {
                writer.write_all(&[AmountDecimalsTag::DecimalsOnly.wire_byte()])?;
                write_u64(writer, *amount)?;
                write_value(writer, *decimals)
            }
        }
    }

    pub(crate) fn deserialize_wire(buf: &mut &[u8]) -> IoResult<Self> {
        if buf.is_empty() {
            return Err(invalid_payload());
        }
        let tag = AmountDecimalsTag::from_wire(buf[0])?;
        *buf = &buf[1..];
        match tag {
            AmountDecimalsTag::AmountOnly => {
                if buf.len() < 2 {
                    return Err(invalid_payload());
                }
                let amount = Value { index: buf[0] };
                let decimals = buf[1];
                *buf = &buf[2..];
                Ok(Self::AmountOnly { amount, decimals })
            }
            AmountDecimalsTag::Both => {
                if buf.len() < 2 {
                    return Err(invalid_payload());
                }
                let amount = Value { index: buf[0] };
                let decimals = Value { index: buf[1] };
                *buf = &buf[2..];
                Ok(Self::Both { amount, decimals })
            }
            AmountDecimalsTag::DecimalsOnly => {
                let amount = read_u64(buf)?;
                let decimals = read_value(buf)?;
                Ok(Self::DecimalsOnly { amount, decimals })
            }
        }
    }
}

impl AmountDecimalsFeePatch {
    pub(crate) fn append_log_bindings(&self, sink: &mut impl PatchLogSink) -> bool {
        match self {
            Self::AmountOnly { amount, .. } => sink.patch_binding("amount", *amount),
            Self::DecimalsOnly { decimals, .. } => sink.patch_binding("decimals", *decimals),
            Self::FeeOnly { fee, .. } => sink.patch_binding("fee", *fee),
            Self::AmountDecimals { amount, decimals, .. } => {
                sink.patch_binding("amount", *amount)
                    && sink.patch_binding("decimals", *decimals)
            }
            Self::AmountFee { amount, fee, .. } => {
                sink.patch_binding("amount", *amount) && sink.patch_binding("fee", *fee)
            }
            Self::DecimalsFee { decimals, fee, .. } => {
                sink.patch_binding("decimals", *decimals) && sink.patch_binding("fee", *fee)
            }
            Self::AllFromFrame {
                amount,
                decimals,
                fee,
            } => sink.patch_binding("amount", *amount)
                && sink.patch_binding("decimals", *decimals)
                && sink.patch_binding("fee", *fee),
        }
    }

    pub(crate) fn serialize_wire<W: Write>(&self, writer: &mut W) -> IoResult<()> {
        match self {
            Self::AmountOnly {
                amount,
                decimals,
                fee,
            } => {
                writer.write_all(&[AmountDecimalsFeeTag::AmountOnly.wire_byte()])?;
                write_value(writer, *amount)?;
                writer.write_all(&[*decimals])?;
                write_u64(writer, *fee)
            }
            Self::DecimalsOnly {
                amount,
                decimals,
                fee,
            } => {
                writer.write_all(&[AmountDecimalsFeeTag::DecimalsOnly.wire_byte()])?;
                write_u64(writer, *amount)?;
                write_value(writer, *decimals)?;
                write_u64(writer, *fee)
            }
            Self::FeeOnly {
                amount,
                decimals,
                fee,
            } => {
                writer.write_all(&[AmountDecimalsFeeTag::FeeOnly.wire_byte()])?;
                write_u64(writer, *amount)?;
                writer.write_all(&[*decimals])?;
                write_value(writer, *fee)
            }
            Self::AmountDecimals {
                amount,
                decimals,
                fee,
            } => {
                writer.write_all(&[AmountDecimalsFeeTag::AmountDecimals.wire_byte()])?;
                write_value(writer, *amount)?;
                write_value(writer, *decimals)?;
                write_u64(writer, *fee)
            }
            Self::AmountFee {
                amount,
                decimals,
                fee,
            } => {
                writer.write_all(&[AmountDecimalsFeeTag::AmountFee.wire_byte()])?;
                write_value(writer, *amount)?;
                writer.write_all(&[*decimals])?;
                write_value(writer, *fee)
            }
            Self::DecimalsFee {
                amount,
                decimals,
                fee,
            } => {
                writer.write_all(&[AmountDecimalsFeeTag::DecimalsFee.wire_byte()])?;
                write_u64(writer, *amount)?;
                write_value(writer, *decimals)?;
                write_value(writer, *fee)
            }
            Self::AllFromFrame {
                amount,
                decimals,
                fee,
            } => {
                writer.write_all(&[AmountDecimalsFeeTag::AllFromFrame.wire_byte()])?;
                write_value(writer, *amount)?;
                write_value(writer, *decimals)?;
                write_value(writer, *fee)
            }
        }
    }

    pub(crate) fn deserialize_wire(buf: &mut &[u8]) -> IoResult<Self> {
        if buf.is_empty() {
            return Err(invalid_payload());
        }
        let tag = AmountDecimalsFeeTag::from_wire(buf[0])?;
        *buf = &buf[1..];
        match tag {
            AmountDecimalsFeeTag::AmountOnly => {
                if buf.len() < 10 {
                    return Err(invalid_payload());
                }
                let amount = Value { index: buf[0] };
                let decimals = buf[1];
                let fee = read_u64(&mut &buf[2..])?;
                *buf = &buf[10..];
                Ok(Self::AmountOnly {
                    amount,
                    decimals,
                    fee,
                })
            }
            AmountDecimalsFeeTag::DecimalsOnly => {
                let amount = read_u64(buf)?;
                if buf.len() < 9 {
                    return Err(invalid_payload());
                }
                let decimals = Value { index: buf[0] };
                let fee = read_u64(&mut &buf[1..])?;
                *buf = &buf[9..];
                Ok(Self::DecimalsOnly {
                    amount,
                    decimals,
                    fee,
                })
            }
            AmountDecimalsFeeTag::FeeOnly => {
                if buf.len() < 10 {
                    return Err(invalid_payload());
                }
                let amount = read_u64(buf)?;
                let decimals = buf[8];
                let fee = Value { index: buf[9] };
                *buf = &buf[10..];
                Ok(Self::FeeOnly {
                    amount,
                    decimals,
                    fee,
                })
            }
            AmountDecimalsFeeTag::AmountDecimals => {
                if buf.len() < 10 {
                    return Err(invalid_payload());
                }
                let amount = Value { index: buf[0] };
                let decimals = Value { index: buf[1] };
                let fee = read_u64(&mut &buf[2..])?;
                *buf = &buf[10..];
                Ok(Self::AmountDecimals {
                    amount,
                    decimals,
                    fee,
                })
            }
            AmountDecimalsFeeTag::AmountFee => {
                if buf.len() < 3 {
                    return Err(invalid_payload());
                }
                let amount = Value { index: buf[0] };
                let decimals = buf[1];
                let fee = Value { index: buf[2] };
                *buf = &buf[3..];
                Ok(Self::AmountFee {
                    amount,
                    decimals,
                    fee,
                })
            }
            AmountDecimalsFeeTag::DecimalsFee => {
                if buf.len() < 10 {
                    return Err(invalid_payload());
                }
                let amount = read_u64(buf)?;
                let decimals = Value { index: buf[8] };
                let fee = Value { index: buf[9] };
                *buf = &buf[10..];
                Ok(Self::DecimalsFee {
                    amount,
                    decimals,
                    fee,
                })
            }
            AmountDecimalsFeeTag::AllFromFrame => {
                if buf.len() < 3 {
                    return Err(invalid_payload());
                }
                let amount = Value { index: buf[0] };
                let decimals = Value { index: buf[1] };
                let fee = Value { index: buf[2] };
                *buf = &buf[3..];
                Ok(Self::AllFromFrame {
                    amount,
                    decimals,
                    fee,
                })
            }
        }
    }
}

impl SetTransferFeePatch {
    pub(crate) fn append_log_bindings(&self, sink: &mut impl PatchLogSink) -> bool {
        match self {
            Self::BpsOnly { basis_points, .. } => sink.patch_binding("basis_points", *basis_points),
            Self::MaxOnly { maximum_fee, .. } => sink.patch_binding("maximum_fee", *maximum_fee),
            Self::Both {
                basis_points,
                maximum_fee,
            } => sink.patch_binding("basis_points", *basis_points)
                && sink.patch_binding("maximum_fee", *maximum_fee),
        }
    }

    pub(crate) fn serialize_wire<W: Write>(&self, writer: &mut W) -> IoResult<()> {
        match self {
            Self::BpsOnly {
                basis_points,
                maximum_fee,
            } => {
                writer.write_all(&[SetTransferFeeTag::BpsOnly.wire_byte()])?;
                write_value(writer, *basis_points)?;
                write_u64(writer, *maximum_fee)
            }
            Self::MaxOnly {
                basis_points,
                maximum_fee,
            } => {
                writer.write_all(&[SetTransferFeeTag::MaxOnly.wire_byte()])?;
                writer.write_all(&basis_points.to_le_bytes())?;
                write_value(writer, *maximum_fee)
            }
            Self::Both {
                basis_points,
                maximum_fee,
            } => {
                writer.write_all(&[SetTransferFeeTag::Both.wire_byte()])?;
                write_value(writer, *basis_points)?;
                write_value(writer, *maximum_fee)
            }
        }
    }

    pub(crate) fn deserialize_wire(buf: &mut &[u8]) -> IoResult<Self> {
        if buf.is_empty() {
            return Err(invalid_payload());
        }
        let tag = SetTransferFeeTag::from_wire(buf[0])?;
        *buf = &buf[1..];
        match tag {
            SetTransferFeeTag::BpsOnly => {
                if buf.len() < 9 {
                    return Err(invalid_payload());
                }
                let basis_points = Value { index: buf[0] };
                let maximum_fee = read_u64(&mut &buf[1..])?;
                *buf = &buf[9..];
                Ok(Self::BpsOnly {
                    basis_points,
                    maximum_fee,
                })
            }
            SetTransferFeeTag::MaxOnly => {
                if buf.len() < 3 {
                    return Err(invalid_payload());
                }
                let basis_points = u16::from_le_bytes([buf[0], buf[1]]);
                let maximum_fee = Value { index: buf[2] };
                *buf = &buf[3..];
                Ok(Self::MaxOnly {
                    basis_points,
                    maximum_fee,
                })
            }
            SetTransferFeeTag::Both => {
                if buf.len() < 2 {
                    return Err(invalid_payload());
                }
                let basis_points = Value { index: buf[0] };
                let maximum_fee = Value { index: buf[1] };
                *buf = &buf[2..];
                Ok(Self::Both {
                    basis_points,
                    maximum_fee,
                })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn amount_decimals_both_roundtrip() {
        let patch = AmountDecimalsPatch::Both {
            amount: Value { index: 3 },
            decimals: Value { index: 7 },
        };
        let mut wire = Vec::new();
        patch.serialize_wire(&mut wire).unwrap();
        assert_eq!(wire[0], AmountDecimalsTag::Both as u8);
        let mut slice = wire.as_slice();
        let back = AmountDecimalsPatch::deserialize_wire(&mut slice).unwrap();
        assert_eq!(back, patch);
        assert!(slice.is_empty());
    }

    #[test]
    fn initialize_mint_freeze_some_roundtrip() {
        let mint_auth = [7u8; 32];
        let freeze_pk = [9u8; 32];
        let patch = InitializeMintPatch {
            decimals: Value { index: 2 },
            mint_authority: PubkeyValue::Literal(mint_auth),
            freeze: FreezeAuthPatch::SomeLiteral(freeze_pk),
        };
        let mut wire = Vec::new();
        write_initialize_mint_patch(&mut wire, &patch).unwrap();
        assert_eq!(wire.len(), 1 + 1 + 32 + 1 + 32);
        assert_eq!(wire[34], FreezeAuthTag::SomeLiteral as u8);
        let mut slice = wire.as_slice();
        let back = read_initialize_mint_patch(&mut slice).unwrap();
        assert_eq!(back, patch);
        assert!(slice.is_empty());
    }
}
