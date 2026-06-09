"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeCpiPatch = exports.STRUCTURED_CPI_PATCH_WIRE = exports.CPI_WIRE = exports.patchListStatic = exports.patchListPatched = exports.ifElseArmStepTag = exports.IF_ELSE_ARM = exports.EXPR_VARIANT_COUNT = exports.EXPR_VARIANT = exports.EXPR_TAG = exports.LET_BINDING_VARIANT = void 0;
exports.encodeValueType = encodeValueType;
exports.encodeValue = encodeValue;
exports.writeU8Len = writeU8Len;
exports.encodeU8LenVec = encodeU8LenVec;
exports.writeU16Len = writeU16Len;
exports.encodeU16LenVec = encodeU16LenVec;
exports.encodeU16LenBytes = encodeU16LenBytes;
exports.encodeExpr = encodeExpr;
exports.encodeLetBinding = encodeLetBinding;
exports.encodeLetArgs = encodeLetArgs;
exports.encodeRawCpiPatch = encodeRawCpiPatch;
exports.encodePatchList = encodePatchList;
exports.encodeCpi = encodeCpi;
exports.encodeIfElseArgs = encodeIfElseArgs;
const bn_js_1 = __importDefault(require("bn.js"));
const let_binding_variants_1 = require("./let-binding-variants");
const expr_variants_1 = require("./expr-variants");
const if_else_arm_1 = require("./if-else-arm");
const types_1 = require("./types");
const structured_cpi_patch_1 = require("./structured-cpi-patch");
var let_binding_variants_2 = require("./let-binding-variants");
Object.defineProperty(exports, "LET_BINDING_VARIANT", { enumerable: true, get: function () { return let_binding_variants_2.LET_BINDING_VARIANT; } });
var expr_variants_2 = require("./expr-variants");
Object.defineProperty(exports, "EXPR_TAG", { enumerable: true, get: function () { return expr_variants_2.EXPR_TAG; } });
Object.defineProperty(exports, "EXPR_VARIANT", { enumerable: true, get: function () { return expr_variants_2.EXPR_VARIANT; } });
Object.defineProperty(exports, "EXPR_VARIANT_COUNT", { enumerable: true, get: function () { return expr_variants_2.EXPR_VARIANT_COUNT; } });
var if_else_arm_2 = require("./if-else-arm");
Object.defineProperty(exports, "IF_ELSE_ARM", { enumerable: true, get: function () { return if_else_arm_2.IF_ELSE_ARM; } });
Object.defineProperty(exports, "ifElseArmStepTag", { enumerable: true, get: function () { return if_else_arm_2.ifElseArmStepTag; } });
var patch_list_1 = require("./patch-list");
Object.defineProperty(exports, "patchListPatched", { enumerable: true, get: function () { return patch_list_1.patchListPatched; } });
Object.defineProperty(exports, "patchListStatic", { enumerable: true, get: function () { return patch_list_1.patchListStatic; } });
var types_2 = require("./types");
Object.defineProperty(exports, "CPI_WIRE", { enumerable: true, get: function () { return types_2.CPI_WIRE; } });
var structured_cpi_patch_2 = require("./structured-cpi-patch");
Object.defineProperty(exports, "STRUCTURED_CPI_PATCH_WIRE", { enumerable: true, get: function () { return structured_cpi_patch_2.STRUCTURED_CPI_PATCH_WIRE; } });
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
];
function encodeValueType(ty) {
    const tag = VALUE_TYPE_VARIANT.findIndex((k) => k in ty);
    if (tag < 0)
        throw new Error(`unknown ValueType`);
    return Buffer.from([tag]);
}
/** Bound value reference: binding **index** only (type resolved via `payload_at` on-chain). */
function encodeValue(ref) {
    const n = ref.index;
    if (n < 0 || n > 0xff) {
        throw new Error(`Value.index out of u8 range: ${n}`);
    }
    return Buffer.from([n]);
}
function writeU32(buf, n) {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(n);
    buf.push(b);
}
function writeU16(buf, n) {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(n);
    buf.push(b);
}
/** `U8LenVec` length prefix: u8 (max 255 elements). */
function writeU8Len(buf, n) {
    if (n < 0 || n > 0xff) {
        throw new Error(`U8LenVec length out of u8 range: ${n}`);
    }
    buf.push(Buffer.from([n]));
}
/** Encode `U8LenVec<T>`: u8 count + mapped elements. */
function encodeU8LenVec(items, encodeItem) {
    const parts = [];
    writeU8Len(parts, items.length);
    for (const item of items) {
        parts.push(encodeItem(item));
    }
    return Buffer.concat(parts);
}
/** `U16LenVec` length prefix: u16 LE (max 65535 elements). */
function writeU16Len(buf, n) {
    if (n < 0 || n > 0xffff) {
        throw new Error(`U16LenVec length out of u16 range: ${n}`);
    }
    const b = Buffer.alloc(2);
    b.writeUInt16LE(n);
    buf.push(b);
}
/** Encode `U16LenVec<T>`: u16 LE count + mapped elements. */
function encodeU16LenVec(items, encodeItem) {
    const parts = [];
    writeU16Len(parts, items.length);
    for (const item of items) {
        parts.push(encodeItem(item));
    }
    return Buffer.concat(parts);
}
/** `U16LenVec<u8>`: u16 LE length + raw bytes. */
function encodeU16LenBytes(data) {
    const bytes = Buffer.from(data);
    const parts = [];
    writeU16Len(parts, bytes.length);
    parts.push(bytes);
    return Buffer.concat(parts);
}
function writeU64(buf, n) {
    const b = Buffer.alloc(8);
    b.writeBigUInt64LE(BigInt(n.toString()));
    buf.push(b);
}
function writeU128(buf, n) {
    const bn = new bn_js_1.default(n.toString());
    const b = bn.toArrayLike(Buffer, "le", 16);
    buf.push(b);
}
function writeI64(buf, n) {
    const b = Buffer.alloc(8);
    b.writeBigInt64LE(BigInt(n.toString()));
    buf.push(b);
}
function writeI128(buf, n) {
    const bn = new bn_js_1.default(n.toString());
    const bytes = bn.toTwos(128).toArrayLike(Buffer, "le", 16);
    buf.push(bytes);
}
function exprField(obj, ...keys) {
    for (const k of keys) {
        if (k in obj)
            return obj[k];
    }
    throw new Error(`missing Expr field: ${keys.join(" | ")}`);
}
function encodeUnary(tag, operand) {
    return Buffer.concat([Buffer.from([tag]), encodeExpr(operand)]);
}
function encodeBinary(tag, lhs, rhs) {
    return Buffer.concat([
        Buffer.from([tag]),
        encodeExpr(lhs),
        encodeExpr(rhs),
    ]);
}
function encodeTernary(tag, a, b, c) {
    return Buffer.concat([
        Buffer.from([tag]),
        encodeExpr(a),
        encodeExpr(b),
        encodeExpr(c),
    ]);
}
function encodeExpr(expr) {
    const parts = [];
    if ("value" in expr) {
        parts.push(Buffer.from([expr_variants_1.EXPR_TAG.value]));
        parts.push(encodeValue(expr.value.value));
        return Buffer.concat(parts);
    }
    if ("constBool" in expr) {
        const v = expr.constBool[0];
        return Buffer.from([expr_variants_1.EXPR_TAG.constBool, v ? 1 : 0]);
    }
    if ("constU8" in expr) {
        return Buffer.from([expr_variants_1.EXPR_TAG.constU8, expr.constU8[0]]);
    }
    if ("constU16" in expr) {
        const b = Buffer.alloc(3);
        b[0] = expr_variants_1.EXPR_TAG.constU16;
        b.writeUInt16LE(expr.constU16[0], 1);
        return b;
    }
    if ("constU32" in expr) {
        const b = Buffer.alloc(5);
        b[0] = expr_variants_1.EXPR_TAG.constU32;
        b.writeUInt32LE(expr.constU32[0], 1);
        return b;
    }
    if ("constU64" in expr) {
        parts.push(Buffer.from([expr_variants_1.EXPR_TAG.constU64]));
        writeU64(parts, expr.constU64[0]);
        return Buffer.concat(parts);
    }
    if ("constU128" in expr) {
        parts.push(Buffer.from([expr_variants_1.EXPR_TAG.constU128]));
        writeU128(parts, expr.constU128[0]);
        return Buffer.concat(parts);
    }
    if ("constI8" in expr) {
        const b = Buffer.alloc(2);
        b[0] = expr_variants_1.EXPR_TAG.constI8;
        b.writeInt8(expr.constI8[0], 1);
        return b;
    }
    if ("constI16" in expr) {
        const b = Buffer.alloc(3);
        b[0] = expr_variants_1.EXPR_TAG.constI16;
        b.writeInt16LE(expr.constI16[0], 1);
        return b;
    }
    if ("constI32" in expr) {
        const b = Buffer.alloc(5);
        b[0] = expr_variants_1.EXPR_TAG.constI32;
        b.writeInt32LE(expr.constI32[0], 1);
        return b;
    }
    if ("constI64" in expr) {
        parts.push(Buffer.from([expr_variants_1.EXPR_TAG.constI64]));
        writeI64(parts, expr.constI64[0]);
        return Buffer.concat(parts);
    }
    if ("constI128" in expr) {
        parts.push(Buffer.from([expr_variants_1.EXPR_TAG.constI128]));
        writeI128(parts, expr.constI128[0]);
        return Buffer.concat(parts);
    }
    if ("constF32" in expr) {
        const b = Buffer.alloc(5);
        b[0] = expr_variants_1.EXPR_TAG.constF32;
        b.writeFloatLE(expr.constF32[0], 1);
        return b;
    }
    if ("constF64" in expr) {
        const b = Buffer.alloc(9);
        b[0] = expr_variants_1.EXPR_TAG.constF64;
        b.writeDoubleLE(expr.constF64[0], 1);
        return b;
    }
    if ("not" in expr) {
        return encodeUnary(expr_variants_1.EXPR_TAG.not, exprField(expr.not, "operand"));
    }
    if ("neg" in expr) {
        return encodeUnary(expr_variants_1.EXPR_TAG.neg, exprField(expr.neg, "operand"));
    }
    if ("isZero" in expr) {
        return encodeUnary(expr_variants_1.EXPR_TAG.isZero, exprField(expr.isZero, "operand"));
    }
    if ("nonZero" in expr) {
        return encodeUnary(expr_variants_1.EXPR_TAG.nonZero, exprField(expr.nonZero, "operand"));
    }
    if ("asU64" in expr) {
        return encodeUnary(expr_variants_1.EXPR_TAG.asU64, exprField(expr.asU64, "operand"));
    }
    if ("asU128" in expr) {
        return encodeUnary(expr_variants_1.EXPR_TAG.asU128, exprField(expr.asU128, "operand"));
    }
    const binKeys = [
        ["add", expr_variants_1.EXPR_TAG.add],
        ["sub", expr_variants_1.EXPR_TAG.sub],
        ["mul", expr_variants_1.EXPR_TAG.mul],
        ["div", expr_variants_1.EXPR_TAG.div],
        ["divFloor", expr_variants_1.EXPR_TAG.divFloor],
        ["divCeil", expr_variants_1.EXPR_TAG.divCeil],
        ["min", expr_variants_1.EXPR_TAG.min],
        ["max", expr_variants_1.EXPR_TAG.max],
        ["eq", expr_variants_1.EXPR_TAG.eq],
        ["ne", expr_variants_1.EXPR_TAG.ne],
        ["gt", expr_variants_1.EXPR_TAG.gt],
        ["ge", expr_variants_1.EXPR_TAG.ge],
        ["lt", expr_variants_1.EXPR_TAG.lt],
        ["le", expr_variants_1.EXPR_TAG.le],
        ["saturatingSub", expr_variants_1.EXPR_TAG.saturatingSub],
        ["and", expr_variants_1.EXPR_TAG.and],
        ["or", expr_variants_1.EXPR_TAG.or],
        ["bpsMulFloor", expr_variants_1.EXPR_TAG.bpsMulFloor],
        ["bpsMulCeil", expr_variants_1.EXPR_TAG.bpsMulCeil],
    ];
    for (const [key, tag] of binKeys) {
        if (key in expr) {
            const node = expr[key];
            const lhs = exprField(node, "lhs", "amount");
            const rhs = exprField(node, "rhs", "bps");
            return encodeBinary(tag, lhs, rhs);
        }
    }
    if ("mulDivFloor" in expr) {
        const n = expr.mulDivFloor;
        return encodeTernary(expr_variants_1.EXPR_TAG.mulDivFloor, exprField(n, "a"), exprField(n, "b"), exprField(n, "c"));
    }
    if ("mulDivCeil" in expr) {
        const n = expr.mulDivCeil;
        return encodeTernary(expr_variants_1.EXPR_TAG.mulDivCeil, exprField(n, "a"), exprField(n, "b"), exprField(n, "c"));
    }
    if ("clamp" in expr) {
        const n = expr.clamp;
        return encodeTernary(expr_variants_1.EXPR_TAG.clamp, exprField(n, "value"), exprField(n, "lo"), exprField(n, "hi"));
    }
    if ("select" in expr) {
        const n = expr.select;
        return encodeTernary(expr_variants_1.EXPR_TAG.select, exprField(n, "cond"), exprField(n, "thenExpr", "then_expr"), exprField(n, "elseExpr", "else_expr"));
    }
    if ("constPubkey" in expr) {
        const bytes = Buffer.from(expr.constPubkey[0]);
        if (bytes.length !== 32) {
            throw new Error(`constPubkey must be 32 bytes, got ${bytes.length}`);
        }
        return Buffer.concat([Buffer.from([expr_variants_1.EXPR_TAG.constPubkey]), bytes]);
    }
    throw new Error("invalid Expr");
}
function encodeLetBinding(binding) {
    const key = let_binding_variants_1.LET_BINDING_VARIANT.find((k) => k in binding);
    if (key === undefined) {
        throw new Error("invalid LetBinding");
    }
    const tag = let_binding_variants_1.LET_BINDING_VARIANT.indexOf(key);
    const parts = [Buffer.from([tag])];
    const v = binding[key];
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
function encodeLetArgs(args) {
    return encodeU8LenVec(args.bindings, encodeLetBinding);
}
function encodeRawCpiPatch(patch) {
    const dataOffset = patch.dataOffset;
    if (dataOffset < 0 || dataOffset > 0xffff) {
        throw new Error(`RawCpiPatch.dataOffset out of u16 range: ${dataOffset}`);
    }
    const parts = [];
    writeU16(parts, dataOffset);
    parts.push(encodeValue(patch.source));
    return Buffer.concat(parts);
}
/** @deprecated Use {@link encodeRawCpiPatch} */
exports.encodeCpiPatch = encodeRawCpiPatch;
function encodePatchList(list) {
    return encodeU16LenVec(list, encodeRawCpiPatch);
}
function encodeCpi(step) {
    switch (step.kind) {
        case "static":
            return Buffer.concat([
                Buffer.from([
                    types_1.CPI_WIRE.static,
                    step.accountsStart,
                    step.accountsLen,
                ]),
                encodeU16LenBytes(step.data),
            ]);
        case "rawPatched":
            return Buffer.concat([
                Buffer.from([
                    types_1.CPI_WIRE.rawPatched,
                    step.accountsStart,
                    step.accountsLen,
                ]),
                encodeU16LenBytes(step.data),
                encodePatchList(step.patches),
            ]);
        case "structured":
            return Buffer.concat([
                Buffer.from([
                    types_1.CPI_WIRE.structured,
                    (0, structured_cpi_patch_1.structuredCpiPatchWireTag)(step.patch),
                    step.accountsStart,
                    step.accountsLen,
                ]),
                (0, structured_cpi_patch_1.encodeStructuredCpiPatchPayload)(step.patch),
            ]);
    }
}
function stepsFromArm(arm) {
    if (Array.isArray(arm.steps)) {
        return arm.steps;
    }
    if (Array.isArray(arm.cpis)) {
        return arm.cpis;
    }
    return [];
}
function encodeIfElseArm(arm) {
    switch (arm.kind) {
        case "skip":
            return Buffer.from([if_else_arm_1.IF_ELSE_ARM.skip]);
        case "revert":
            return Buffer.from([if_else_arm_1.IF_ELSE_ARM.revert]);
        case "cpi": {
            const steps = stepsFromArm(arm);
            if (steps.length === 0) {
                throw new Error("IfElseArm cpi requires at least one step");
            }
            return Buffer.concat([
                Buffer.from([(0, if_else_arm_1.ifElseArmStepTag)(steps.length)]),
                ...steps.map((step) => encodeCpi(step)),
            ]);
        }
        default:
            throw new Error(`unknown IfElseArm kind: ${arm.kind}`);
    }
}
function encodeIfElseArgs(args) {
    return Buffer.concat([
        encodeExpr(args.cond),
        encodeIfElseArm(args.thenArm),
        encodeIfElseArm(args.elseArm),
    ]);
}
