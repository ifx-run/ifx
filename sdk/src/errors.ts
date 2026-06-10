/**
 * Anchor [`ErrorCode`](../../programs/ifx/src/error.rs) numeric codes (`6000 + variant_index`).
 *
 * Full table: [`docs/errors.md`](../../docs/errors.md).
 */
export const IFX_ERROR_CODE_BASE = 6000;

/** Named on-chain error codes (Anchor `6000 + enum index`). */
export const IFX_ERROR = {
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
} as const;

export type IfxErrorName = keyof typeof IFX_ERROR;
export type IfxErrorCode = (typeof IFX_ERROR)[IfxErrorName];

const ERROR_NAME_BY_CODE = Object.fromEntries(
  (Object.entries(IFX_ERROR) as [IfxErrorName, IfxErrorCode][]).map(
    ([name, code]) => [code, name]
  )
) as Record<IfxErrorCode, IfxErrorName>;

/** Resolve a numeric Anchor code to its Ifx error name, if known. */
export function ifxErrorName(code: number): IfxErrorName | undefined {
  return ERROR_NAME_BY_CODE[code as IfxErrorCode];
}

/** True when `code` is a known Ifx program error in [`IFX_ERROR`]. */
export function isIfxErrorCode(code: number): code is IfxErrorCode {
  return code in ERROR_NAME_BY_CODE;
}

/** Match simulation / logs: `Error Code: CastOverflow` or custom program error hex. */
export function ifxErrorMessageIncludes(
  message: string,
  name: IfxErrorName
): boolean {
  const code = IFX_ERROR[name];
  const lower = message.toLowerCase();
  const hexFull = code.toString(16);
  const hexLow = (code & 0xff).toString(16);
  return (
    message.includes(name) ||
    message.includes(String(code)) ||
    lower.includes(`0x${hexFull}`) ||
    lower.includes(`0x${hexLow}`)
  );
}
