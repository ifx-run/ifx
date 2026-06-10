/**
 * Anchor [`ErrorCode`](../../programs/ifx/src/error.rs) numeric codes (`6000 + variant_index`).
 *
 * Full table: [`docs/errors.md`](../../docs/errors.md).
 */
export declare const IFX_ERROR_CODE_BASE = 6000;
/** Named on-chain error codes (Anchor `6000 + enum index`). */
export declare const IFX_ERROR: {
    readonly LetNotTopLevel: 6000;
    readonly TapeOutOfBounds: 6001;
    readonly UnauthorizedClose: 6002;
    readonly InvalidAuthority: 6003;
    readonly InvalidTapeLen: 6004;
    readonly AssertFailed: 6005;
    readonly IfElseRevert: 6006;
    readonly InvalidAccountIndex: 6007;
    readonly InvalidAccountRange: 6008;
    readonly AccountDataTooShort: 6009;
    readonly IntegerOverflow: 6010;
    readonly IntegerUnderflow: 6011;
    readonly DivisionByZero: 6012;
    readonly UnsupportedBinaryOp: 6013;
    readonly UnsupportedUnaryOp: 6014;
    readonly FloatUnordered: 6015;
    readonly LoadTypeMismatch: 6016;
    readonly ExprTypeMismatch: 6017;
    readonly InvalidExprOperand: 6018;
    readonly PatchDataOutOfRange: 6019;
    readonly InvalidValueTypeTag: 6020;
    readonly InvalidValueIndex: 6021;
    readonly IndexCapReached: 6022;
    readonly AccountOwnerMismatch: 6023;
    readonly AccountDataLenMismatch: 6024;
    readonly SplTokenUnpackFailed: 6025;
    readonly Token2022ExtensionNotPresent: 6026;
    readonly SplToken2022UnpackFailed: 6027;
    readonly CastOverflow: 6028;
    readonly InvalidPatchedCpiPatches: 6029;
    readonly InvalidStructuredCpiProgram: 6030;
    readonly InvalidInstructionData: 6031;
    readonly ResetNotTopLevel: 6032;
    readonly CloseNotTopLevel: 6033;
    readonly CreateNotTopLevel: 6034;
    readonly UnauthorizedFrameWrite: 6035;
};
export type IfxErrorName = keyof typeof IFX_ERROR;
export type IfxErrorCode = (typeof IFX_ERROR)[IfxErrorName];
/** Resolve a numeric Anchor code to its Ifx error name, if known. */
export declare function ifxErrorName(code: number): IfxErrorName | undefined;
/** True when `code` is a known Ifx program error in [`IFX_ERROR`]. */
export declare function isIfxErrorCode(code: number): code is IfxErrorCode;
/** Match simulation / logs: `Error Code: CastOverflow` or custom program error hex. */
export declare function ifxErrorMessageIncludes(message: string, name: IfxErrorName): boolean;
