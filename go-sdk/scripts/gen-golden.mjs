#!/usr/bin/env node
/**
 * Regenerate go-sdk/testdata/ts_wire_golden.json from @ifx-run/sdk dist.
 * Run from repo root: node go-sdk/scripts/gen-golden.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { encodeExpr, encodeLetBinding } = await import(
  path.join(root, "sdk/dist/codec.js")
);
const { expr } = await import(path.join(root, "sdk/dist/expr/index.js"));
const { binding } = await import(path.join(root, "sdk/dist/binding.js"));
const { EXPR_VARIANT } = await import(path.join(root, "sdk/dist/expr-variants.js"));
const { LET_BINDING_VARIANT } = await import(
  path.join(root, "sdk/dist/let-binding-variants.js")
);

const U64 = expr.u64(1);
const U128 = expr.u128(2);
const BOOL = expr.bool(true);

function sampleExpr(key) {
  switch (key) {
    case "value":
      return { value: { value: { index: 0 } } };
    case "constBool":
      return expr.bool(false);
    case "constU8":
      return expr.u8(1);
    case "constU16":
      return expr.u16(1);
    case "constU32":
      return expr.u32(1);
    case "constU64":
      return U64;
    case "constU128":
      return U128;
    case "constI8":
      return expr.i8(-1);
    case "constI16":
      return expr.i16(-1);
    case "constI32":
      return expr.i32(-1);
    case "constI64":
      return expr.i64(-1);
    case "constI128":
      return expr.i128(-1);
    case "constF32":
      return expr.f32(1.5);
    case "constF64":
      return expr.f64(1.5);
    case "not":
      return expr.not(BOOL);
    case "neg":
      return expr.neg(expr.i64(-3));
    case "isZero":
      return expr.isZero(U64);
    case "nonZero":
      return expr.nonZero(U64);
    case "asU64":
      return expr.asU64(U128);
    case "asU128":
      return expr.asU128(U64);
    case "add":
      return expr.add(U64, U64);
    case "sub":
      return expr.sub(U64, U64);
    case "mul":
      return expr.mul(U64, U64);
    case "div":
      return expr.div(U64, U64);
    case "divFloor":
      return expr.divFloor(U64, U64);
    case "divCeil":
      return expr.divCeil(U64, U64);
    case "min":
      return expr.min(U64, U64);
    case "max":
      return expr.max(U64, U64);
    case "eq":
      return expr.eq(U64, U64);
    case "ne":
      return expr.ne(U64, U64);
    case "gt":
      return expr.gt(U64, U64);
    case "ge":
      return expr.ge(U64, U64);
    case "lt":
      return expr.lt(U64, U64);
    case "le":
      return expr.le(U64, U64);
    case "saturatingSub":
      return expr.saturatingSub(U64, U64);
    case "and":
      return expr.and(BOOL, BOOL);
    case "or":
      return expr.or(BOOL, BOOL);
    case "bpsMulFloor":
      return expr.bpsMulFloor(U64, U64);
    case "bpsMulCeil":
      return expr.bpsMulCeil(U64, U64);
    case "mulDivFloor":
      return expr.mulDivFloor(U64, U64, U64);
    case "mulDivCeil":
      return expr.mulDivCeil(U64, U64, U64);
    case "clamp":
      return expr.clamp(U64, U64, U64);
    case "select":
      return expr.select(BOOL, U64, U64);
    default:
      throw new Error(`missing sample for ${key}`);
  }
}

function sampleBinding(key) {
  switch (key) {
    case "accountDataSlice":
      return binding.accountDataSlice({ u64: {} }, 0, 0, 0);
    case "accountLamports":
      return binding.accountLamports(0);
    case "accountDataLen":
      return binding.accountDataLen(0);
    case "eval":
      return binding.eval(expr.u64(1));
    case "sysvarClockSlot":
      return binding.sysvarClockSlot();
    case "sysvarClockEpochStartTimestamp":
      return binding.sysvarClockEpochStartTimestamp();
    case "sysvarClockEpoch":
      return binding.sysvarClockEpoch();
    case "sysvarClockLeaderScheduleEpoch":
      return binding.sysvarClockLeaderScheduleEpoch();
    case "sysvarClockUnixTimestamp":
      return binding.sysvarClockUnixTimestamp();
    case "sysvarRentMinimumBalance":
      return binding.sysvarRentMinimumBalance(165);
    case "splTokenAccountAmount":
      return binding.splTokenAccountAmount(0);
    case "splTokenAccountDelegatedAmount":
      return binding.splTokenAccountDelegatedAmount(0);
    case "splTokenAccountState":
      return binding.splTokenAccountState(0);
    case "splMintSupply":
      return binding.splMintSupply(0);
    case "splMintDecimals":
      return binding.splMintDecimals(0);
    case "splToken2022AccountAmount":
      return binding.splToken2022AccountAmount(0);
    case "splToken2022AccountDelegatedAmount":
      return binding.splToken2022AccountDelegatedAmount(0);
    case "splToken2022AccountState":
      return binding.splToken2022AccountState(0);
    case "splToken2022MintSupply":
      return binding.splToken2022MintSupply(0);
    case "splToken2022MintDecimals":
      return binding.splToken2022MintDecimals(0);
    case "splToken2022AccountTransferFeeWithheld":
      return binding.splToken2022AccountTransferFeeWithheld(0);
    case "splToken2022MintTransferFeeBasisPoints":
      return binding.splToken2022MintTransferFeeBasisPoints(0);
    case "splToken2022MintTransferFeeMaximum":
      return binding.splToken2022MintTransferFeeMaximum(0);
    case "splToken2022MintWithheldAmount":
      return binding.splToken2022MintWithheldAmount(0);
    case "splToken2022MintDefaultAccountState":
      return binding.splToken2022MintDefaultAccountState(0);
    default:
      throw new Error(`missing sample for ${key}`);
  }
}

const exprGolden = {};
for (const k of EXPR_VARIANT) {
  exprGolden[k] = encodeExpr(sampleExpr(k)).toString("hex");
}
const letGolden = {};
for (const k of LET_BINDING_VARIANT) {
  letGolden[k] = encodeLetBinding(sampleBinding(k)).toString("hex");
}

const outDir = path.join(root, "go-sdk/testdata");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "ts_wire_golden.json");
fs.writeFileSync(
  outPath,
  JSON.stringify({ expr: exprGolden, letBinding: letGolden }, null, 2) + "\n"
);
console.log("wrote", outPath);
