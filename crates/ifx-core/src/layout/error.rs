//! Layout / codec errors (mapped to on-chain `ErrorCode` in the program).

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LayoutError {
    InvalidValueTypeTag,
    TypeMismatch,
    TapeOutOfBounds,
    UnsupportedUnaryOp,
    UnsupportedBinaryOp,
    InvalidValueIndex,
}
