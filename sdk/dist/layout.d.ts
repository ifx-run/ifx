import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import type { ValueType } from "./types";
import { type IfxTy, type ScratchValue } from "./typed";
/** Primitive width in bytes (matches on-chain `ValueType::size`). */
export declare function valueTypeSize(ty: ValueType): number;
/** Result of reading a {@link ScratchValue} from a {@link DecodedFrame} snapshot. */
export type SnapshotReadResult<T extends IfxTy> = T extends "bool" ? boolean : T extends "u8" | "u16" | "u32" | "i8" | "i16" | "i32" | "f32" | "f64" ? number : T extends "u64" | "u128" | "i64" ? bigint : T extends "i128" ? BN : T extends "pubkey" ? PublicKey : never;
/** Snapshot of an on-chain Frame account (`tape` is chain data at fetch/decode time). */
export declare class DecodedFrame {
    readonly authority: PublicKey;
    readonly cursor: number;
    readonly indexCount: number;
    readonly indexCap: number;
    readonly generation: bigint;
    readonly payloadAt: readonly number[];
    readonly tape: Buffer;
    constructor(authority: PublicKey, cursor: number, indexCount: number, indexCap: number, generation: bigint, payloadAt: readonly number[], tape: Buffer);
    private payloadOffsetForIndex;
    /** Read a bound value from this snapshot via binding **index**. */
    readValue<T extends IfxTy>(value: ScratchValue<T>): SnapshotReadResult<T>;
    readBool(value: ScratchValue<"bool">): boolean;
    readU8(value: ScratchValue<"u8">): number;
    readU16(value: ScratchValue<"u16">): number;
    readU32(value: ScratchValue<"u32">): number;
    readU64(value: ScratchValue<"u64">): bigint;
    readU128(value: ScratchValue<"u128">): bigint;
    readI8(value: ScratchValue<"i8">): number;
    readI16(value: ScratchValue<"i16">): number;
    readI32(value: ScratchValue<"i32">): number;
    readI64(value: ScratchValue<"i64">): bigint;
    readI128(value: ScratchValue<"i128">): BN;
    readF32(value: ScratchValue<"f32">): number;
    readF64(value: ScratchValue<"f64">): number;
    readPubkey(value: ScratchValue<"pubkey">): PublicKey;
}
/** Decode a Frame account after the 1-byte type discriminator. */
export declare function decodeFrameAccount(data: Buffer): DecodedFrame;
export declare function framePda(payer: PublicKey, frameId: Uint8Array | Buffer, programId?: PublicKey): [PublicKey, number];
