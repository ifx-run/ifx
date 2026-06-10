//! Unified structured CPI patch — one Borsh enum per official ix layout.
//!
//! Nested inside [`super::Cpi::Structured`] after `accounts_start` / `accounts_len`.
//! Variant order is the wire discriminant (`0`–`28`) — see SDK `STRUCTURED_CPI_PATCH_WIRE`.

use anchor_lang::prelude::*;
use borsh::{BorshDeserialize, BorshSerialize};

use super::structured_cpi_payload::{
    AmountDecimalsFeePatch, AmountDecimalsPatch, InitializeMintPatch, LamportsSpacePatch,
    PatchLogSink, SetTransferFeePatch,
};
use super::types::Value;

/// Official-program CPI patch: ix variant + typed payload (cannot mismatch at compile time).
#[derive(BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum StructuredCpiPatch {
    // ── System Program ────────────────────────────────────────────────────
    /// System `Transfer` (discriminator 2): dynamic **lamports** (`u64` @ offset 4).
    SystemTransfer { lamports: Value },
    /// System `CreateAccount` (0): dynamic **lamports** and/or **space** via [`LamportsSpacePatch`].
    SystemCreateAccount(LamportsSpacePatch),
    /// System `Allocate` (8): dynamic **space** (`u32` @ offset 4).
    SystemAllocate { space: Value },

    // ── SPL Token (legacy) ────────────────────────────────────────────────
    /// SPL Token `Transfer` (3): dynamic **amount** (`u64` @ 1).
    TokenTransfer { amount: Value },
    /// SPL Token `Approve` (4): dynamic **amount** (`u64` @ 1).
    TokenApprove { amount: Value },
    /// SPL Token `MintTo` (7): dynamic **amount** (`u64` @ 1).
    TokenMintTo { amount: Value },
    /// SPL Token `Burn` (8): dynamic **amount** (`u64` @ 1).
    TokenBurn { amount: Value },
    /// SPL Token `TransferChecked` (12): **amount** / **decimals** via [`AmountDecimalsPatch`].
    TokenTransferChecked(AmountDecimalsPatch),
    /// SPL Token `ApproveChecked` (13): **amount** / **decimals** via [`AmountDecimalsPatch`].
    TokenApproveChecked(AmountDecimalsPatch),
    /// SPL Token `MintToChecked` (14): **amount** / **decimals** via [`AmountDecimalsPatch`].
    TokenMintToChecked(AmountDecimalsPatch),
    /// SPL Token `BurnChecked` (15): **amount** / **decimals** via [`AmountDecimalsPatch`].
    TokenBurnChecked(AmountDecimalsPatch),
    /// SPL Token `AmountToUiAmount` (23): dynamic **amount** (`u64` @ 1).
    TokenAmountToUiAmount { amount: Value },
    /// SPL Token `InitializeMint` (0): [`InitializeMintPatch`] (decimals, mint authority, freeze).
    TokenInitializeMint(InitializeMintPatch),
    /// SPL Token `InitializeMint2` (20): [`InitializeMintPatch`] (no rent sysvar in ix).
    TokenInitializeMint2(InitializeMintPatch),
    /// SPL Token `InitializeMultisig` (2): dynamic **m** (`u8` @ 1).
    TokenInitializeMultisig { m: Value },

    // ── SPL Token-2022 ────────────────────────────────────────────────────
    /// Token-2022 `Transfer` (3): dynamic **amount** (`u64` @ 1).
    Token2022Transfer { amount: Value },
    /// Token-2022 `Approve` (4): dynamic **amount** (`u64` @ 1).
    Token2022Approve { amount: Value },
    /// Token-2022 `MintTo` (7): dynamic **amount** (`u64` @ 1).
    Token2022MintTo { amount: Value },
    /// Token-2022 `Burn` (8): dynamic **amount** (`u64` @ 1).
    Token2022Burn { amount: Value },
    /// Token-2022 `TransferChecked` (12): **amount** / **decimals** via [`AmountDecimalsPatch`].
    Token2022TransferChecked(AmountDecimalsPatch),
    /// Token-2022 `ApproveChecked` (13): **amount** / **decimals** via [`AmountDecimalsPatch`].
    Token2022ApproveChecked(AmountDecimalsPatch),
    /// Token-2022 `MintToChecked` (14): **amount** / **decimals** via [`AmountDecimalsPatch`].
    Token2022MintToChecked(AmountDecimalsPatch),
    /// Token-2022 `BurnChecked` (15): **amount** / **decimals** via [`AmountDecimalsPatch`].
    Token2022BurnChecked(AmountDecimalsPatch),
    /// Token-2022 `AmountToUiAmount` (23): dynamic **amount** (`u64` @ 1).
    Token2022AmountToUiAmount { amount: Value },
    /// Token-2022 `InitializeMint` (0): [`InitializeMintPatch`].
    Token2022InitializeMint(InitializeMintPatch),
    /// Token-2022 `InitializeMint2` (20): [`InitializeMintPatch`].
    Token2022InitializeMint2(InitializeMintPatch),
    /// Token-2022 `InitializeMultisig` (2): dynamic **m** (`u8` @ 1).
    Token2022InitializeMultisig { m: Value },
    /// Token-2022 TransferFee `TransferCheckedWithFee` (1): [`AmountDecimalsFeePatch`].
    Token2022TransferCheckedWithFee(AmountDecimalsFeePatch),
    /// Token-2022 TransferFee `SetTransferFee` (5): [`SetTransferFeePatch`].
    Token2022SetTransferFee(SetTransferFeePatch),
}

