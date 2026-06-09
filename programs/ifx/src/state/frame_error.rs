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

    AuthorityField = 201,
    AuthorityPubkey = 202,

    ReadCursor = 301,
    ReadIndexCount = 302,
    ReadGeneration = 303,
    WriteCursor = 304,
    WriteIndexCount = 305,
    WriteGeneration = 306,
    PayloadAtIndexOverflow = 307,
    ReadPayloadAt = 308,
    WritePayloadAt = 309,
    TapeField = 310,
    TapeMutField = 311,
    TapeRangeAddOverflow = 312,
    TapeRangeOob = 313,
    TapeRangeMutAddOverflow = 314,
    TapeRangeMutOob = 315,

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
