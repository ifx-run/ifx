import BN from "bn.js";

import { LET_BINDING_VARIANT } from "./let-binding-variants";
import { EXPR_TAG } from "./expr-variants";
import {
  IF_ELSE_ARM,
  ifElseArmStepTag,
} from "./if-else-arm";
import {
  patchListPatched,
  patchListStatic,
  type PatchList,
} from "./patch-list";
import { CPI_WIRE } from "./types";
import {
  encodeStructuredCpiPatchPayload,
  structuredCpiPatchWireTag,
} from "./structured-cpi-patch";
import type { Cpi } from "./types";

export { LET_BINDING_VARIANT } from "./let-binding-variants";
export { EXPR_TAG, EXPR_VARIANT, EXPR_VARIANT_COUNT } from "./expr-variants";
export {
  IF_ELSE_ARM,
  ifElseArmStepTag,
} from "./if-else-arm";
export {
  patchListPatched,
  patchListStatic,
  type PatchList,
} from "./patch-list";
export { CPI_WIRE } from "./types";
export {
  STRUCTURED_CPI_PATCH_WIRE,
  type StructuredCpiPatchWireTag,
} from "./structured-cpi-patch";

/** Runtime shapes from {@link expr} / {@link binding} helpers (avoid recursive IDL types here). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyExpr = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any;

/** Borsh discriminant order — see `expr-variants.ts`. */
const VALUE_TYPE_VARIANT = [
  "bool",
  "u8",
  "u16",
  "u32",
  "u64",
  "u128",
  "i8",
  "i16",
  "i32",
  "i64",
  "i128",
  "f32",
  "f64",
  "pubkey",
] as const;

export function encodeValueType(ty: AnyRecord): Buffer {
  const tag = VALUE_TYPE_VARIANT.findIndex((k) => k in ty);
  if (tag < 0) throw new Error(`unknown ValueType`);
  return Buffer.from([tag]);
}

/** Bound value reference: binding **index** only (type resolved via `payload_at` on-chain). */
export function encodeValue(ref: AnyRecord): Buffer {
  const n = ref.index;
  if (n < 0 || n > 0xff) {
    throw new Error(`Value.index out of u8 range: ${n}`);
  }
  return Buffer.from([n]);
}

function writeU32(buf: Buffer[], n: number): void {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  buf.push(b);
}

function writeU16(buf: Buffer[], n: number): void {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  buf.push(b);
}

/** `U8LenVec` length prefix: u8 (max 255 elements). */
export function writeU8Len(buf: Buffer[], n: number): void {
  if (n < 0 || n > 0xff) {
    throw new Error(`U8LenVec length out of u8 range: ${n}`);
  }
  buf.push(Buffer.from([n]));
}

/** Encode `U8LenVec<T>`: u8 count + mapped elements. */
export function encodeU8LenVec<T>(
  items: readonly T[],
  encodeItem: (item: T) => Buffer
): Buffer {
  const parts: Buffer[] = [];
  writeU8Len(parts, items.length);
  for (const item of items) {
    parts.push(encodeItem(item));
  }
  return Buffer.concat(parts);
}

/** `U16LenVec` length prefix: u16 LE (max 65535 elements). */
export function writeU16Len(buf: Buffer[], n: number): void {
  if (n < 0 || n > 0xffff) {
    throw new Error(`U16LenVec length out of u16 range: ${n}`);
  }
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  buf.push(b);
}

/** Encode `U16LenVec<T>`: u16 LE count + mapped elements. */
export function encodeU16LenVec<T>(
  items: readonly T[],
  encodeItem: (item: T) => Buffer
): Buffer {
  const parts: Buffer[] = [];
  writeU16Len(parts, items.length);
  for (const item of items) {
    parts.push(encodeItem(item));
  }
  return Buffer.concat(parts);
}

/** `U16LenVec<u8>`: u16 LE length + raw bytes. */
export function encodeU16LenBytes(data: Buffer | Uint8Array): Buffer {
  const bytes = Buffer.from(data);
  const parts: Buffer[] = [];
  writeU16Len(parts, bytes.length);
  parts.push(bytes);
  return Buffer.concat(parts);
}

function writeU64(buf: Buffer[], n: BN | number | bigint): void {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n.toString()));
  buf.push(b);
}

function writeU128(buf: Buffer[], n: BN | number | bigint): void {
  const bn = new BN(n.toString());
  const b = bn.toArrayLike(Buffer, "le", 16);
  buf.push(b);
}

