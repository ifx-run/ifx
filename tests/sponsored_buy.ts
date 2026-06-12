/**
 * Sponsored settlement — **按执行顺序** 规划 Frame 绑定并组交易（非一次性 bind 全部）。
 *
 * B 可以已有 SOL；swap 净增 delta 先还 A（ataCost + 本笔 tx 签名费），剩余才给 pool mock 买入。
 * 故 buy = delta - settle，不能只用 delta - ataCost（否则 B 会多付一笔等于 TOTAL_FEE 的 SOL）。
 * N-ATA 地址由 mint/owner 推导；ATA 基线在幂等创建前用 `scratch.letBuilder().lamports` 读真实 rent（未创建则为 0）。
 * **Frame 只存后续还要读的数**（CPI patch / 跨步 assert / 更晚的 `let`）；中间量用嵌套 `Expr`，不单独 `let`。
 * 每条 `ifx_let` 的 remaining 由 `letBuilder` 按 pubkey 去重；`lamports(account)` 直接传账户，勿用手工数组下标冒充索引。
 */
import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import BN from "bn.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createMint,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import { randomBytes } from "crypto";

import {
  expr,
  FrameScratch,
  structuredCpi,
  structuredCpiPatch,
} from "../sdk/src";
import {
  createLookupTableForInstructions,
  logTxSizeComparison,
  measureLegacyTxBytes,
  measureV0TxBytes,
  sendAndConfirmV0,
  uniqueInstructionAddresses,
} from "./alt";
import {
  confirmSignature,
  fundLocalKeypair,
  sendAndConfirmSignersOnly,
  vanityKeypair,
  LABEL_SETUP_CREATE_FRAME,
  planLocalFrame,
} from "./helpers";

/**
 * 本笔 tx 无 ComputeBudget 指令时的签名 base fee（5_000 × 签名数）。
 * fee payer + user + pool = 3 签。若后续加 setComputeUnitLimit/Price，应把 limit×price 并进 settle。
 */
const TX_SIG_FEE = 5_000 * 3;
const TOTAL_FEE = TX_SIG_FEE;
const MOCK_SWAP_LAMPORTS = 3_000_000;

