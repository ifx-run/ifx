"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IFX_ERROR = exports.IFX_ERROR_CODE_BASE = void 0;
exports.ifxErrorName = ifxErrorName;
exports.isIfxErrorCode = isIfxErrorCode;
exports.ifxErrorMessageIncludes = ifxErrorMessageIncludes;
/**
 * Anchor [`ErrorCode`](../../programs/ifx/src/error.rs) numeric codes (`6000 + variant_index`).
 *
 * Full table: [`docs/errors.md`](../../docs/errors.md).
 */
exports.IFX_ERROR_CODE_BASE = 6000;
/** Named on-chain error codes (Anchor `6000 + enum index`). */
exports.IFX_ERROR = {
    LetNotTopLevel: 6000,
    TapeOutOfBounds: 6001,
    UnauthorizedClose: 6002,
    InvalidAuthority: 6003,
    InvalidTapeLen: 6004,
    AssertFailed: 6005,
    IfElseRevert: 6006,
    InvalidAccountIndex: 6007,
    InvalidAccountRange: 6008,
    AccountDataTooShort: 6009,
    IntegerOverflow: 6010,
    IntegerUnderflow: 6011,
    DivisionByZero: 6012,
    UnsupportedBinaryOp: 6013,
    UnsupportedUnaryOp: 6014,
    FloatUnordered: 6015,
    LoadTypeMismatch: 6016,
    ExprTypeMismatch: 6017,
    InvalidExprOperand: 6018,
    PatchDataOutOfRange: 6019,
    InvalidValueTypeTag: 6020,
    InvalidValueIndex: 6021,
    IndexCapReached: 6022,
    AccountOwnerMismatch: 6023,
    AccountDataLenMismatch: 6024,
    SplTokenUnpackFailed: 6025,
    Token2022ExtensionNotPresent: 6026,
    SplToken2022UnpackFailed: 6027,
    CastOverflow: 6028,
    InvalidPatchedCpiPatches: 6029,
    InvalidStructuredCpiProgram: 6030,
    InvalidInstructionData: 6031,
    ResetNotTopLevel: 6032,
    CloseNotTopLevel: 6033,
    CreateNotTopLevel: 6034,
    UnauthorizedFrameWrite: 6035,
};
const ERROR_NAME_BY_CODE = Object.fromEntries(Object.entries(exports.IFX_ERROR).map(([name, code]) => [code, name]));
/** Resolve a numeric Anchor code to its Ifx error name, if known. */
function ifxErrorName(code) {
    return ERROR_NAME_BY_CODE[code];
}
/** True when `code` is a known Ifx program error in [`IFX_ERROR`]. */
function isIfxErrorCode(code) {
    return code in ERROR_NAME_BY_CODE;
}
/** Match simulation / logs: `Error Code: CastOverflow` or custom program error hex. */
function ifxErrorMessageIncludes(message, name) {
    const code = exports.IFX_ERROR[name];
    const lower = message.toLowerCase();
    const hexFull = code.toString(16);
    const hexLow = (code & 0xff).toString(16);
    return (message.includes(name) ||
        message.includes(String(code)) ||
        lower.includes(`0x${hexFull}`) ||
        lower.includes(`0x${hexLow}`));
}
