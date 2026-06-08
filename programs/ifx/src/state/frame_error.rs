//! Internal frame errors: [`FrameSite`] discriminant for unit tests; on-chain still uses [`ErrorCode`] only.
use anchor_lang::prelude::*;

use crate::error::ErrorCode;

/// Stable tag for tests / future opt-in logging (not a separate on-chain error code).
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
#[repr(u16)]
pub enum FrameSite {
    ParseMinLen = 101,
    ParseDiscriminator = 102,
    ParseIndexCap = 103,
    ParsePayloadAtLen = 104,
    ParsePayloadAtLenMismatch = 105,
    ParseTapeLenOffOverflow = 106,
    ParseTapeLenPrefix = 107,
    ParseTapeOffOverflow = 108,
    ParseTotalLenOverflow = 109,
    ParseTotalLenMismatch = 110,

    CloseAuthorityField = 201,
    CloseAuthorityPubkey = 202,

    ReadCursor = 301,
    ReadIndexCount = 302,
    WriteCursor = 303,
    WriteIndexCount = 304,
    PayloadAtIndexOverflow = 305,
    ReadPayloadAt = 306,
    WritePayloadAt = 307,
    TapeField = 308,
    TapeMutField = 309,
    TapeRangeAddOverflow = 310,
    TapeRangeOob = 311,
    TapeRangeMutAddOverflow = 312,
    TapeRangeMutOob = 313,

    RefLayoutMismatch = 401,
    MutLayoutMismatch = 402,
    BindingIndexRange = 403,
    ReadTypePayZero = 404,
    ReadTypeTyUnderflow = 405,
    ReadTypeTagByte = 406,
    ReadBytesTypeMismatch = 407,
    AppendInputLen = 409,
    AppendIndexCap = 410,
    AppendPlanEnd = 411,
    AppendTapeCapacity = 412,
    AppendTypeTag = 413,
    AppendPayloadAt = 415,
    AppendCursor = 416,
    AppendIndexCount = 417,
    AppendIndexU8 = 418,
}

#[derive(Copy, Clone, Debug, PartialEq)]
pub struct FrameError {
    pub site: FrameSite,
    pub code: ErrorCode,
}

pub type FrameLayoutResult<T> = core::result::Result<T, FrameError>;

impl FrameError {
    pub const fn new(site: FrameSite, code: ErrorCode) -> Self {
        Self { site, code }
    }
}

impl From<FrameError> for Error {
    fn from(e: FrameError) -> Self {
        e.code.into()
    }
}

#[macro_export]
macro_rules! frame_require {
    ($site:expr, $cond:expr, $code:expr $(,)?) => {
        if !$cond {
            return Err($crate::state::frame_error::FrameError::new($site, $code));
        }
    };
}