impl StructuredCpiPatch {
    pub const COUNT: u8 = 29;

    pub fn log_label(&self) -> &'static str {
        match self {
            Self::SystemTransfer { .. } => "system:transfer",
            Self::SystemCreateAccount(_) => "system:create_account",
            Self::SystemAllocate { .. } => "system:allocate",
            Self::TokenTransfer { .. } => "token:transfer",
            Self::TokenApprove { .. } => "token:approve",
            Self::TokenMintTo { .. } => "token:mint_to",
            Self::TokenBurn { .. } => "token:burn",
            Self::TokenTransferChecked(_) => "token:transfer_checked",
            Self::TokenApproveChecked(_) => "token:approve_checked",
            Self::TokenMintToChecked(_) => "token:mint_to_checked",
            Self::TokenBurnChecked(_) => "token:burn_checked",
            Self::TokenAmountToUiAmount { .. } => "token:amount_to_ui_amount",
            Self::TokenInitializeMint(_) => "token:initialize_mint",
            Self::TokenInitializeMint2(_) => "token:initialize_mint2",
            Self::TokenInitializeMultisig { .. } => "token:initialize_multisig",
            Self::Token2022Transfer { .. } => "token2022:transfer",
            Self::Token2022Approve { .. } => "token2022:approve",
            Self::Token2022MintTo { .. } => "token2022:mint_to",
            Self::Token2022Burn { .. } => "token2022:burn",
            Self::Token2022TransferChecked(_) => "token2022:transfer_checked",
            Self::Token2022ApproveChecked(_) => "token2022:approve_checked",
            Self::Token2022MintToChecked(_) => "token2022:mint_to_checked",
            Self::Token2022BurnChecked(_) => "token2022:burn_checked",
            Self::Token2022AmountToUiAmount { .. } => "token2022:amount_to_ui_amount",
            Self::Token2022InitializeMint(_) => "token2022:initialize_mint",
            Self::Token2022InitializeMint2(_) => "token2022:initialize_mint2",
            Self::Token2022InitializeMultisig { .. } => "token2022:initialize_multisig",
            Self::Token2022TransferCheckedWithFee(_) => "token2022:transfer_checked_with_fee",
            Self::Token2022SetTransferFee(_) => "token2022:set_transfer_fee",
        }
    }

    /// Append ` patch field <- $N` for Frame-bound slots (literals omitted).
    pub fn append_log_bindings(&self, sink: &mut impl PatchLogSink) -> bool {
        match self {
            Self::SystemTransfer { lamports } => sink.patch_binding("lamports", *lamports),
            Self::SystemCreateAccount(shape) => shape.append_log_bindings(sink),
            Self::SystemAllocate { space } => sink.patch_binding("space", *space),
            Self::TokenTransfer { amount }
            | Self::TokenApprove { amount }
            | Self::TokenMintTo { amount }
            | Self::TokenBurn { amount }
            | Self::TokenAmountToUiAmount { amount }
            | Self::Token2022Transfer { amount }
            | Self::Token2022Approve { amount }
            | Self::Token2022MintTo { amount }
            | Self::Token2022Burn { amount }
            | Self::Token2022AmountToUiAmount { amount } => sink.patch_binding("amount", *amount),
            Self::TokenTransferChecked(shape)
            | Self::TokenApproveChecked(shape)
            | Self::TokenMintToChecked(shape)
            | Self::TokenBurnChecked(shape)
            | Self::Token2022TransferChecked(shape)
            | Self::Token2022ApproveChecked(shape)
            | Self::Token2022MintToChecked(shape)
            | Self::Token2022BurnChecked(shape) => shape.append_log_bindings(sink),
            Self::TokenInitializeMultisig { m } | Self::Token2022InitializeMultisig { m } => {
                sink.patch_binding("m", *m)
            }
            Self::Token2022TransferCheckedWithFee(shape) => shape.append_log_bindings(sink),
            Self::Token2022SetTransferFee(shape) => shape.append_log_bindings(sink),
            Self::TokenInitializeMint(shape)
            | Self::TokenInitializeMint2(shape)
            | Self::Token2022InitializeMint(shape)
            | Self::Token2022InitializeMint2(shape) => shape.append_log_bindings(sink),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::structured_cpi_payload::AmountDecimalsPatch;

    #[test]
    fn patch_count_unchanged() {
        assert_eq!(StructuredCpiPatch::COUNT, 29);
    }

    use borsh::BorshSerialize;

    fn encode_patch<T: BorshSerialize>(patch: &T) -> Vec<u8> {
        borsh::to_vec(patch).unwrap()
    }

    #[test]
    fn transfer_checked_borsh_roundtrip() {
        let patch = StructuredCpiPatch::TokenTransferChecked(
            AmountDecimalsPatch::AmountOnly {
                amount: Value { index: 3 },
                decimals: 9,
            },
        );
        let wire = encode_patch(&patch);
        let back: StructuredCpiPatch = borsh::from_slice(&wire).unwrap();
        assert_eq!(back, patch);
    }

    struct TestLogSink {
        line: String,
        first: bool,
    }

    impl PatchLogSink for TestLogSink {
        fn patch_binding(&mut self, field: &'static str, source: Value) -> bool {
            if !self.first {
                self.line.push_str(", patch ");
            } else {
                self.line.push_str(" patch ");
            }
            self.first = false;
            self.line
                .push_str(&format!("{field} <- ${}", source.index));
            true
        }
    }

    #[test]
    fn append_log_bindings_amount_only() {
        let patch = StructuredCpiPatch::TokenTransferChecked(AmountDecimalsPatch::AmountOnly {
            amount: Value { index: 0 },
            decimals: 9,
        });
        let mut sink = TestLogSink {
            line: String::new(),
            first: true,
        };
        assert!(patch.append_log_bindings(&mut sink));
        assert_eq!(sink.line, " patch amount <- $0");
    }

    #[test]
    fn append_log_bindings_amount_and_decimals() {
        let patch = StructuredCpiPatch::TokenTransferChecked(AmountDecimalsPatch::Both {
            amount: Value { index: 0 },
            decimals: Value { index: 1 },
        });
        let mut sink = TestLogSink {
            line: String::new(),
            first: true,
        };
        assert!(patch.append_log_bindings(&mut sink));
        assert_eq!(sink.line, " patch amount <- $0, patch decimals <- $1");
    }
}
