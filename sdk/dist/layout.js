"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecodedFrame = void 0;
exports.valueTypeSize = valueTypeSize;
exports.decodeFrameAccount = decodeFrameAccount;
exports.framePda = framePda;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const constants_1 = require("./constants");
const binding_1 = require("./binding");
const typed_1 = require("./typed");
/** Primitive width in bytes (matches on-chain `ValueType::size`). */
function valueTypeSize(ty) {
    if ("bool" in ty || "u8" in ty || "i8" in ty)
        return 1;
    if ("u16" in ty || "i16" in ty)
        return 2;
    if ("u32" in ty || "i32" in ty || "f32" in ty)
        return 4;
    if ("u64" in ty || "i64" in ty || "f64" in ty)
        return 8;
    if ("u128" in ty || "i128" in ty)
        return 16;
    throw new Error(`unknown ValueType: ${JSON.stringify(ty)}`);
}
function readPayload(tape, payloadOffset, ty) {
    const size = valueTypeSize(ty);
    const end = payloadOffset + size;
    if (end > tape.length) {
        throw new Error(`read past frame tape (${end} > ${tape.length}) at byte ${payloadOffset}`);
    }
    return tape.subarray(payloadOffset, end);
}
function decodePayloadBytes(bytes, ty) {
    const k = (0, typed_1.ifxTyFromValueType)(ty);
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
            return new bn_js_1.default(bytes, "le").fromTwos(128);
        case "f32":
            return bytes.readFloatLE(0);
        case "f64":
            return bytes.readDoubleLE(0);
        default:
            throw new Error(`unsupported read type: ${k}`);
    }
}
/** Snapshot of an on-chain Frame account (`tape` is chain data at fetch/decode time). */
class DecodedFrame {
    constructor(closeAuthority, cursor, indexCount, indexCap, payloadAt, tape) {
        this.closeAuthority = closeAuthority;
        this.cursor = cursor;
        this.indexCount = indexCount;
        this.indexCap = indexCap;
        this.payloadAt = payloadAt;
        this.tape = tape;
    }
    payloadOffsetForIndex(bindingIndex) {
        if (bindingIndex < 0 || bindingIndex >= this.indexCount) {
            throw new Error(`binding index ${bindingIndex} out of range (indexCount=${this.indexCount})`);
        }
        return this.payloadAt[bindingIndex];
    }
    /** Read a bound value from this snapshot via binding **index**. */
    readValue(value) {
        const ty = (0, typed_1.tyForIfxTy)(value.__ifxTy ?? (0, binding_1.inferBindingTy)(value.binding));
        const payloadOffset = this.payloadOffsetForIndex(value.ref.index);
        const bytes = readPayload(this.tape, payloadOffset, ty);
        return decodePayloadBytes(bytes, ty);
    }
    readBool(value) {
        return this.readValue(value);
    }
    readU8(value) {
        return this.readValue(value);
    }
    readU16(value) {
        return this.readValue(value);
    }
    readU32(value) {
        return this.readValue(value);
    }
    readU64(value) {
        return this.readValue(value);
    }
    readU128(value) {
        return this.readValue(value);
    }
    readI8(value) {
        return this.readValue(value);
    }
    readI16(value) {
        return this.readValue(value);
    }
    readI32(value) {
        return this.readValue(value);
    }
    readI64(value) {
        return this.readValue(value);
    }
    readI128(value) {
        return this.readValue(value);
    }
    readF32(value) {
        return this.readValue(value);
    }
    readF64(value) {
        return this.readValue(value);
    }
}
exports.DecodedFrame = DecodedFrame;
/** Decode a Frame account after the 1-byte type discriminator. */
function decodeFrameAccount(data) {
    if (data.length < 1 + 32 + 4 + 2 + 2 + 4 + 4) {
        throw new Error("Frame account data too short");
    }
    if (data[0] !== constants_1.ACCOUNT_DISC_FRAME) {
        throw new Error("invalid Frame account discriminator");
    }
    let o = 1;
    const closeAuthority = new web3_js_1.PublicKey(data.subarray(o, o + 32));
    o += 32;
    const cursor = data.readUInt32LE(o);
    o += 4;
    const indexCount = data.readUInt16LE(o);
    o += 2;
    const indexCap = data.readUInt16LE(o);
    o += 2;
    const payloadAtLen = data.readUInt32LE(o);
    o += 4;
    const payloadAt = [];
    for (let i = 0; i < payloadAtLen; i++) {
        payloadAt.push(data.readUInt16LE(o));
        o += 2;
    }
    const tapeLen = data.readUInt32LE(o);
    o += 4;
    const tape = data.subarray(o, o + tapeLen);
    if (payloadAtLen !== indexCap) {
        throw new Error(`payload_at length mismatch: ${payloadAtLen} vs indexCap ${indexCap}`);
    }
    return new DecodedFrame(closeAuthority, cursor, indexCount, indexCap, payloadAt, tape);
}
function framePda(payer, frameId, programId = constants_1.DEFAULT_IFX_PROGRAM_ID) {
    if (frameId.length !== 32) {
        throw new Error("frameId must be 32 bytes");
    }
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.FRAME_SEED, payer.toBuffer(), Buffer.from(frameId)], programId);
}