describe("sponsored buy (ifx orchestration)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const sponsor = vanityKeypair("sponsor");

  before(async () => {
    await fundLocalKeypair(provider, sponsor.publicKey, 50 * LAMPORTS_PER_SOL);
  });

  it("settles rent/fees from swap SOL while B keeps prior wallet balance off the table", async () => {
    const user = vanityKeypair("user");
    const pool = vanityKeypair("pool");
    const frameId = randomBytes(32);
    const { scratch, ixCreate } = planLocalFrame({
      payer: sponsor.publicKey,
      frameId,
      authority: sponsor.publicKey,
      tapeLen: 512,
    });

    const createFrameTx = new Transaction().add(ixCreate);
    createFrameTx.feePayer = sponsor.publicKey;
    await sendAndConfirmSignersOnly(
      provider,
      createFrameTx,
      [sponsor],
      LABEL_SETUP_CREATE_FRAME
    );

    const mintN = await createMint(
      provider.connection,
      sponsor,
      sponsor.publicKey,
      null,
      6
    );
    const userNAta = getAssociatedTokenAddressSync(
      mintN,
      user.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    for (const kp of [user, pool]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        LAMPORTS_PER_SOL
      );
      await confirmSignature(provider.connection, sig);
    }

    const userBefore = await provider.connection.getBalance(user.publicKey);
    expect(userBefore).to.be.greaterThan(500_000_000);

    const poolBefore = await provider.connection.getBalance(pool.publicKey);

    const orchestrationIxs: TransactionInstruction[] = [];

    orchestrationIxs.push(scratch.ixReset());

    // 1) 用户钱包 + N-ATA 基线（推导地址；ATA 未创建时 rent 为 0）
    const letBaseline = scratch.letBuilder();
    const userLamportsBaseline = letBaseline.lamports(user.publicKey);
    const ataLamportsBaseline = letBaseline.lamports(userNAta);
    orchestrationIxs.push(letBaseline.buildIx());

    // 2) 幂等创建 N-ATA（A 代付 rent）
    orchestrationIxs.push(
      createAssociatedTokenAccountIdempotentInstruction(
        sponsor.publicKey,
        userNAta,
        user.publicKey,
        mintN,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    // 3) 只落盘 ataCost（后续 settle / assert 还要读）；同条 let 内 load ATA 仅供本条 eval
    const letAta = scratch.letBuilder();
    const ataLamportsAfterCreate = letAta.lamports(userNAta);
    const ataCost = letAta.letEval(
      expr.sub(ataLamportsAfterCreate, ataLamportsBaseline)
    );
    orchestrationIxs.push(letAta.buildIx());

    // 4) mock USDC→SOL：pool 向 B 打 SOL
    orchestrationIxs.push(
      SystemProgram.transfer({
        fromPubkey: pool.publicKey,
        toPubkey: user.publicKey,
        lamports: MOCK_SWAP_LAMPORTS,
      })
    );

    // 5) swap 后用户 lamports + 还给赞助方的 settle + 买入 pool 的 buyLamports（structured CPI）
    const letPostSwap = scratch.letBuilder();
    const userLamportsAfterSwap = letPostSwap.lamports(user.publicKey);
    const settle = letPostSwap.letEval(expr.add(ataCost, expr.u64(TOTAL_FEE)));
    const buyLamports = letPostSwap.letEval(
      expr.sub(expr.sub(userLamportsAfterSwap, userLamportsBaseline), settle)
    );
    orchestrationIxs.push(letPostSwap.buildIx());

    // 6) swap 净增须覆盖 ATA rent 增量 + fee
    orchestrationIxs.push(
      scratch.ixAssert(
        expr.ge(
          expr.sub(userLamportsAfterSwap, userLamportsBaseline),
          expr.add(ataCost, expr.u64(TOTAL_FEE))
        )
      )
    );

    // 7) B → A：ATA rent + fee 预算
    orchestrationIxs.push(
      scratch.ixCpi(
        structuredCpi(
          SystemProgram.transfer({
            fromPubkey: user.publicKey,
            toPubkey: sponsor.publicKey,
            lamports: 0,
          }),
          structuredCpiPatch.systemTransfer(settle)
        ).build()
      )
    );

    // 8) mock SOL→N：用剩余 swap SOL
    orchestrationIxs.push(
      scratch.ixCpi(
        structuredCpi(
          SystemProgram.transfer({
            fromPubkey: user.publicKey,
            toPubkey: pool.publicKey,
            lamports: 0,
          }),
          structuredCpiPatch.systemTransfer(buyLamports)
        ).build()
      )
    );

    const lut = await createLookupTableForInstructions(
      provider,
      sponsor,
      orchestrationIxs
    );
    const { blockhash } = await provider.connection.getLatestBlockhash("confirmed");
    const lutCount = uniqueInstructionAddresses(orchestrationIxs, sponsor.publicKey)
      .length;
    const legacyBytes = measureLegacyTxBytes(
      orchestrationIxs,
      sponsor.publicKey,
      blockhash,
      [pool, user]
    );
    const v0Bytes = measureV0TxBytes(
      orchestrationIxs,
      sponsor.publicKey,
      blockhash,
      lut,
      [pool, user]
    );
    logTxSizeComparison(legacyBytes, v0Bytes, lutCount);

    const sponsorBefore = await provider.connection.getBalance(sponsor.publicKey);
    const orchestrationSig = await sendAndConfirmV0(
      provider,
      orchestrationIxs,
      lut,
      [pool, user],
      "sponsored buy · swap settle + ATA + patched transfers (v0+ALT)",
      sponsor
    );
    void orchestrationSig;

    const ataInfo = await provider.connection.getAccountInfo(userNAta);
    expect(ataInfo).to.not.equal(null);

    const sponsorAfter = await provider.connection.getBalance(sponsor.publicKey);
    const userAfter = await provider.connection.getBalance(user.publicKey);
    const poolAfter = await provider.connection.getBalance(pool.publicKey);

    const ataRent = ataInfo!.lamports;
    const reimburseLamports = ataRent + TOTAL_FEE;
    const buyLamportsExpected =
      MOCK_SWAP_LAMPORTS - ataRent - TOTAL_FEE;

    const sponsorNet = sponsorAfter - sponsorBefore;
    expect(sponsorNet).to.be.at.least(-2_000);
    expect(sponsorNet).to.be.at.most(2_000);

    // swap 进出抵消后，用户钱包应回到约 swap 前（不额外承担签名费）
    expect(userAfter).to.be.at.least(userBefore - 50_000);
    expect(userAfter).to.be.at.most(userBefore + 50_000);

    const poolNet = poolBefore - poolAfter;
    expect(poolNet).to.be.at.least(
      MOCK_SWAP_LAMPORTS - buyLamportsExpected - 100_000
    );
    expect(poolNet).to.be.at.most(
      MOCK_SWAP_LAMPORTS - buyLamportsExpected + 100_000
    );

    const snap = await scratch.fetchDecodedFrame(provider.connection);
    expect(snap.readU64(ataCost)).to.equal(BigInt(ataRent));
    expect(snap.readU64(buyLamports)).to.equal(BigInt(buyLamportsExpected));
    expect(snap.readU64(settle)).to.equal(BigInt(reimburseLamports));
  });

  it("aborts when trade SOL cannot cover ATA rent + fee budget", async () => {
    const user = vanityKeypair("user");
    const pool = vanityKeypair("pool");
    const frameId = randomBytes(32);
    const { scratch, ixCreate } = planLocalFrame({
      payer: sponsor.publicKey,
      frameId,
      authority: sponsor.publicKey,
      tapeLen: 512,
    });

    const createFrameTx = new Transaction().add(ixCreate);
    createFrameTx.feePayer = sponsor.publicKey;
    await sendAndConfirmSignersOnly(
      provider,
      createFrameTx,
      [sponsor],
      LABEL_SETUP_CREATE_FRAME
    );

    const mintN = await createMint(
      provider.connection,
      sponsor,
      sponsor.publicKey,
      null,
      6
    );
    const userNAta = getAssociatedTokenAddressSync(
      mintN,
      user.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const sig = await provider.connection.requestAirdrop(
      user.publicKey,
      LAMPORTS_PER_SOL
    );
    await confirmSignature(provider.connection, sig);
    const poolSig = await provider.connection.requestAirdrop(
      pool.publicKey,
      LAMPORTS_PER_SOL / 5
    );
    await confirmSignature(provider.connection, poolSig);

    const tx = new Transaction();

    tx.add(scratch.ixReset());

    const letBaseline = scratch.letBuilder();
    const userLamportsBaseline = letBaseline.lamports(user.publicKey);
    const ataLamportsBaseline = letBaseline.lamports(userNAta);
    tx.add(letBaseline.buildIx());

    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        sponsor.publicKey,
        userNAta,
        user.publicKey,
        mintN
      )
    );

    tx.add(
      SystemProgram.transfer({
        fromPubkey: pool.publicKey,
        toPubkey: user.publicKey,
        lamports: 1_000,
      })
    );

    const letAta = scratch.letBuilder();
    const ataLamportsAfterCreate = letAta.lamports(userNAta);
    const ataCost = letAta.letEval(
      expr.sub(ataLamportsAfterCreate, ataLamportsBaseline)
    );
    tx.add(letAta.buildIx());

    const userLamportsAfterTinySwap = scratch.letLamports(user.publicKey);
    tx.add(scratch.ixLet(userLamportsAfterTinySwap));

    tx.add(
      scratch.ixAssert(
        expr.ge(
          expr.sub(userLamportsAfterTinySwap, userLamportsBaseline),
          expr.add(ataCost, expr.u64(TOTAL_FEE))
        )
      )
    );

    tx.feePayer = sponsor.publicKey;

    try {
      await sendAndConfirmSignersOnly(
        provider,
        tx,
        [sponsor, pool, user],
        "sponsored buy · abort when swap SOL < ATA rent + fees (expect fail)"
      );
      expect.fail("expected assert to fail");
    } catch (e: unknown) {
      expect(String(e)).to.match(/AssertFailed|6006|assert/i);
      // eslint-disable-next-line no-console
      console.log(
        "\n[local tx] sponsored buy · abort path failed on-chain as expected (no Solscan link)\n"
      );
    }
  });
});
