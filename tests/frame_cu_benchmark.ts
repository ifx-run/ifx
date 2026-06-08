/**
 * Frame tape_len vs instruction CU — regression harness for [frame CU optimization](../docs/frame-cu-optimization.md).
 *
 * Run: anchor test --detach then:
 *   IFX_LOG_TX=0 ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 \
 *   npx ts-mocha -p ./tsconfig.json -t 120000 --require tests/setup.ts \
 *   --grep "frame CU benchmark" tests/frame_cu_benchmark.ts
 */
import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import { randomBytes } from "crypto";
import {
  Keypair,
  PublicKey,
  Transaction,
  type Connection,
  type TransactionInstruction,
} from "@solana/web3.js";

import {
  arm,
  expr,
  FrameScratch,
  ifElseArgs,
  IFX_LOCALNET_PROGRAM_ID,
} from "../sdk/src";
import {
  LABEL_SETUP_CREATE_FRAME,
  planLocalFrame,
  sendAndConfirm,
} from "./helpers";

/** Clearly separated account sizes (~817 B / ~4.7 KB / ~8.8 KB; all under 10 KiB init cap). */
const TAPE_SIZES = [256, 4096, 8192] as const;

type TapeSize = (typeof TAPE_SIZES)[number];

type CuRow = {
  tapeLen: TapeSize;
  reset: number;
  let: number;
  assert: number;
  ifElseSkip: number;
};

async function simulateCu(
  connection: Connection,
  feePayer: PublicKey,
  signer: Keypair,
  ...instructions: TransactionInstruction[]
): Promise<number> {
  const tx = new Transaction();
  for (const ix of instructions) tx.add(ix);
  tx.feePayer = feePayer;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.sign(signer);
  const sim = await connection.simulateTransaction(tx);
  if (sim.value.err) {
    throw new Error(
      `simulate failed: ${JSON.stringify(sim.value.err)} logs=${JSON.stringify(sim.value.logs?.slice(-6))}`
    );
  }
  const cu = sim.value.unitsConsumed;
  if (cu === undefined) {
    throw new Error("simulate returned no unitsConsumed");
  }
  return cu;
}

function freshScratch(frame: PublicKey, tapeLen: TapeSize): FrameScratch {
  return new FrameScratch(frame, tapeLen, 0, 0, IFX_LOCALNET_PROGRAM_ID);
}

async function provisionFrame(
  provider: anchor.AnchorProvider,
  payer: PublicKey,
  tapeLen: TapeSize
): Promise<{ frame: PublicKey; tapeLen: TapeSize }> {
  const { ixCreate, frame } = planLocalFrame({
    payer,
    frameId: randomBytes(32),
    closeAuthority: payer,
    tapeLen,
  });
  await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);
  return { frame, tapeLen };
}

/** One binding on-chain so assert / if_else can read the frame without mutating it. */
async function seedOneBoolBinding(
  provider: anchor.AnchorProvider,
  frame: PublicKey,
  tapeLen: TapeSize
): Promise<ReturnType<FrameScratch["letConstBool"]>> {
  const scratch = freshScratch(frame, tapeLen);
  const bound = scratch.letConstBool(true);
  await sendAndConfirm(
    provider,
    `setup · seed bool @ tape=${tapeLen}`,
    scratch.ixReset(),
    scratch.ixLet(bound)
  );
  return bound;
}

function printCuMatrix(label: string, rows: CuRow[]): void {
  // eslint-disable-next-line no-console
  console.log(`\n[frame CU] ${label}`);
  // eslint-disable-next-line no-console
  console.table(
    rows.map((r) => ({
      tapeLen: r.tapeLen,
      reset: r.reset,
      let: r.let,
      assert: r.assert,
      ifElseSkip: r.ifElseSkip,
    }))
  );
}

