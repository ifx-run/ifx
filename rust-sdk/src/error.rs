//! Planner / ix builder errors.

use std::fmt;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ScratchError {
    IndexCapReached { index: u8, cap: u16 },
    TapeExceeded { end_cursor: u32, tape_len: u32, record_len: u32 },
    InvalidTapeLen,
    InvalidFrameId,
    BindingType(String),
    Encode(String),
    /// Frame account decode failed (integration / debug only).
    FrameDecode(String),
    /// Frame tape read failed (integration / debug only).
    FrameRead(String),
}

impl fmt::Display for ScratchError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IndexCapReached { index, cap } => {
                write!(
                    f,
                    "scratch binding index cap reached ({index} >= {cap}); use a larger frame tape"
                )
            }
            Self::TapeExceeded {
                end_cursor,
                tape_len,
                record_len,
            } => write!(
                f,
                "scratch would exceed tape ({end_cursor} > {tape_len}); need +{record_len} B per binding"
            ),
            Self::InvalidTapeLen => write!(f, "tape_len out of range"),
            Self::InvalidFrameId => write!(f, "frame_id must be 32 bytes"),
            Self::BindingType(msg) => write!(f, "{msg}"),
            Self::Encode(msg) => write!(f, "encode failed: {msg}"),
            Self::FrameDecode(msg) => write!(f, "frame decode: {msg}"),
            Self::FrameRead(msg) => write!(f, "frame read: {msg}"),
        }
    }
}

impl std::error::Error for ScratchError {}
