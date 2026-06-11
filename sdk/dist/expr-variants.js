"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPR_TAG = exports.EXPR_NEXT_TAG = exports.EXPR_VARIANT_COUNT = exports.EXPR_VARIANT = void 0;
/**
 * Wire tag order for on-chain [`Expr`](../../programs/ifx/src/state/types.rs).
 *
 * **Must match the Rust enum declaration exactly** (tags `0`–`51`). When adding a
 * variant: append here, extend `expr` builder + `codec` switch, program match arms, IDL.
 */
exports.EXPR_VARIANT = [
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
    "not",
    "neg",
    "isZero",
    "nonZero",
    "asU8",
    "asU16",
    "asU32",
    "asU64",
    "asU128",
    "asI8",
    "asI16",
    "asI32",
    "asI64",
    "asI128",
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
    "constPubkey",
];
exports.EXPR_VARIANT_COUNT = exports.EXPR_VARIANT.length;
/** Next append-only Expr tag (see `docs/implementation.md` §5). */
exports.EXPR_NEXT_TAG = exports.EXPR_VARIANT_COUNT;
/** Borsh discriminant map — tag index equals wire byte prefix. */
exports.EXPR_TAG = Object.fromEntries(exports.EXPR_VARIANT.map((key, tag) => [key, tag]));
