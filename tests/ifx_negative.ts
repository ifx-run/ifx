/**
 * On-chain negative paths (incl. IFX-SEC-E02 LetNotTopLevel via ifx_if_else self-CPI).
 */
import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { randomBytes } from "crypto";
import {
  createTransferCheckedInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import {
  arm,
  binding,
  buildIxAssert,
  buildIxLet,
  rawCpiPatch,
  encodeCpi,
  expr,
  IFX_LOCALNET_PROGRAM_ID,
  ifElseArgs,
  rawCpi,
  staticCpi,
  structuredCpi,
  structuredCpiPatch,
} from "../sdk/src";
import { IX_DISC_PATCHED_CPI } from "../sdk/src/constants";
import { createIxResetFrame, IX_DISCRIMINATOR } from "../sdk/src/ix";
import { encodeLetArgs } from "../sdk/src/codec";
import { TransactionInstruction } from "@solana/web3.js";
import type { Expr } from "../sdk/src/types";
import {
  expectIfxTxFail,
  provisionLocalFrame,
  sendAndConfirm,
} from "./helpers";

describe("ifx negative (on-chain errors)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  it("ifx_let rejects CPI nested in ifx_if_else static arm.cpi (LetNotTopLevel)", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const nestedLetIx = buildIxLet(
      scratch.frame,
      scratch.authority,
      { bindings: [binding.eval(expr.u8(1))] },
      [],
      { programId: IFX_LOCALNET_PROGRAM_ID }
    );
    const nested = staticCpi(nestedLetIx);

    const b = scratch.letBuilder();
    const cond = b.letConstBool(true);

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · LetNotTopLevel via if_else cpi (expect fail)",
          scratch.ixReset(),
          b.buildIx(),
          scratch.ixIfElse(
            ifElseArgs(cond, arm.cpi(nested.staticStep), arm.skip()),
            nested.remaining
          )
        ),
      "LetNotTopLevel"
    );
  });

  it("ifx_if_else skip arm does not invoke nested ifx_let (LetNotTopLevel control)", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const nestedLetIx = buildIxLet(
      scratch.frame,
      scratch.authority,
      { bindings: [binding.eval(expr.u8(99))] },
      [],
      { programId: IFX_LOCALNET_PROGRAM_ID }
    );
    const nested = staticCpi(nestedLetIx);

    const b = scratch.letBuilder();
    const cond = b.letConstBool(false);

    await sendAndConfirm(
      provider,
      "ifx · if_else skip avoids nested let CPI",
      scratch.ixReset(),
      b.buildIx(),
      scratch.ixIfElse(
        ifElseArgs(cond, arm.cpi(nested.staticStep), arm.skip()),
        nested.remaining
      )
    );

    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.indexCount).to.equal(1);
    expect(on.readBool(cond)).to.equal(false);
  });

  it("ifx_let rejects out-of-range remaining account_index", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · InvalidAccountIndex (expect fail)",
          scratch.ixReset(),
          buildIxLet(
      scratch.frame,
      scratch.authority,
      { bindings: [binding.accountLamports(3)] },
            [{ pubkey: payer.publicKey, isSigner: false, isWritable: false }],
            { programId: IFX_LOCALNET_PROGRAM_ID }
          )
        ),
      "InvalidAccountIndex"
    );
  });

  it("ifx_let rejects forward Value reference within the same batch", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const forwardRef: Expr = { value: { value: { index: 1 } } };

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · InvalidValueIndex forward ref (expect fail)",
          scratch.ixReset(),
          buildIxLet(
      scratch.frame,
      scratch.authority,
      { bindings: [binding.eval(forwardRef)] },
            [],
            { programId: IFX_LOCALNET_PROGRAM_ID }
          )
        ),
      "InvalidValueIndex"
    );
  });

  it("ifx_let empty bindings vec is a no-op", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    await sendAndConfirm(
      provider,
      "ifx · empty let batch",
      scratch.ixReset(),
      buildIxLet(
      scratch.frame,
      scratch.authority,
      { bindings: [] },
        [],
        { programId: IFX_LOCALNET_PROGRAM_ID }
      )
    );

    const on = await scratch.fetchDecodedFrame(provider.connection);
    expect(on.cursor).to.equal(0);
    expect(on.indexCount).to.equal(0);
  });

  it("ifx_let rejects IndexCapReached when binding slots exhausted", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 20,
    });

    const bindings = Array.from({ length: 11 }, () => binding.eval(expr.u8(1)));

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · IndexCapReached (expect fail)",
          scratch.ixReset(),
          buildIxLet(scratch.frame, scratch.authority, { bindings }, [], {
            programId: IFX_LOCALNET_PROGRAM_ID,
          })
        ),
      "IndexCapReached"
    );
  });

  it("ifx_let rejects TapeOutOfBounds when tape bytes exhausted", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 20,
    });

    const bindings = [
      binding.eval(expr.u64(1)),
      binding.eval(expr.u64(2)),
      binding.eval(expr.u64(3)),
    ];

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · TapeOutOfBounds (expect fail)",
          scratch.ixReset(),
          buildIxLet(scratch.frame, scratch.authority, { bindings }, [], {
            programId: IFX_LOCALNET_PROGRAM_ID,
          })
        ),
      "TapeOutOfBounds"
    );
  });

  it("ifx_assert rejects InvalidValueIndex when frame has no bindings", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const missing: Expr = { value: { value: { index: 0 } } };

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · assert InvalidValueIndex (expect fail)",
          scratch.ixReset(),
          buildIxAssert(scratch.frame, missing, {
            programId: IFX_LOCALNET_PROGRAM_ID,
          })
        ),
      "InvalidValueIndex"
    );
  });

  it("ifx_patched_cpi rejects InvalidPatchedCpiPatches", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const recipient = Keypair.generate();
    const built = rawCpi(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient.publicKey,
        lamports: 1,
      })
    ).build();
    const emptyPatchesIx = new TransactionInstruction({
      programId: IFX_LOCALNET_PROGRAM_ID,
      keys: [
        { pubkey: scratch.frame, isSigner: false, isWritable: false },
        ...built.remaining,
      ],
      data: Buffer.concat([
        Buffer.from([IX_DISC_PATCHED_CPI]),
        encodeCpi(built.staticStep),
      ]),
    });

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · InvalidPatchedCpiPatches (expect fail)",
          scratch.ixReset(),
          emptyPatchesIx
        ),
      "InvalidPatchedCpiPatches"
    );
  });

  it("ifx_patched_cpi rejects PatchDataOutOfRange", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const recipient = Keypair.generate();
    const amount = scratch.letConstU64(1);
    const built = rawCpi(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient.publicKey,
        lamports: 0,
      }),
      { patches: [rawCpiPatch(100, amount)] }
    ).build();

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · PatchDataOutOfRange (expect fail)",
          scratch.ixReset(),
          scratch.ixLet(amount),
          scratch.ixCpi(built)
        ),
      "PatchDataOutOfRange"
    );
  });

  it("ifx_patched_cpi rejects InvalidAccountRange", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const recipient = Keypair.generate();
    const amount = scratch.letConstU64(1);
    const built = rawCpi(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient.publicKey,
        lamports: 0,
      }),
      { patches: [rawCpiPatch(4, amount)] }
    ).build();
    built.cpi.accountsLen = 99;

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · InvalidAccountRange (expect fail)",
          scratch.ixReset(),
          scratch.ixLet(amount),
          scratch.ixCpi(built)
        ),
      "InvalidAccountRange"
    );
  });

  it("ifx_let rejects DivisionByZero via expr.div", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · DivisionByZero (expect fail)",
          scratch.ixReset(),
          buildIxLet(
      scratch.frame,
      scratch.authority,
      { bindings: [binding.eval(expr.div(expr.u64(1), expr.u64(0)))] },
            [],
            { programId: IFX_LOCALNET_PROGRAM_ID }
          )
        ),
      "DivisionByZero"
    );
  });

  it("ifx_let rejects IntegerOverflow on u64 add", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · IntegerOverflow (expect fail)",
          scratch.ixReset(),
          buildIxLet(
      scratch.frame,
      scratch.authority,
      {
              bindings: [
                binding.eval(
                  expr.add(expr.u64(18446744073709551615n), expr.u64(1))
                ),
              ],
            },
            [],
            { programId: IFX_LOCALNET_PROGRAM_ID }
          )
        ),
      "IntegerOverflow"
    );
  });

  it("ifx_let rejects IntegerUnderflow on u64 sub", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · IntegerUnderflow (expect fail)",
          scratch.ixReset(),
          buildIxLet(
      scratch.frame,
      scratch.authority,
      { bindings: [binding.eval(expr.sub(expr.u64(0), expr.u64(1)))] },
            [],
            { programId: IFX_LOCALNET_PROGRAM_ID }
          )
        ),
      "IntegerUnderflow"
    );
  });

  it("ifx_let rejects UnsupportedBinaryOp (Add on Bool)", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · UnsupportedBinaryOp (expect fail)",
          scratch.ixReset(),
          buildIxLet(
      scratch.frame,
      scratch.authority,
      {
              bindings: [
                binding.eval({
                  add: {
                    lhs: { constBool: [true] },
                    rhs: { constBool: [false] },
                  },
                }),
              ],
            },
            [],
            { programId: IFX_LOCALNET_PROGRAM_ID }
          )
        ),
      "UnsupportedBinaryOp"
    );
  });

  it("ifx_let rejects UnsupportedUnaryOp (Neg on U64)", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · UnsupportedUnaryOp (expect fail)",
          scratch.ixReset(),
          buildIxLet(
      scratch.frame,
      scratch.authority,
      { bindings: [binding.eval(expr.neg(expr.u64(1)))] },
            [],
            { programId: IFX_LOCALNET_PROGRAM_ID }
          )
        ),
      "UnsupportedUnaryOp"
    );
  });

  it("ifx_let rejects FloatUnordered when comparing NaN f64", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · FloatUnordered (expect fail)",
          scratch.ixReset(),
          buildIxLet(
      scratch.frame,
      scratch.authority,
      {
              bindings: [
                binding.eval({
                  sub: {
                    lhs: { constF64: [Number.POSITIVE_INFINITY] },
                    rhs: { constF64: [Number.POSITIVE_INFINITY] },
                  },
                }),
                binding.eval({
                  gt: {
                    lhs: { value: { value: { index: 0 } } },
                    rhs: { constF64: [0] },
                  },
                }),
              ],
            },
            [],
            { programId: IFX_LOCALNET_PROGRAM_ID }
          )
        ),
      "FloatUnordered"
    );
  });

  it("ifx_let rejects AccountOwnerMismatch on SPL load", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · AccountOwnerMismatch SPL (expect fail)",
          scratch.ixReset(),
          buildIxLet(
      scratch.frame,
      scratch.authority,
      { bindings: [binding.splTokenAccountAmount(0)] },
            [
              {
                pubkey: payer.publicKey,
                isSigner: false,
                isWritable: false,
              },
            ],
            { programId: IFX_LOCALNET_PROGRAM_ID }
          )
        ),
      "AccountOwnerMismatch"
    );
  });

  it("ifx_assert rejects LoadTypeMismatch when cond is u64 not bool", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · LoadTypeMismatch assert (expect fail)",
          scratch.ixReset(),
          buildIxAssert(
            scratch.frame,
            expr.u64(1) as unknown as Parameters<typeof buildIxAssert>[1],
            {
              programId: IFX_LOCALNET_PROGRAM_ID,
            }
          )
        ),
      "LoadTypeMismatch"
    );
  });

  it("ifx_let rejects LoadTypeMismatch on add across u64/u32 slots", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · LoadTypeMismatch cross-type add (expect fail)",
          scratch.ixReset(),
          buildIxLet(
      scratch.frame,
      scratch.authority,
      {
              bindings: [
                binding.eval(expr.u64(1)),
                binding.eval(expr.u32(2)),
                binding.eval({
                  add: {
                    lhs: { value: { value: { index: 0 } } },
                    rhs: { value: { value: { index: 1 } } },
                  },
                }),
              ],
            },
            [],
            { programId: IFX_LOCALNET_PROGRAM_ID }
          )
        ),
      "LoadTypeMismatch"
    );
  });

  it("ifx_reset_frame rejects CPI nested in ifx_if_else static arm (ResetNotTopLevel)", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const nestedReset = createIxResetFrame(
      scratch.frame,
      scratch.authority,
      { programId: IFX_LOCALNET_PROGRAM_ID }
    );
    const nested = staticCpi(nestedReset);

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · ResetNotTopLevel via if_else cpi (expect fail)",
          scratch.ixIfElse(
            ifElseArgs(expr.bool(true), arm.cpi(nested.staticStep), arm.skip()),
            nested.remaining
          )
        ),
      "ResetNotTopLevel"
    );
  });

  it("ifx_reset_frame rejects private frame without authority signer (UnauthorizedFrameWrite)", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const stranger = Keypair.generate();
    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · UnauthorizedFrameWrite on reset (expect fail)",
          new TransactionInstruction({
            programId: IFX_LOCALNET_PROGRAM_ID,
            keys: [
              { pubkey: scratch.frame, isSigner: false, isWritable: true },
              {
                pubkey: stranger.publicKey,
                isSigner: false,
                isWritable: false,
              },
            ],
            data: IX_DISCRIMINATOR.ifxResetFrame,
          })
        ),
      "UnauthorizedFrameWrite"
    );
  });

  it("ifx_let rejects private frame without authority signer (UnauthorizedFrameWrite)", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const letWithoutAuthority = new TransactionInstruction({
      programId: IFX_LOCALNET_PROGRAM_ID,
      keys: [{ pubkey: scratch.frame, isSigner: false, isWritable: true }],
      data: Buffer.concat([
        IX_DISCRIMINATOR.ifxLet,
        encodeLetArgs({ bindings: [binding.eval(expr.u64(1))] }),
      ]),
    });

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · UnauthorizedFrameWrite on let (expect fail)",
          scratch.ixReset(),
          letWithoutAuthority
        ),
      "UnauthorizedFrameWrite"
    );
  });

  it("ifx_patched_cpi rejects Token structured patch with wrong program id (InvalidStructuredCpiProgram)", async () => {
    const scratch = await provisionLocalFrame(provider, {
      payer: payer.publicKey,
      frameId: randomBytes(32),
      authority: payer.publicKey,
      tapeLen: 512,
    });

    const amount = scratch.letEval(expr.u64(1));
    const source = Keypair.generate().publicKey;
    const mint = Keypair.generate().publicKey;
    const dest = Keypair.generate().publicKey;

    const template = createTransferCheckedInstruction(
      source,
      mint,
      dest,
      payer.publicKey,
      1n,
      9,
      [],
      TOKEN_PROGRAM_ID
    );

    const built = structuredCpi(
      template,
      structuredCpiPatch.tokenTransferChecked.amountOnly(amount, 9)
    ).build();

    const wrongRemaining = built.remaining.map((m) => ({ ...m }));
    wrongRemaining[built.cpi.accountsStart] = {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    };

    await expectIfxTxFail(
      () =>
        sendAndConfirm(
          provider,
          "ifx · InvalidStructuredCpiProgram (expect fail)",
          scratch.ixReset(),
          scratch.ixLet(amount),
          scratch.ixCpi({ cpi: built.cpi, remaining: wrongRemaining })
        ),
      "InvalidStructuredCpiProgram"
    );
  });
});
