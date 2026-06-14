//! Ifx instruction discriminator decode (inspection / debugging).

use crate::constants::{
    IX_DISC_ASSERT, IX_DISC_ASSERT_MULTI, IX_DISC_CLOSE_FRAME, IX_DISC_CREATE_FRAME,
    IX_DISC_IF_ELSE, IX_DISC_LET, IX_DISC_PATCHED_CPI, IX_DISC_RESET_FRAME,
};
use crate::error::ScratchError;

/// On-chain Ifx instruction name for a 1-byte discriminator.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum IfxIxName {
    CreateFrame,
    CloseFrame,
    ResetFrame,
    Let,
    Assert,
    AssertMulti,
    PatchedCpi,
    IfElse,
}

impl IfxIxName {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::CreateFrame => "ifx_create_frame",
            Self::CloseFrame => "ifx_close_frame",
            Self::ResetFrame => "ifx_reset_frame",
            Self::Let => "ifx_let",
            Self::Assert => "ifx_assert",
            Self::AssertMulti => "ifx_assert_multi",
            Self::PatchedCpi => "ifx_patched_cpi",
            Self::IfElse => "ifx_if_else",
        }
    }
}

/// Decoded Ifx instruction header (args not fully deserialized).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DecodedIfxInstruction {
    pub name: IfxIxName,
    pub discriminator: u8,
    pub data: Vec<u8>,
    pub payload: Vec<u8>,
}

pub fn decode_ifx_instruction(data: &[u8]) -> Result<DecodedIfxInstruction, ScratchError> {
    let disc = *data.first().ok_or_else(|| ScratchError::Encode("ifx instruction data is empty".into()))?;
    let name = match disc {
        IX_DISC_CREATE_FRAME => IfxIxName::CreateFrame,
        IX_DISC_CLOSE_FRAME => IfxIxName::CloseFrame,
        IX_DISC_RESET_FRAME => IfxIxName::ResetFrame,
        IX_DISC_LET => IfxIxName::Let,
        IX_DISC_ASSERT => IfxIxName::Assert,
        IX_DISC_ASSERT_MULTI => IfxIxName::AssertMulti,
        IX_DISC_PATCHED_CPI => IfxIxName::PatchedCpi,
        IX_DISC_IF_ELSE => IfxIxName::IfElse,
        _ => {
            return Err(ScratchError::Encode(format!(
                "unknown Ifx instruction discriminator: {disc}"
            )))
        }
    };
    Ok(DecodedIfxInstruction {
        name,
        discriminator: disc,
        data: data.to_vec(),
        payload: data[1..].to_vec(),
    })
}

pub fn ifx_ix_hint(data: &[u8]) -> Option<&'static str> {
    decode_ifx_instruction(data)
        .ok()
        .map(|d| d.name.as_str())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decode_let_ix() {
        let dec = decode_ifx_instruction(&[IX_DISC_LET, 1, 2]).unwrap();
        assert_eq!(dec.name, IfxIxName::Let);
        assert_eq!(dec.payload, &[1, 2]);
        assert_eq!(ifx_ix_hint(&[IX_DISC_RESET_FRAME]), Some("ifx_reset_frame"));
    }
}
