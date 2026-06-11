//! Structured CPI nested patch payloads — Borsh enums nested in [`StructuredCpiPatch`](super::structured_cpi_patch::StructuredCpiPatch).

use borsh::{BorshDeserialize, BorshSerialize};

use super::value::Value;

/// Append structured CPI patch fields that come from Frame bindings (`Value`).
pub trait PatchLogSink {
    /// One segment: ` patch field <- $N` (comma-separated after the first).
    fn patch_binding(&mut self, field: &'static str, source: Value) -> bool;
}

/// `TransferChecked`-family: which slots come from Frame vs wire literals.
#[derive(BorshSerialize, BorshDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum AmountDecimalsPatch {
    /// Amount from Frame; **decimals** literal (`u8` on wire).
    AmountOnly { amount: Value, decimals: u8 },
    /// Both **amount** and **decimals** from Frame.
    Both { amount: Value, decimals: Value },
    /// **Amount** literal (`u64`); decimals from Frame.
    DecimalsOnly { amount: u64, decimals: Value },
}

/// `CreateAccount`: lamports / space combinations (all-const forbidden → use Static CPI).
#[derive(BorshSerialize, BorshDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum LamportsSpacePatch {
    /// Lamports from Frame; **space** literal (`u64`).
    LamportsOnly { lamports: Value, space: u64 },
    /// **Lamports** literal; space from Frame.
    SpaceOnly { lamports: u64, space: Value },
    /// Both lamports and space from Frame.
    Both { lamports: Value, space: Value },
}

/// Token-2022 `TransferCheckedWithFee` — at least one slot from Frame.
#[derive(BorshSerialize, BorshDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
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
#[derive(BorshSerialize, BorshDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum SetTransferFeePatch {
    /// **basis_points** from Frame; **maximum_fee** literal.
    BpsOnly { basis_points: Value, maximum_fee: u64 },
    /// basis_points literal; **maximum_fee** from Frame.
    MaxOnly { basis_points: u16, maximum_fee: Value },
    /// Both basis_points and maximum_fee from Frame.
    Both { basis_points: Value, maximum_fee: Value },
}

/// Pubkey field: Frame binding or wire literal (literal has no ALT).
#[derive(BorshSerialize, BorshDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum PubkeyValue {
    /// 32-byte pubkey read from Frame (`AccountKey` / `ConstPubkey` binding).
    FromFrame(Value),
    /// Fixed 32-byte pubkey embedded in patch wire.
    Literal([u8; 32]),
}

/// Freeze authority value for InitializeMint-family patches.
#[derive(BorshSerialize, BorshDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum FreezeAuthPatch {
    /// No freeze authority (`COption::None`).
    None,
    /// Freeze pubkey from Frame binding.
    SomeValue(Value),
    /// Fixed 32-byte freeze pubkey on wire.
    SomeLiteral([u8; 32]),
}

/// SPL `InitializeMint*` — dynamic `decimals`; optional freeze via [`FreezeAuthPatch`].
#[derive(BorshSerialize, BorshDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
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
    pub fn append_log_bindings(&self, sink: &mut impl PatchLogSink) -> bool {
        sink.patch_binding("decimals", self.decimals)
            && append_pubkey_value_log(sink, "mint_authority", &self.mint_authority)
            && append_freeze_auth_log(sink, &self.freeze)
    }
}

impl LamportsSpacePatch {
    pub fn append_log_bindings(&self, sink: &mut impl PatchLogSink) -> bool {
        match self {
            Self::LamportsOnly { lamports, .. } => sink.patch_binding("lamports", *lamports),
            Self::SpaceOnly { space, .. } => sink.patch_binding("space", *space),
            Self::Both { lamports, space } => {
                sink.patch_binding("lamports", *lamports)
                    && sink.patch_binding("space", *space)
            }
        }
    }
}

impl AmountDecimalsPatch {
    pub fn append_log_bindings(&self, sink: &mut impl PatchLogSink) -> bool {
        match self {
            Self::AmountOnly { amount, .. } => sink.patch_binding("amount", *amount),
            Self::Both { amount, decimals } => {
                sink.patch_binding("amount", *amount)
                    && sink.patch_binding("decimals", *decimals)
            }
            Self::DecimalsOnly { decimals, .. } => sink.patch_binding("decimals", *decimals),
        }
    }
}

impl AmountDecimalsFeePatch {
    pub fn append_log_bindings(&self, sink: &mut impl PatchLogSink) -> bool {
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
}

impl SetTransferFeePatch {
    pub fn append_log_bindings(&self, sink: &mut impl PatchLogSink) -> bool {
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
}

#[cfg(test)]
mod tests {
    use super::*;

    use borsh::BorshSerialize;

    fn encode_patch<T: BorshSerialize>(patch: &T) -> Vec<u8> {
        borsh::to_vec(patch).unwrap()
    }

    #[test]
    fn amount_decimals_both_borsh_roundtrip() {
        let patch = AmountDecimalsPatch::Both {
            amount: Value { index: 3 },
            decimals: Value { index: 7 },
        };
        let wire = encode_patch(&patch);
        let back: AmountDecimalsPatch = borsh::from_slice(&wire).unwrap();
        assert_eq!(back, patch);
    }

    #[test]
    fn initialize_mint_freeze_some_borsh_roundtrip() {
        let mint_auth = [7u8; 32];
        let freeze_pk = [9u8; 32];
        let patch = InitializeMintPatch {
            decimals: Value { index: 2 },
            mint_authority: PubkeyValue::Literal(mint_auth),
            freeze: FreezeAuthPatch::SomeLiteral(freeze_pk),
        };
        let wire = encode_patch(&patch);
        let back: InitializeMintPatch = borsh::from_slice(&wire).unwrap();
        assert_eq!(back, patch);
    }
}
