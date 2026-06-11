//! Structured CPI assembly errors (mapped to on-chain `ErrorCode` in the program).

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum StructuredCpiError {
    InvalidProgram,
    LoadTypeMismatch,
    FrameRead,
}