describe("frame CU benchmark", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = provider.wallet.publicKey;
  const payerSigner = (provider.wallet as anchor.Wallet).payer;
  const connection = provider.connection;

  it("per-instruction CU vs tape_len (reset / let / assert / if_else Skip)", async function () {
    this.timeout(120_000);
    const rows: CuRow[] = [];

    for (const tapeLen of TAPE_SIZES) {
      const { frame } = await provisionFrame(provider, payer, tapeLen);

      const resetCu = await simulateCu(
        connection,
        payer,
        payerSigner,
        freshScratch(frame, tapeLen).ixReset()
      );

      // Fresh on-chain frame (cursor=0): single const append — mut write-back dominates.
      const letScratch = freshScratch(frame, tapeLen);
      const letCu = await simulateCu(
        connection,
        payer,
        payerSigner,
        letScratch.ixLet(letScratch.letConstU64(1))
      );

      const bound = await seedOneBoolBinding(provider, frame, tapeLen);
      const readScratch = freshScratch(frame, tapeLen);

      const assertCu = await simulateCu(
        connection,
        payer,
        payerSigner,
        readScratch.ixAssert(bound)
      );

      // Skip / Skip — no CPI; isolates readonly frame load + eval_bool.
      const ifElseCu = await simulateCu(
        connection,
        payer,
        payerSigner,
        readScratch.ixIfElse(
          ifElseArgs(expr.bool(true), arm.skip(), arm.skip())
        )
      );

      rows.push({
        tapeLen,
        reset: resetCu,
        let: letCu,
        assert: assertCu,
        ifElseSkip: ifElseCu,
      });
    }

    printCuMatrix(
      "one ix per simulate tx · if_else = Skip/Skip (no CPI)",
      rows
    );

    // Phase 2 (FrameAccount): mut paths are flat vs tape_len — O(1) header/record writes.
    for (const row of rows) {
      expect(row.reset).to.be.lessThan(2_500);
      expect(row.let).to.be.lessThan(3_500);
    }
    const small = rows.find((r) => r.tapeLen === 256)!;
    const large = rows.find((r) => r.tapeLen === 8192)!;
    expect(large.reset - small.reset).to.be.lessThan(100);
    expect(large.let - small.let).to.be.lessThan(100);

    // Readonly paths: also flat (layout parse only, no Borsh deserialize).
    expect(large.assert - small.assert).to.be.lessThan(100);
    expect(large.ifElseSkip - small.ifElseSkip).to.be.lessThan(100);
  });

  it("let CU scales with let ix count at fixed tape_len=8192", async function () {
    this.timeout(90_000);
    const tapeLen: TapeSize = 8192;
    const { frame } = await provisionFrame(provider, payer, tapeLen);

    const counts = [1, 3, 5] as const;
    const results: { letIxCount: number; totalCu: number; perLetCu: number }[] =
      [];

    for (const n of counts) {
      const scratch = freshScratch(frame, tapeLen);
      const ixs: TransactionInstruction[] = [scratch.ixReset()];
      for (let i = 0; i < n; i++) {
        ixs.push(scratch.ixLet(scratch.letConstU64(i + 1)));
      }
      const totalCu = await simulateCu(connection, payer, payerSigner, ...ixs);
      results.push({
        letIxCount: n,
        totalCu,
        perLetCu: Math.round(totalCu / n),
      });
    }

    // eslint-disable-next-line no-console
    console.log("\n[frame CU] reset + N×let in one tx (tape_len=8192)");
    // eslint-disable-next-line no-console
    console.table(results);

    const one = results.find((r) => r.letIxCount === 1)!;
    const five = results.find((r) => r.letIxCount === 5)!;

    // Phase 2: each let adds ~1.3k CU (record append), not ~20k (full write-back).
    expect(one.totalCu).to.be.lessThan(6_000);
    const extraLetCu = (five.totalCu - one.totalCu) / (five.letIxCount - 1);
    expect(extraLetCu).to.be.lessThan(4_000);
  });
});