function writeI64(buf: Buffer[], n: BN | number | bigint): void {
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(BigInt(n.toString()));
  buf.push(b);
}

function writeI128(buf: Buffer[], n: BN | number | bigint): void {
  const bn = new BN(n.toString());
  const bytes = bn.toTwos(128).toArrayLike(Buffer, "le", 16);
  buf.push(bytes);
}

function exprField(obj: AnyRecord, ...keys: string[]): AnyExpr {
  for (const k of keys) {
    if (k in obj) return obj[k];
  }
  throw new Error(`missing Expr field: ${keys.join(" | ")}`);
}

function encodeUnary(tag: number, operand: AnyExpr): Buffer {
  return Buffer.concat([Buffer.from([tag]), encodeExpr(operand)]);
}

function encodeBinary(tag: number, lhs: AnyExpr, rhs: AnyExpr): Buffer {
  return Buffer.concat([
    Buffer.from([tag]),
    encodeExpr(lhs),
    encodeExpr(rhs),
  ]);
}

function encodeTernary(
  tag: number,
  a: AnyExpr,
  b: AnyExpr,
  c: AnyExpr
): Buffer {
  return Buffer.concat([
    Buffer.from([tag]),
    encodeExpr(a),
    encodeExpr(b),
    encodeExpr(c),
  ]);
}

