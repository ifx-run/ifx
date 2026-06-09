import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

import {
  ACCOUNT_DISC_FRAME,
  DEFAULT_IFX_PROGRAM_ID,
  FRAME_SEED,
} from "./constants";
import type { ValueType } from "./types";
import { inferBindingTy } from "./binding";
import {
  ifxTyFromValueType,
  tyForIfxTy,
  type IfxTy,
  type ScratchValue,
} from "./typed";

/** Primitive width in bytes (matches on-chain `ValueType::size`). */
export function valueTypeSize(ty: ValueType): number {
  if ("bool" in ty || "u8" in ty || "i8" in ty) return 1;
  if ("u16" in ty || "i16" in ty) return 2;
  if ("u32" in ty || "i32" in ty || "f32" in ty) return 4;
  if ("u64" in ty || "i64" in ty || "f64" in ty) return 8;
  if ("u128" in ty || "i128" in ty) return 16;
  if ("pubkey" in ty) return 32;
  throw new Error(`unknown ValueType: ${JSON.stringify(ty)}`);
}

/** Result of reading a {@link ScratchValue} from a {@link DecodedFrame} snapshot. */
export type SnapshotReadResult<T extends IfxTy> = T extends "bool"
  ? boolean
  : T extends "u8" | "u16" | "u32" | "i8" | "i16" | "i32" | "f32" | "f64"
    ? number
    : T extends "u64" | "u128" | "i64"
      ? bigint
      : T extends "i128"
        ? BN
        : T extends "pubkey"
          ? PublicKey
          : never;

function readPayload(tape: Buffer, payloadOffset: number, ty: ValueType): Buffer {
  const size = valueTypeSize(ty);
  const end = payloadOffset + size;
  if (end > tape.length) {
    throw new Error(
      `read past frame tape (${end} > ${tape.length}) at byte ${payloadOffset}`
    );
  }
  return tape.subarray(payloadOffset, end);
}

function decodePayloadBytes(bytes: Buffer, ty: ValueType): unknown {
  const k = ifxTyFromValueType(ty);
  switch (k) {
    case "bool":
      return bytes[0] !== 0;
    case "u8":
      return bytes[0];
    case "u16":
      return bytes.readUInt16LE(0);
    case "u32":
      return bytes.readUInt32LE(0);
    case "u64":
      return bytes.readBigUInt64LE(0);
    case "u128": {
      const lo = bytes.readBigUInt64LE(0);
      const hi = bytes.readBigUInt64LE(8);
      return (hi << BigInt(64)) | lo;
    }
    case "i8":
      return bytes.readInt8(0);
    case "i16":
      return bytes.readInt16LE(0);
    case "i32":
      return bytes.readInt32LE(0);
    case "i64":
      return bytes.readBigInt64LE(0);
    case "i128":
      return new BN(bytes, "le").fromTwos(128);
    case "f32":
      return bytes.readFloatLE(0);
    case "f64":
      return bytes.readDoubleLE(0);
    case "pubkey":
      return new PublicKey(bytes);
    default:
      throw new Error(`unsupported read type: ${k}`);
  }
}

/** Snapshot of an on-chain Frame account (`tape` is chain data at fetch/decode time). */
export class DecodedFrame {
  constructor(
    readonly authority: PublicKey,
    readonly cursor: number,
    readonly indexCount: number,
    readonly indexCap: number,
    readonly generation: bigint,
    readonly payloadAt: readonly number[],
    readonly tape: Buffer
  ) {}

  private payloadOffsetForIndex(bindingIndex: number): number {
    if (bindingIndex < 0 || bindingIndex >= this.indexCount) {
      throw new Error(
        `binding index ${bindingIndex} out of range (indexCount=${this.indexCount})`
      );
    }
    return this.payloadAt[bindingIndex]!;
  }

  /** Read a bound value from this snapshot via binding **index**. */
  readValue<T extends IfxTy>(value: ScratchValue<T>): SnapshotReadResult<T> {
    const ty = tyForIfxTy(
      value.__ifxTy ?? inferBindingTy(value.binding)
    );
    const payloadOffset = this.payloadOffsetForIndex(value.ref.index);
    const bytes = readPayload(this.tape, payloadOffset, ty);
    return decodePayloadBytes(bytes, ty) as SnapshotReadResult<T>;
  }

  readBool(value: ScratchValue<"bool">): boolean {
    return this.readValue(value);
  }

  readU8(value: ScratchValue<"u8">): number {
    return this.readValue(value);
  }

  readU16(value: ScratchValue<"u16">): number {
    return this.readValue(value);
  }

  readU32(value: ScratchValue<"u32">): number {
    return this.readValue(value);
  }

  readU64(value: ScratchValue<"u64">): bigint {
    return this.readValue(value);
  }

  readU128(value: ScratchValue<"u128">): bigint {
    return this.readValue(value);
  }

  readI8(value: ScratchValue<"i8">): number {
    return this.readValue(value);
  }

  readI16(value: ScratchValue<"i16">): number {
    return this.readValue(value);
  }

  readI32(value: ScratchValue<"i32">): number {
    return this.readValue(value);
  }

  readI64(value: ScratchValue<"i64">): bigint {
    return this.readValue(value);
  }

  readI128(value: ScratchValue<"i128">): BN {
    return this.readValue(value);
  }

  readF32(value: ScratchValue<"f32">): number {
    return this.readValue(value);
  }

  readF64(value: ScratchValue<"f64">): number {
    return this.readValue(value);
  }

  readPubkey(value: ScratchValue<"pubkey">): PublicKey {
    return this.readValue(value);
  }
}

/** Decode a Frame account after the 1-byte type discriminator. */
export function decodeFrameAccount(data: Buffer): DecodedFrame {
  if (data.length < 1 + 32 + 4 + 2 + 2 + 8 + 4 + 4) {
    throw new Error("Frame account data too short");
  }
  if (data[0] !== ACCOUNT_DISC_FRAME) {
    throw new Error("invalid Frame account discriminator");
  }
  let o = 1;
  const authority = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const cursor = data.readUInt32LE(o);
  o += 4;
  const indexCount = data.readUInt16LE(o);
  o += 2;
  const indexCap = data.readUInt16LE(o);
  o += 2;
  const generation = data.readBigUInt64LE(o);
  o += 8;
  const payloadAtLen = data.readUInt32LE(o);
  o += 4;
  const payloadAt: number[] = [];
  for (let i = 0; i < payloadAtLen; i++) {
    payloadAt.push(data.readUInt16LE(o));
    o += 2;
  }
  const tapeLen = data.readUInt32LE(o);
  o += 4;
  const tape = data.subarray(o, o + tapeLen);
  if (payloadAtLen !== indexCap) {
    throw new Error(
      `payload_at length mismatch: ${payloadAtLen} vs indexCap ${indexCap}`
    );
  }
  return new DecodedFrame(
    authority,
    cursor,
    indexCount,
    indexCap,
    generation,
    payloadAt,
    tape
  );
}

export function framePda(
  payer: PublicKey,
  frameId: Uint8Array | Buffer,
  programId: PublicKey = DEFAULT_IFX_PROGRAM_ID
): [PublicKey, number] {
  if (frameId.length !== 32) {
    throw new Error("frameId must be 32 bytes");
  }
  return PublicKey.findProgramAddressSync(
    [FRAME_SEED, payer.toBuffer(), Buffer.from(frameId)],
    programId
  );
}
