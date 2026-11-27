import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { randomBytes } from "crypto";

import { expr, staticCpi, type ScratchValue } from "../sdk/src";
import {
  expectIfxTxFail,
  LABEL_SETUP_CREATE_FRAME,
  planLocalFrame,
  sendAndConfirm,
} from "./helpers";

/** Localnet fixture: copies instruction data into return data. */
const RETURN_ECHO_PROGRAM_ID = new PublicKey(
  "DrC6aMeryjNBs2kmf7yE87MtWj8rwL1YEkWioK4xosJP"
);

function echoIx(data: Buffer): TransactionInstruction {
  return new TransactionInstruction({
    programId: RETURN_ECHO_PROGRAM_ID,
    keys: [],
    data,
  });
}

describe("ifx_let_patched_cpi", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  it("lets two u64 slices from one CPI return", async () => {
    const { scratch, ixCreate } = planLocalFrame({
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });
    await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

    const payload = Buffer.alloc(16);
    payload.writeBigUInt64LE(42n, 0);
    payload.writeBigUInt64LE(7n, 8);
    const built = staticCpi(echoIx(payload));
    const resetIx = scratch.ixReset();
    const { ix, values } = scratch.ixLetPatchedCpi(
      { cpi: built.staticStep, remaining: built.remaining },
      [
        { ty: "u64", offset: 0 },
        { ty: "u64", offset: 8 },
      ]
    );
    expect(values.map((v) => v.ref.index)).to.deep.equal([0, 1]);

    const sig = await sendAndConfirm(
      provider,
      "ifx_let_patched_cpi · two u64 lets",
      resetIx,
      ix
    );
    const tx = await provider.connection.getTransaction(sig, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    const logs = tx?.meta?.logMessages ?? [];
    expect(logs.some((line) => line.includes("let $0: u64 = return_data[+0]; //= 42"))).to
      .equal(true);
    expect(logs.some((line) => line.includes("let $1: u64 = return_data[+8]; //= 7"))).to
      .equal(true);
    const onChain = await scratch.fetchDecodedFrame(provider.connection);
    const first = values[0] as ScratchValue<"u64">;
    const second = values[1] as ScratchValue<"u64">;
    expect(onChain.readU64(first)).to.equal(42n);
    expect(onChain.readU64(second)).to.equal(7n);

    const sum = scratch.letEval(expr.add(expr.ref(first), expr.ref(second)));
    const assertIx = scratch.ixAssert(expr.eq(expr.ref(sum), expr.u64(49n)));
    await sendAndConfirm(
      provider,
      "ifx_let_patched_cpi · later expr sees both lets",
      scratch.ixLet(sum),
      assertIx
    );
  });

  it("fails when return data is shorter than the let", async () => {
    const { scratch, ixCreate } = planLocalFrame({
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });
    await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);
    const built = staticCpi(echoIx(Buffer.from([1])));
    const resetIx = scratch.ixReset();
    const { ix } = scratch.ixLetPatchedCpi(
      { cpi: built.staticStep, remaining: built.remaining },
      [{ ty: "u64", offset: 0 }]
    );
    await expectIfxTxFail(
      () => sendAndConfirm(provider, resetIx, ix),
      "ReturnDataTooShort"
    );
  });

  it("fails when the CPI sets no return data", async () => {
    const { scratch, ixCreate } = planLocalFrame({
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });
    await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);
    const transfer = SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: payer.publicKey,
      lamports: 1,
    });
    const built = staticCpi(transfer);
    const resetIx = scratch.ixReset();
    const { ix } = scratch.ixLetPatchedCpi(
      { cpi: built.staticStep, remaining: built.remaining },
      [{ ty: "u64", offset: 0 }]
    );
    await expectIfxTxFail(
      () => sendAndConfirm(provider, resetIx, ix),
      "ReturnDataMissing"
    );
  });
});