export function encodeExpr(expr: AnyExpr): Buffer {
  const parts: Buffer[] = [];

  if ("value" in expr) {
    parts.push(Buffer.from([EXPR_TAG.value]));
    parts.push(encodeValue(expr.value.value));
    return Buffer.concat(parts);
  }
  if ("constBool" in expr) {
    const v = expr.constBool[0];
    return Buffer.from([EXPR_TAG.constBool, v ? 1 : 0]);
  }
  if ("constU8" in expr) {
    return Buffer.from([EXPR_TAG.constU8, expr.constU8[0]]);
  }
  if ("constU16" in expr) {
    const b = Buffer.alloc(3);
    b[0] = EXPR_TAG.constU16;
    b.writeUInt16LE(expr.constU16[0], 1);
    return b;
  }
  if ("constU32" in expr) {
    const b = Buffer.alloc(5);
    b[0] = EXPR_TAG.constU32;
    b.writeUInt32LE(expr.constU32[0], 1);
    return b;
  }
  if ("constU64" in expr) {
    parts.push(Buffer.from([EXPR_TAG.constU64]));
    writeU64(parts, expr.constU64[0]);
    return Buffer.concat(parts);
  }
  if ("constU128" in expr) {
    parts.push(Buffer.from([EXPR_TAG.constU128]));
    writeU128(parts, expr.constU128[0]);
    return Buffer.concat(parts);
  }
  if ("constI8" in expr) {
    const b = Buffer.alloc(2);
    b[0] = EXPR_TAG.constI8;
    b.writeInt8(expr.constI8[0], 1);
    return b;
  }
  if ("constI16" in expr) {
    const b = Buffer.alloc(3);
    b[0] = EXPR_TAG.constI16;
    b.writeInt16LE(expr.constI16[0], 1);
    return b;
  }
  if ("constI32" in expr) {
    const b = Buffer.alloc(5);
    b[0] = EXPR_TAG.constI32;
    b.writeInt32LE(expr.constI32[0], 1);
    return b;
  }
  if ("constI64" in expr) {
    parts.push(Buffer.from([EXPR_TAG.constI64]));
    writeI64(parts, expr.constI64[0]);
    return Buffer.concat(parts);
  }
  if ("constI128" in expr) {
    parts.push(Buffer.from([EXPR_TAG.constI128]));
    writeI128(parts, expr.constI128[0]);
    return Buffer.concat(parts);
  }
  if ("constF32" in expr) {
    const b = Buffer.alloc(5);
    b[0] = EXPR_TAG.constF32;
    b.writeFloatLE(expr.constF32[0], 1);
    return b;
  }
  if ("constF64" in expr) {
    const b = Buffer.alloc(9);
    b[0] = EXPR_TAG.constF64;
    b.writeDoubleLE(expr.constF64[0], 1);
    return b;
  }

  if ("not" in expr) {
    return encodeUnary(EXPR_TAG.not, exprField(expr.not, "operand"));
  }
  if ("neg" in expr) {
    return encodeUnary(EXPR_TAG.neg, exprField(expr.neg, "operand"));
  }
  if ("isZero" in expr) {
    return encodeUnary(EXPR_TAG.isZero, exprField(expr.isZero, "operand"));
  }
  if ("nonZero" in expr) {
    return encodeUnary(EXPR_TAG.nonZero, exprField(expr.nonZero, "operand"));
  }
  if ("asU64" in expr) {
    return encodeUnary(EXPR_TAG.asU64, exprField(expr.asU64, "operand"));
  }
  if ("asU128" in expr) {
    return encodeUnary(EXPR_TAG.asU128, exprField(expr.asU128, "operand"));
  }

  const binKeys = [
    ["add", EXPR_TAG.add],
    ["sub", EXPR_TAG.sub],
    ["mul", EXPR_TAG.mul],
    ["div", EXPR_TAG.div],
    ["divFloor", EXPR_TAG.divFloor],
    ["divCeil", EXPR_TAG.divCeil],
    ["min", EXPR_TAG.min],
    ["max", EXPR_TAG.max],
    ["eq", EXPR_TAG.eq],
    ["ne", EXPR_TAG.ne],
    ["gt", EXPR_TAG.gt],
    ["ge", EXPR_TAG.ge],
    ["lt", EXPR_TAG.lt],
    ["le", EXPR_TAG.le],
    ["saturatingSub", EXPR_TAG.saturatingSub],
    ["and", EXPR_TAG.and],
    ["or", EXPR_TAG.or],
    ["bpsMulFloor", EXPR_TAG.bpsMulFloor],
    ["bpsMulCeil", EXPR_TAG.bpsMulCeil],
  ] as const;
  for (const [key, tag] of binKeys) {
    if (key in expr) {
      const node = expr[key] as AnyRecord;
      const lhs = exprField(node, "lhs", "amount");
      const rhs = exprField(node, "rhs", "bps");
      return encodeBinary(tag, lhs, rhs);
    }
  }

  if ("mulDivFloor" in expr) {
    const n = expr.mulDivFloor as AnyRecord;
    return encodeTernary(
      EXPR_TAG.mulDivFloor,
      exprField(n, "a"),
      exprField(n, "b"),
      exprField(n, "c")
    );
  }
  if ("mulDivCeil" in expr) {
    const n = expr.mulDivCeil as AnyRecord;
    return encodeTernary(
      EXPR_TAG.mulDivCeil,
      exprField(n, "a"),
      exprField(n, "b"),
      exprField(n, "c")
    );
  }
  if ("clamp" in expr) {
    const n = expr.clamp as AnyRecord;
    return encodeTernary(
      EXPR_TAG.clamp,
      exprField(n, "value"),
      exprField(n, "lo"),
      exprField(n, "hi")
    );
  }
  if ("select" in expr) {
    const n = expr.select as AnyRecord;
    return encodeTernary(
      EXPR_TAG.select,
      exprField(n, "cond"),
      exprField(n, "thenExpr", "then_expr"),
      exprField(n, "elseExpr", "else_expr")
    );
  }
  if ("constPubkey" in expr) {
    const bytes = Buffer.from(expr.constPubkey[0]);
    if (bytes.length !== 32) {
      throw new Error(`constPubkey must be 32 bytes, got ${bytes.length}`);
    }
    return Buffer.concat([Buffer.from([EXPR_TAG.constPubkey]), bytes]);
  }

  throw new Error("invalid Expr");
}

