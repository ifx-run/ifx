import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import { randomBytes } from "crypto";

import { expr, FrameScratch } from "../sdk/src";
import {
  expectIfxTxFail,
  sendAndConfirm,
  LABEL_SETUP_CREATE_FRAME,
  planLocalFrame,
} from "./helpers";

describe("ifx flat expr ops (on-chain)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  async function provisionFrame(tapeLen = 256): Promise<FrameScratch> {
    const frameId = randomBytes(32);
    const { scratch, ixCreate } = planLocalFrame({
      payer: payer.publicKey,
      frameId,
      closeAuthority: payer.publicKey,
      tapeLen,
    });
    await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);
    return scratch;
  }

  it("evaluates mulDivFloor, mulDivCeil, bpsMulFloor, divFloor, divCeil", async () => {
    const scratch = await provisionFrame();
    const b = scratch.letBuilder();
    const floor = b.letEval(
      expr.mulDivFloor(expr.u64(100), expr.u64(50), expr.u64(10))
    );
    const ceil = b.letEval(
      expr.mulDivCeil(expr.u64(100), expr.u64(1), expr.u64(3))
    );
    const bps = b.letEval(
      expr.bpsMulFloor(expr.u64(1_000_000), expr.u64(50))
    );
    const divF = b.letEval(expr.divFloor(expr.u64(7), expr.u64(2)));
    const divC = b.letEval(expr.divCeil(expr.u64(7), expr.u64(2)));
    await sendAndConfirm(
      provider,
      "ifx expr · mulDivFloor / mulDivCeil / bpsMulFloor / divFloor / divCeil",
      scratch.ixReset(),
      b.buildIx()
    );

    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.readU64(floor)).to.equal(500n);
    expect(on.readU64(ceil)).to.equal(34n);
    expect(on.readU64(bps)).to.equal(5000n);
    expect(on.readU64(divF)).to.equal(3n);
    expect(on.readU64(divC)).to.equal(4n);
  });

  it("evaluates saturatingSub, clamp, and select", async () => {
    const scratch = await provisionFrame();
    const b = scratch.letBuilder();
    const sat = b.letEval(expr.saturatingSub(expr.u64(10), expr.u64(100)));
    const clamped = b.letEval(
      expr.clamp(expr.u64(15), expr.u64(0), expr.u64(10))
    );
    const pickT = b.letEval(
      expr.select(expr.bool(true), expr.u64(1), expr.u64(2))
    );
    const pickF = b.letEval(
      expr.select(expr.bool(false), expr.u64(3), expr.u64(4))
    );
    await sendAndConfirm(
      provider,
      "ifx expr · saturatingSub / clamp / select",
      scratch.ixReset(),
      b.buildIx()
    );

    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.readU64(sat)).to.equal(0n);
    expect(on.readU64(clamped)).to.equal(10n);
    expect(on.readU64(pickT)).to.equal(1n);
    expect(on.readU64(pickF)).to.equal(4n);
  });

  it("evaluates isZero, nonZero, and, or", async () => {
    const scratch = await provisionFrame();
    const b = scratch.letBuilder();
    const zero = b.letEval(expr.isZero(expr.u64(0)));
    const nz = b.letEval(expr.nonZero(expr.u64(1)));
    const andT = b.letEval(expr.and(expr.bool(true), expr.bool(false)));
    const orT = b.letEval(expr.or(expr.bool(false), expr.bool(true)));
    await sendAndConfirm(
      provider,
      "ifx expr · isZero / nonZero / and / or",
      scratch.ixReset(),
      b.buildIx()
    );

    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.readBool(zero)).to.equal(true);
    expect(on.readBool(nz)).to.equal(true);
    expect(on.readBool(andT)).to.equal(false);
    expect(on.readBool(orT)).to.equal(true);
  });

  it("evaluates asU128 widen and asU64 narrow", async () => {
    const scratch = await provisionFrame();
    const b = scratch.letBuilder();
    const wide = b.letEval(expr.asU128(expr.u64(42)));
    const narrow = b.letEval(expr.asU64(wide));
    await sendAndConfirm(
      provider,
      "ifx expr · asU128 widen / asU64 narrow",
      scratch.ixReset(),
      b.buildIx()
    );

    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.readU128(wide)).to.equal(42n);
    expect(on.readU64(narrow)).to.equal(42n);
  });

  it("reverts asU64 when u128 does not fit", async () => {
    const scratch = await provisionFrame();
    const b = scratch.letBuilder();
    const huge = b.letEval(expr.u128(18446744073709551616n));
    b.letEval(expr.asU64(huge));

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx expr · asU64 overflow (expect CastOverflow)",
          scratch.ixReset(),
          b.buildIx()
        ),
      "CastOverflow"
    );
  });

  it("evaluates add / sub / mul / div / min / max on u64", async () => {
    const scratch = await provisionFrame();
    const b = scratch.letBuilder();
    const sum = b.letEval(expr.add(expr.u64(10), expr.u64(5)));
    const diff = b.letEval(expr.sub(expr.u64(10), expr.u64(3)));
    const prod = b.letEval(expr.mul(expr.u64(6), expr.u64(7)));
    const quot = b.letEval(expr.div(expr.u64(20), expr.u64(4)));
    const lo = b.letEval(expr.min(expr.u64(3), expr.u64(9)));
    const hi = b.letEval(expr.max(expr.u64(3), expr.u64(9)));
    await sendAndConfirm(
      provider,
      "ifx expr · add sub mul div min max",
      scratch.ixReset(),
      b.buildIx()
    );
    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.readU64(sum)).to.equal(15n);
    expect(on.readU64(diff)).to.equal(7n);
    expect(on.readU64(prod)).to.equal(42n);
    expect(on.readU64(quot)).to.equal(5n);
    expect(on.readU64(lo)).to.equal(3n);
    expect(on.readU64(hi)).to.equal(9n);
  });

  it("evaluates eq / ne / gt / ge / lt / le comparisons", async () => {
    const scratch = await provisionFrame();
    const b = scratch.letBuilder();
    const eqT = b.letEval(expr.eq(expr.u64(2), expr.u64(2)));
    const neT = b.letEval(expr.ne(expr.u64(1), expr.u64(2)));
    const gtT = b.letEval(expr.gt(expr.u64(3), expr.u64(2)));
    const geT = b.letEval(expr.ge(expr.u64(2), expr.u64(2)));
    const ltT = b.letEval(expr.lt(expr.u64(1), expr.u64(2)));
    const leT = b.letEval(expr.le(expr.u64(1), expr.u64(1)));
    await sendAndConfirm(
      provider,
      "ifx expr · eq ne gt ge lt le",
      scratch.ixReset(),
      b.buildIx(),
      scratch.ixAssert(eqT),
      scratch.ixAssert(neT),
      scratch.ixAssert(gtT),
      scratch.ixAssert(geT),
      scratch.ixAssert(ltT),
      scratch.ixAssert(leT)
    );
  });

  it("evaluates not, neg, bpsMulCeil, and numeric const widths", async () => {
    const scratch = await provisionFrame(512);
    const b = scratch.letBuilder();
    const inv = b.letEval(expr.not(expr.bool(true)));
    const negI = b.letEval(expr.neg(expr.i64(-4)));
    const bpsC = b.letEval(expr.bpsMulCeil(expr.u64(10_000), expr.u64(3333)));
    const u16v = b.letEval(expr.u16(42_000));
    const i32v = b.letEval(expr.i32(-7));
    const f32v = b.letEval(expr.f32(1.25));
    const f64v = b.letEval(expr.f64(2.5));
    await sendAndConfirm(
      provider,
      "ifx expr · not neg bpsMulCeil const widths",
      scratch.ixReset(),
      b.buildIx()
    );
    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.readBool(inv)).to.equal(false);
    expect(on.readI64(negI)).to.equal(4n);
    expect(on.readU64(bpsC)).to.equal(3333n);
    expect(on.readU16(u16v)).to.equal(42_000);
    expect(on.readI32(i32v)).to.equal(-7);
    expect(on.readF32(f32v)).to.be.closeTo(1.25, 0.001);
    expect(on.readF64(f64v)).to.be.closeTo(2.5, 0.001);
  });

  it("evaluates ordered float compare on finite values", async () => {
    const scratch = await provisionFrame();
    const b = scratch.letBuilder();
    const ok = b.letEval(expr.lt(expr.f64(1.5), expr.f64(2.0)));
    await sendAndConfirm(
      provider,
      "ifx expr · f64 lt",
      scratch.ixReset(),
      b.buildIx(),
      scratch.ixAssert(ok)
    );
  });
});
