"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expr = exports.toCond = exports.taggedExpr = exports.scratchValue = exports.isScratchValue = void 0;
exports.resolveRef = resolveRef;
const bn_js_1 = __importDefault(require("bn.js"));
const binding_1 = require("../binding");
const typed_1 = require("../typed");
Object.defineProperty(exports, "isScratchValue", { enumerable: true, get: function () { return typed_1.isScratchValue; } });
Object.defineProperty(exports, "scratchValue", { enumerable: true, get: function () { return typed_1.scratchValue; } });
Object.defineProperty(exports, "taggedExpr", { enumerable: true, get: function () { return typed_1.taggedExpr; } });
var cond_1 = require("./cond");
Object.defineProperty(exports, "toCond", { enumerable: true, get: function () { return cond_1.toCond; } });
const UINT_WIDTH = {
    u8: 1,
    u16: 2,
    u32: 4,
    u64: 8,
    u128: 16,
};
function isNarrowerOrEqualUint(c, base) {
    const cw = UINT_WIDTH[c];
    const bw = UINT_WIDTH[base];
    return cw !== undefined && bw !== undefined && cw <= bw;
}
function isBpsTy(ty) {
    return ty === "u8" || ty === "u16" || ty === "u32" || ty === "u64";
}
function toOperand(x) {
    if ((0, typed_1.isScratchValue)(x)) {
        return exports.expr.ref(x);
    }
    return x;
}
function asCast(ty, key, operand) {
    return (0, typed_1.taggedExpr)(ty, { [key]: { operand: toOperand(operand) } });
}
function bin(key, lhs, rhs) {
    const ty = inferBinaryTy(lhs, rhs);
    return (0, typed_1.taggedExpr)(ty, {
        [key]: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    });
}
function resolveRef(s) {
    if ((0, typed_1.isScratchValue)(s))
        return s.ref;
    return s;
}
/** Build wire {@link Expr} trees (1:1 with on-chain). Combine freely with {@link ScratchValue}. */
exports.expr = {
    ref(s) {
        return (0, typed_1.taggedExpr)(ifxTyFromScratch(s), {
            value: { value: { index: s.ref.index } },
        });
    },
    bool: (v) => (0, typed_1.taggedExpr)("bool", { constBool: [v] }),
    u8: (v) => (0, typed_1.taggedExpr)("u8", { constU8: [v] }),
    u16: (v) => (0, typed_1.taggedExpr)("u16", { constU16: [v] }),
    u32: (v) => (0, typed_1.taggedExpr)("u32", { constU32: [v] }),
    u64: (v) => (0, typed_1.taggedExpr)("u64", { constU64: [new bn_js_1.default(v.toString())] }),
    u128: (v) => (0, typed_1.taggedExpr)("u128", { constU128: [new bn_js_1.default(v.toString())] }),
    i8: (v) => (0, typed_1.taggedExpr)("i8", { constI8: [v] }),
    i16: (v) => (0, typed_1.taggedExpr)("i16", { constI16: [v] }),
    i32: (v) => (0, typed_1.taggedExpr)("i32", { constI32: [v] }),
    i64: (v) => (0, typed_1.taggedExpr)("i64", { constI64: [new bn_js_1.default(v.toString())] }),
    i128: (v) => (0, typed_1.taggedExpr)("i128", { constI128: [new bn_js_1.default(v.toString())] }),
    f32: (v) => (0, typed_1.taggedExpr)("f32", { constF32: [v] }),
    f64: (v) => (0, typed_1.taggedExpr)("f64", { constF64: [v] }),
    pubkey: (pk) => {
        const bytes = Buffer.isBuffer(pk) ? pk : pk.toBuffer();
        if (bytes.length !== 32) {
            throw new Error(`expr.pubkey requires 32 bytes, got ${bytes.length}`);
        }
        return (0, typed_1.taggedExpr)("pubkey", { constPubkey: [Array.from(bytes)] });
    },
    not: (operand) => (0, typed_1.taggedExpr)("bool", { not: { operand } }),
    neg: (operand) => (0, typed_1.taggedExpr)(exprTy(operand), { neg: { operand } }),
    isZero: (operand) => (0, typed_1.taggedExpr)("bool", { isZero: { operand: toOperand(operand) } }),
    nonZero: (operand) => (0, typed_1.taggedExpr)("bool", { nonZero: { operand: toOperand(operand) } }),
    asU8: (operand) => asCast("u8", "asU8", operand),
    asU16: (operand) => asCast("u16", "asU16", operand),
    asU32: (operand) => asCast("u32", "asU32", operand),
    asU64: (operand) => asCast("u64", "asU64", operand),
    asU128: (operand) => asCast("u128", "asU128", operand),
    asI8: (operand) => asCast("i8", "asI8", operand),
    asI16: (operand) => asCast("i16", "asI16", operand),
    asI32: (operand) => asCast("i32", "asI32", operand),
    asI64: (operand) => asCast("i64", "asI64", operand),
    asI128: (operand) => asCast("i128", "asI128", operand),
    add: (lhs, rhs) => bin("add", lhs, rhs),
    sub: (lhs, rhs) => bin("sub", lhs, rhs),
    mul: (lhs, rhs) => bin("mul", lhs, rhs),
    div: (lhs, rhs) => bin("div", lhs, rhs),
    divFloor: (lhs, rhs) => bin("divFloor", lhs, rhs),
    divCeil: (lhs, rhs) => bin("divCeil", lhs, rhs),
    min: (lhs, rhs) => bin("min", lhs, rhs),
    max: (lhs, rhs) => bin("max", lhs, rhs),
    eq: (lhs, rhs) => (0, typed_1.taggedExpr)("bool", {
        eq: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    }),
    ne: (lhs, rhs) => (0, typed_1.taggedExpr)("bool", {
        ne: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    }),
    gt: (lhs, rhs) => (0, typed_1.taggedExpr)("bool", {
        gt: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    }),
    ge: (lhs, rhs) => (0, typed_1.taggedExpr)("bool", {
        ge: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    }),
    lt: (lhs, rhs) => (0, typed_1.taggedExpr)("bool", {
        lt: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    }),
    le: (lhs, rhs) => (0, typed_1.taggedExpr)("bool", {
        le: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    }),
    saturatingSub: (lhs, rhs) => bin("saturatingSub", lhs, rhs),
    and: (lhs, rhs) => (0, typed_1.taggedExpr)("bool", {
        and: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    }),
    or: (lhs, rhs) => (0, typed_1.taggedExpr)("bool", {
        or: { lhs: toOperand(lhs), rhs: toOperand(rhs) },
    }),
    /**
     * `⌊amount × bps / 10_000⌋`. `amount` is `u64`; `bps` may be `u8`/`u16`/`u32`/`u64`
     * (promoted on-chain). Result is always `u64`.
     */
    bpsMulFloor: (amount, bps) => {
        const bpsT = exprTy(bps);
        if (!isBpsTy(bpsT)) {
            throw new Error(`bpsMul expects u8/u16/u32/u64 bps, got ${bpsT}`);
        }
        return (0, typed_1.taggedExpr)("u64", {
            bpsMulFloor: { amount: toOperand(amount), bps: toOperand(bps) },
        });
    },
    /** Like {@link expr.bpsMulFloor} with ceiling division. */
    bpsMulCeil: (amount, bps) => {
        const bpsT = exprTy(bps);
        if (!isBpsTy(bpsT)) {
            throw new Error(`bpsMul expects u8/u16/u32/u64 bps, got ${bpsT}`);
        }
        return (0, typed_1.taggedExpr)("u64", {
            bpsMulCeil: { amount: toOperand(amount), bps: toOperand(bps) },
        });
    },
    /**
     * `⌊a × b / c⌋`. `a`/`b` are `u64` or `u128` (same type); `c` may be the same
     * or any narrower unsigned (`u8`…`T`). Result type follows `a`.
     */
    mulDivFloor: (a, b, c) => {
        inferMulDivTy(a, b, c);
        const ty = exprTy(a);
        return (0, typed_1.taggedExpr)(ty, {
            mulDivFloor: { a: toOperand(a), b: toOperand(b), c: toOperand(c) },
        });
    },
    /** Like {@link expr.mulDivFloor} with ceiling division. */
    mulDivCeil: (a, b, c) => {
        inferMulDivTy(a, b, c);
        const ty = exprTy(a);
        return (0, typed_1.taggedExpr)(ty, {
            mulDivCeil: { a: toOperand(a), b: toOperand(b), c: toOperand(c) },
        });
    },
    clamp: (value, lo, hi) => {
        const ty = inferTernaryTy(value, lo, hi);
        return (0, typed_1.taggedExpr)(ty, {
            clamp: {
                value: toOperand(value),
                lo: toOperand(lo),
                hi: toOperand(hi),
            },
        });
    },
    select: (cond, thenExpr, elseExpr) => {
        const ty = inferBinaryTy(thenExpr, elseExpr);
        return (0, typed_1.taggedExpr)(ty, {
            select: {
                cond: toOperand(cond),
                thenExpr: toOperand(thenExpr),
                elseExpr: toOperand(elseExpr),
            },
        });
    },
};
function ifxTyFromScratch(s) {
    return (s.__ifxTy ?? (0, binding_1.inferBindingTy)(s.binding));
}
function inferBinaryTy(lhs, rhs) {
    const l = exprTy(lhs);
    const r = exprTy(rhs);
    if (l !== r) {
        throw new Error(`expr operand type mismatch: ${l} vs ${r}`);
    }
    return l;
}
function inferMulDivTy(a, b, c) {
    const ta = exprTy(a);
    const tb = exprTy(b);
    if (ta !== tb) {
        throw new Error(`expr operand type mismatch: ${ta} vs ${tb}`);
    }
    if (ta !== "u64" && ta !== "u128") {
        throw new Error(`mulDiv expects u64 or u128, got ${ta}`);
    }
    const tc = exprTy(c);
    if (!isNarrowerOrEqualUint(tc, ta)) {
        throw new Error(`mulDiv divisor type ${tc} is wider than ${ta}`);
    }
    return ta;
}
function inferTernaryTy(a, b, c) {
    const ta = exprTy(a);
    const tb = exprTy(b);
    const tc = exprTy(c);
    if (ta !== tb || tb !== tc) {
        throw new Error(`expr operand type mismatch: ${ta} vs ${tb} vs ${tc}`);
    }
    if (ta !== "u64" && ta !== "u128") {
        throw new Error(`mulDiv/clamp expect u64 or u128, got ${ta}`);
    }
    return ta;
}
function exprTy(x) {
    if ((0, typed_1.isScratchValue)(x))
        return ifxTyFromScratch(x);
    return x.__ifxTy ?? "u64";
}