export function encodeLetBinding(binding: AnyRecord): Buffer {
  const key = LET_BINDING_VARIANT.find((k) => k in binding);
  if (key === undefined) {
    throw new Error("invalid LetBinding");
  }
  const tag = LET_BINDING_VARIANT.indexOf(key);
  const parts: Buffer[] = [Buffer.from([tag])];
  const v = binding[key] as AnyRecord;

  switch (key) {
    case "accountDataSlice": {
      const { ty, accountIndex, offset, expectedProgramOwner } = v;
      if (offset < 0 || offset > 0xffffffff) {
        throw new Error(`accountDataSlice offset out of u32 range: ${offset}`);
      }
      parts.push(encodeValueType(ty));
      parts.push(Buffer.from([accountIndex]));
      writeU32(parts, offset);
      parts.push(Buffer.from([expectedProgramOwner]));
      break;
    }
    case "accountLamports":
    case "accountDataLen":
    case "accountKey":
      parts.push(Buffer.from([v.accountIndex]));
      break;
    case "constPubkey": {
      const bytes = Buffer.from(v.bytes);
      if (bytes.length !== 32) {
        throw new Error(`constPubkey must be 32 bytes, got ${bytes.length}`);
      }
      parts.push(bytes);
      break;
    }
    case "eval":
      parts.push(encodeExpr(v.expr));
      break;
    case "sysvarClockSlot":
    case "sysvarClockEpochStartTimestamp":
    case "sysvarClockEpoch":
    case "sysvarClockLeaderScheduleEpoch":
    case "sysvarClockUnixTimestamp":
      break;
    case "sysvarRentMinimumBalance": {
      const { dataLen } = v;
      if (dataLen < 0 || dataLen > 0xffffffff) {
        throw new Error(`sysvarRentMinimumBalance dataLen out of u32 range: ${dataLen}`);
      }
      writeU32(parts, dataLen);
      break;
    }
    case "splTokenAccountAmount":
    case "splTokenAccountDelegatedAmount":
    case "splTokenAccountState":
    case "splMintSupply":
    case "splMintDecimals":
    case "splToken2022AccountAmount":
    case "splToken2022AccountDelegatedAmount":
    case "splToken2022AccountState":
    case "splToken2022MintSupply":
    case "splToken2022MintDecimals":
    case "splToken2022AccountTransferFeeWithheld":
    case "splToken2022MintTransferFeeBasisPoints":
    case "splToken2022MintTransferFeeMaximum":
    case "splToken2022MintWithheldAmount":
    case "splToken2022MintDefaultAccountState":
      parts.push(Buffer.from([v.accountIndex]));
      break;
    case "frameGeneration":
    case "frameIndexCount":
      break;
    default:
      throw new Error(`unhandled LetBinding variant: ${key}`);
  }
  return Buffer.concat(parts);
}

export function encodeLetArgs(args: AnyRecord): Buffer {
  return encodeU8LenVec(args.bindings, encodeLetBinding);
}

export function encodeRawCpiPatch(patch: AnyRecord): Buffer {
  const dataOffset = patch.dataOffset as number;
  if (dataOffset < 0 || dataOffset > 0xffff) {
    throw new Error(`RawCpiPatch.dataOffset out of u16 range: ${dataOffset}`);
  }
  const parts: Buffer[] = [];
  writeU16(parts, dataOffset);
  parts.push(encodeValue(patch.source));
  return Buffer.concat(parts);
}

/** @deprecated Use {@link encodeRawCpiPatch} */
export const encodeCpiPatch = encodeRawCpiPatch;

export function encodePatchList(list: PatchList): Buffer {
  return encodeU16LenVec(list, encodeRawCpiPatch);
}

export function encodeCpi(step: Cpi): Buffer {
  switch (step.kind) {
    case "static":
      return Buffer.concat([
        Buffer.from([
          CPI_WIRE.static,
          step.accountsStart,
          step.accountsLen,
        ]),
        encodeU16LenBytes(step.data),
      ]);
    case "rawPatched":
      return Buffer.concat([
        Buffer.from([
          CPI_WIRE.rawPatched,
          step.accountsStart,
          step.accountsLen,
        ]),
        encodeU16LenBytes(step.data),
        encodePatchList(step.patches),
      ]);
    case "structured":
      return Buffer.concat([
        Buffer.from([
          CPI_WIRE.structured,
          structuredCpiPatchWireTag(step.patch),
          step.accountsStart,
          step.accountsLen,
        ]),
        encodeStructuredCpiPatchPayload(step.patch),
      ]);
  }
}

function stepsFromArm(arm: AnyRecord): AnyRecord[] {
  if (Array.isArray(arm.steps)) {
    return arm.steps;
  }
  if (Array.isArray(arm.cpis)) {
    return arm.cpis;
  }
  return [];
}

function encodeIfElseArm(arm: AnyRecord): Buffer {
  switch (arm.kind) {
    case "skip":
      return Buffer.from([IF_ELSE_ARM.skip]);
    case "revert":
      return Buffer.from([IF_ELSE_ARM.revert]);
    case "cpi": {
      const steps = stepsFromArm(arm);
      if (steps.length === 0) {
        throw new Error("IfElseArm cpi requires at least one step");
      }
      return Buffer.concat([
        Buffer.from([ifElseArmStepTag(steps.length)]),
        ...steps.map((step) => encodeCpi(step)),
      ]);
    }
    default:
      throw new Error(`unknown IfElseArm kind: ${(arm as AnyRecord).kind}`);
  }
}

export function encodeIfElseArgs(args: AnyRecord): Buffer {
  return Buffer.concat([
    encodeExpr(args.cond),
    encodeIfElseArm(args.thenArm),
    encodeIfElseArm(args.elseArm),
  ]);
}
