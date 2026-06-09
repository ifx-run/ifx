"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IFX_TYS = void 0;
exports.scratchValue = scratchValue;
exports.taggedExpr = taggedExpr;
exports.tyForIfxTy = tyForIfxTy;
exports.ifxTyFromValueType = ifxTyFromValueType;
exports.isScratchValue = isScratchValue;
exports.inferIfxTyFromExpr = inferIfxTyFromExpr;
exports.isExprLike = isExprLike;
const ty_1 = require("./ty");
exports.IFX_TYS = [
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
function scratchValue(binding, ref, letRemaining, knownTy) {
    const base = letRemaining === undefined
        ? { binding, ref }
        : { binding, ref, letRemaining };
    return knownTy === undefined ? base : { ...base, __ifxTy: knownTy };
}
function taggedExpr(ty, e) {
    return Object.assign(e, { __ifxTy: ty });
}
function tyForIfxTy(t) {
    return ty_1.Ty[t]();
}
function ifxTyFromValueType(ty) {
    for (const k of exports.IFX_TYS) {
        if (k in ty)
            return k;
    }
    throw new Error("unknown ValueType");
}
function isScratchValue(v) {
    return (typeof v === "object" &&
        v !== null &&
        "binding" in v &&
        "ref" in v &&
        typeof v.ref.index === "number");
}
const BOOL_EXPR_KEYS = new Set([
    "not",
    "isZero",
    "nonZero",
    "eq",
    "ne",
    "gt",
    "ge",
    "lt",
    "le",
    "and",
    "or",
]);
const UNARY_NUMERIC_KEYS = new Set(["neg", "asU64", "asU128"]);
const BINARY_NUMERIC_KEYS = new Set([
    "add",
    "sub",
    "mul",
    "div",
    "divFloor",
    "divCeil",
    "min",
    "max",
    "saturatingSub",
]);
/** Infer result type from a typed `Expr` tree. */
function inferIfxTyFromExpr(e, indexTypes) {
    const tagged = e;
    if (tagged.__ifxTy !== undefined) {
        return tagged.__ifxTy;
    }
    const node = e;
    if ("constBool" in node)
        return "bool";
    if ("constU8" in node)
        return "u8";
    if ("constU16" in node)
        return "u16";
    if ("constU32" in node)
        return "u32";
    if ("constU64" in node)
        return "u64";
    if ("constU128" in node)
        return "u128";
    if ("constI8" in node)
        return "i8";
    if ("constI16" in node)
        return "i16";
    if ("constI32" in node)
        return "i32";
    if ("constI64" in node)
        return "i64";
    if ("constI128" in node)
        return "i128";
    if ("constF32" in node)
        return "f32";
    if ("constF64" in node)
        return "f64";
    if ("constPubkey" in node)
        return "pubkey";
    if ("value" in node) {
        const idx = node.value.value.index;
        const ty = indexTypes?.get(idx);
        if (!ty) {
            throw new Error(`cannot infer type for Frame ref at index ${idx}; plan the value with let* first`);
        }
        return ty;
    }
    for (const key of BOOL_EXPR_KEYS) {
        if (key in node)
            return "bool";
    }
    if ("asU64" in node)
        return "u64";
    if ("asU128" in node)
        return "u128";
    if ("bpsMulFloor" in node || "bpsMulCeil" in node)
        return "u64";
    for (const key of UNARY_NUMERIC_KEYS) {
        if (key in node) {
            const inner = node[key].operand;
            if (key === "asU64")
                return "u64";
            if (key === "asU128")
                return "u128";
            return inferIfxTyFromExpr(inner, indexTypes);
        }
    }
    for (const key of BINARY_NUMERIC_KEYS) {
        if (key in node) {
            const inner = node[key];
            return inferIfxTyFromExpr(inner.lhs, indexTypes);
        }
    }
    if ("mulDivFloor" in node || "mulDivCeil" in node || "clamp" in node) {
        const inner = node[Object.keys(node)[0]].a
            ?? node[Object.keys(node)[0]].value;
        return inferIfxTyFromExpr(inner, indexTypes);
    }
    if ("select" in node) {
        const sel = node.select;
        const lt = inferIfxTyFromExpr(sel.thenExpr, indexTypes);
        const rt = inferIfxTyFromExpr(sel.elseExpr, indexTypes);
        if (lt !== rt) {
            throw new Error(`select branch type mismatch: ${lt} vs ${rt}`);
        }
        return lt;
    }
    throw new Error("unknown Expr shape");
}
function isExprLike(v) {
    if (typeof v !== "object" || v === null)
        return false;
    if (isScratchValue(v))
        return false;
    const keys = [
        "value",
        "constBool",
        "constU8",
        "constU16",
        "constU32",
        "constU64",
        "constU128",
        "constI8",
        "constI16",
        "constI32",
        "constI64",
        "constI128",
        "constF32",
        "constF64",
        "constPubkey",
        "not",
        "neg",
        "isZero",
        "nonZero",
        "asU64",
        "asU128",
        "add",
        "sub",
        "mul",
        "div",
        "divFloor",
        "divCeil",
        "min",
        "max",
        "eq",
        "ne",
        "gt",
        "ge",
        "lt",
        "le",
        "saturatingSub",
        "and",
        "or",
        "bpsMulFloor",
        "bpsMulCeil",
        "mulDivFloor",
        "mulDivCeil",
        "clamp",
        "select",
    ];
    return keys.some((k) => k in v);
}
