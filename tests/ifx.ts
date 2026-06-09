import * as anchor from "@anchor-lang/core";
import {expect} from "chai";
import {
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import {
    createAssociatedTokenAccountIdempotentInstruction,
    createMint,
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {randomBytes} from "crypto";

import {
    arm,
    ifElseArgs,
    rawCpiPatch,
    rawCpi,     expr,
    FrameScratch,
    framePda,
    IFX_LOCALNET_PROGRAM_ID,
} from "../sdk/src";
import {SPL_TOKEN_ACCOUNT_LAYOUT} from "../sdk/src/spl/layout";
import {confirmSignature, sendAndConfirm, sendAndConfirmTransaction, LABEL_SETUP_CREATE_FRAME, planLocalFrame} from "./helpers";

describe("ifx", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const payer = (provider.wallet as anchor.Wallet).payer;

    function randomFrameId(): Buffer {
        return randomBytes(32);
    }

    /**
     * Patched transfer plan — call after {@link FrameScratch.ixReset} in the same business tx.
     * Pass the `resetIx` from `ixReset()` first, then `ixLet` + CPI in **one** tx.
     */
    function buildTransferPatch(scratch: FrameScratch, recipient: PublicKey, amountLamports: number) {
        const transferAmount = scratch.letConstU64(amountLamports);
        const xfer = rawCpi(
            SystemProgram.transfer({
                fromPubkey: payer.publicKey,
                toPubkey: recipient,
                lamports: 0,
            }),
            {patches: [rawCpiPatch(4, transferAmount)]}
        ).build();
        return {transferAmount, xfer};
    }

    it("creates a frame and decodes on-chain state", async () => {
        const frameId = randomFrameId();
        const authority = payer.publicKey;
        const tapeLen = 256;

        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority,
            tapeLen,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);
        const decoded = await scratch.fetchDecodedFrame(provider.connection);

        expect(decoded.authority.equals(authority)).to.be.true;
        expect(decoded.cursor).to.equal(0);
        expect(decoded.tape.length).to.equal(tapeLen);
        expect(decoded.tape.every((b) => b === 0)).to.be.true;
    });

    it("ifx_let appends const u64 and advances cursor", async () => {
        const frameId = randomFrameId();
        const tapeLen = 256;
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);
        const resetIx = scratch.ixReset();
        const boundConst = scratch.letConstU64(42);
        await sendAndConfirm(provider, "ifx · let const u64(42)", resetIx, scratch.ixLet(boundConst));

        const onChain = await scratch.fetchDecodedFrame(provider.connection);
        expect(onChain.cursor).to.equal(scratch.cursor);
        const idx = boundConst.ref.index;
        expect(idx).to.equal(0);
        expect(onChain.tape[0]).to.equal(4); // ValueType::U64 tag at payloadAt[0] - 1
        expect(onChain.readU64(boundConst)).to.equal(42n);
    });

    it("ifx_let loads Clock and Rent via sysvar bindings", async () => {
        const frameId = randomFrameId();
        const tapeLen = 256;
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);
        const resetIx = scratch.ixReset();
        const letBatch = scratch.letBuilder();
        const clockSlotValue = letBatch.clockSlot();
        const ts = letBatch.clockUnixTimestamp();
        const ataRent = letBatch.rentMinimumBalance(165);
        await sendAndConfirm(provider, "ifx · let Clock + Rent sysvars", resetIx, letBatch.buildIx());

        const onChain = await scratch.fetchDecodedFrame(provider.connection);
        expect(onChain.readU64(clockSlotValue) > 0n).to.equal(true);
        expect(onChain.readI64(ts) > 0n).to.equal(true);
        expect(onChain.readU64(ataRent) > 0n).to.equal(true);
    });

    it("ifx_let loads SPL token account amount via typed binding", async () => {
        const frameId = randomFrameId();
        const tapeLen = 256;
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

        const mint = await createMint(
            provider.connection,
            payer,
            payer.publicKey,
            null,
            6
        );
        const owner = Keypair.generate();
        const sig = await provider.connection.requestAirdrop(
            owner.publicKey,
            LAMPORTS_PER_SOL
        );
        await confirmSignature(provider.connection, sig);
        const ata = getAssociatedTokenAddressSync(
            mint,
            owner.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        const setupTx = new Transaction().add(
            createAssociatedTokenAccountIdempotentInstruction(
                payer.publicKey,
                ata,
                owner.publicKey,
                mint,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            )
        );
        await sendAndConfirmTransaction(
            provider,
            setupTx,
            "setup · SPL token ATA for amount read"
        );

        const resetIx = scratch.ixReset();
        const letBatch = scratch.letBuilder();
        const amount = letBatch.splTokenAmount(ata);
        await sendAndConfirm(provider, "ifx · splTokenAmount on empty ATA", resetIx, letBatch.buildIx());

        const onChain = await scratch.fetchDecodedFrame(provider.connection);
        expect(onChain.readU64(amount)).to.equal(0n);
    });

    it("batch let: second binding reads first via expr::Value", async () => {
        const frameId = randomFrameId();
        const tapeLen = 256;
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);
        const resetIx = scratch.ixReset();
        const letBatch = scratch.letBuilder();
        const augend = letBatch.letConstU64(10);
        const sum = letBatch.letEval(expr.add(augend, expr.u64(5)));
        await sendAndConfirm(provider, "ifx · batch let expr::Value add", resetIx, letBatch.buildIx());

        const onChain = await scratch.fetchDecodedFrame(provider.connection);
        expect(onChain.readU64(sum)).to.equal(15n);
    });

    it("ifx_reset_frame resets cursor and index_count for a new session", async () => {
        const frameId = randomFrameId();
        const { scratch, ixCreate, frame } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: 256,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);
        const bound = scratch.letConstU64(99);
        const resetIx = scratch.ixReset();
        await sendAndConfirm(
            provider,
            "ifx · reset session after let",
            scratch.ixLet(bound),
            resetIx
        );

        const afterReset = await scratch.fetchDecodedFrame(provider.connection);
        expect(afterReset.cursor).to.equal(0);
        expect(afterReset.indexCount).to.equal(0);

        const session = new FrameScratch(
            frame,
            256,
            0,
            0,
            IFX_LOCALNET_PROGRAM_ID,
            payer.publicKey
        );
        const two = session.letConstU64(2);
        await sendAndConfirm(
            provider,
            "ifx · let after lazy reset",
            session.ixLet(two)
        );
        const onChain = await session.fetchDecodedFrame(provider.connection);
        expect(onChain.readU64(two)).to.equal(2n);
        expect(onChain.indexCount).to.equal(1);
    });

    it("ifx_assert passes on true condition", async () => {
        const frameId = randomFrameId();
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: 256,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);
        const resetIx = scratch.ixReset();
        const condTrue = scratch.letConstBool(true);
        await sendAndConfirm(
            provider,
            "ifx · assert passes on true",
            resetIx,
            scratch.ixLet(condTrue),
            scratch.ixAssert(condTrue)
        );
    });

    it("ifx_assert fails when condition is false", async () => {
        const frameId = randomFrameId();
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: 256,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

        try {
            const resetIx = scratch.ixReset();
            await sendAndConfirm(
                provider,
                "ifx · assert fails on false (expect fail)",
                resetIx,
                scratch.ixAssert(expr.bool(false))
            );
            expect.fail("expected assert to fail");
        } catch (e: unknown) {
            const msg = String(e);
            expect(msg).to.match(/AssertFailed|6006|assert/i);
        }
    });

    it("ataCost = ata lamports after create minus ATA baseline before create", async () => {
        const frameId = randomFrameId();
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: 256,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

        const user = Keypair.generate();
        const airdrop = await provider.connection.requestAirdrop(
            user.publicKey,
            LAMPORTS_PER_SOL
        );
        await confirmSignature(provider.connection, airdrop);

        const mint = await createMint(
            provider.connection,
            payer,
            payer.publicKey,
            null,
            6
        );
        const userAta = getAssociatedTokenAddressSync(
            mint,
            user.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const resetIx = scratch.ixReset();
        const letBaseline = scratch.letBuilder();
        const userLamportsBaseline = letBaseline.lamports(user.publicKey);
        const ataLamportsBaseline = letBaseline.lamports(userAta);

        const letAta = scratch.letBuilder();
        const ataLamportsAfterCreate = letAta.lamports(userAta);
        const ataCost = letAta.letEval(
            expr.sub(ataLamportsAfterCreate, ataLamportsBaseline)
        );

        const tx = new Transaction();
        tx.add(resetIx);
        tx.add(letBaseline.buildIx());
        tx.add(
            createAssociatedTokenAccountIdempotentInstruction(
                payer.publicKey,
                userAta,
                user.publicKey,
                mint,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            )
        );
        tx.add(letAta.buildIx());
        await sendAndConfirmTransaction(provider, tx, "ifx · ataCost after idempotent ATA create");

        const onChain = await scratch.fetchDecodedFrame(provider.connection);
        expect(onChain.readU64(ataCost) > 0n).to.be.true;
    });

    it("loads lamports baseline for user + derived ATA address", async () => {
        const frameId = randomFrameId();
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: 256,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

        const user = Keypair.generate();
        const airdrop = await provider.connection.requestAirdrop(
            user.publicKey,
            LAMPORTS_PER_SOL / 2
        );
        await confirmSignature(provider.connection, airdrop);

        const mint = await createMint(
            provider.connection,
            payer,
            payer.publicKey,
            null,
            6
        );
        const userAta = getAssociatedTokenAddressSync(
            mint,
            user.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const resetIx = scratch.ixReset();
        const letBaseline = scratch.letBuilder();
        const userLamportsBaseline = letBaseline.lamports(user.publicKey);
        const ataLamportsBaseline = letBaseline.lamports(userAta);
        await sendAndConfirm(provider, "ifx · lamports baseline user + derived ATA", resetIx, letBaseline.buildIx());

        const onChain = await scratch.fetchDecodedFrame(provider.connection);
        expect(onChain.cursor).to.equal(scratch.cursor);
        expect(onChain.tape[onChain.payloadAt[userLamportsBaseline.ref.index]! - 1]).to.equal(4);
        expect(onChain.tape[onChain.payloadAt[ataLamportsBaseline.ref.index]! - 1]).to.equal(4);
        expect(onChain.readU64(userLamportsBaseline) > 0n).to.be.true;
        expect(onChain.readU64(ataLamportsBaseline)).to.equal(0n);
    });

    it("accountDataSlice requires matching owner program in remaining", async () => {
        const frameId = randomFrameId();
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: 256,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

        const mint = await createMint(
            provider.connection,
            payer,
            payer.publicKey,
            null,
            6
        );
        const user = Keypair.generate();
        const airdrop = await provider.connection.requestAirdrop(
            user.publicKey,
            LAMPORTS_PER_SOL / 10
        );
        await confirmSignature(provider.connection, airdrop);
        const userAta = getAssociatedTokenAddressSync(
            mint,
            user.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        const createAtaTx = new Transaction().add(
            createAssociatedTokenAccountIdempotentInstruction(
                payer.publicKey,
                userAta,
                user.publicKey,
                mint,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            )
        );
        await sendAndConfirmTransaction(provider, createAtaTx, "setup · create SPL ATA for dataSlice test");

        const resetIx = scratch.ixReset();
        const amountSlice = scratch.letAccountDataSlice(
            userAta,
            TOKEN_PROGRAM_ID,
            "u64",
            SPL_TOKEN_ACCOUNT_LAYOUT.amount
        );
        await sendAndConfirm(provider, "ifx · accountDataSlice SPL amount", resetIx, scratch.ixLet(amountSlice));

        const onChain = await scratch.fetchDecodedFrame(provider.connection);
        expect(onChain.readU64(amountSlice)).to.equal(0n);

        const resetIx3 = scratch.ixReset();
        try {
            const badOwner = scratch.letAccountDataSlice(
                userAta,
                SystemProgram.programId,
                "u64",
                SPL_TOKEN_ACCOUNT_LAYOUT.amount
            );
            await sendAndConfirm(provider, "ifx · accountDataSlice owner mismatch (expect fail)", resetIx3, scratch.ixLet(badOwner));
            expect.fail("expected owner mismatch");
        } catch (e: unknown) {
            const msg = String(e);
            expect(msg).to.match(/AccountOwnerMismatch|owner/i);
        }
    });

    it("loads lamports from remaining account", async () => {
        const frameId = randomFrameId();
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: 256,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);
        const resetIx = scratch.ixReset();
        // `let*` accepts `PublicKey` (read-only, non-signer) or a full `AccountMeta` when flags matter.
        const payerLamports = scratch.letLamports({
            pubkey: payer.publicKey,
            isSigner: false,
            isWritable: false,
        });
        await sendAndConfirm(provider, "ifx · letLamports from remaining", resetIx, scratch.ixLet(payerLamports));

        const onChain = await scratch.fetchDecodedFrame(provider.connection);
        const stored = onChain.readU64(payerLamports);
        expect(stored > BigInt(0)).to.be.true;
    });

    it("loads account data_len from remaining account", async () => {
        const frameId = randomFrameId();
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: 256,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

        const frameInfo = await provider.connection.getAccountInfo(scratch.frame);
        expect(frameInfo).to.not.be.null;

        const frameDataLen = scratch.letDataLen({
            pubkey: scratch.frame,
            isSigner: false,
            isWritable: false,
        });
        await sendAndConfirm(
            provider,
            "ifx · letDataLen from remaining",
            scratch.ixReset(),
            scratch.ixLet(frameDataLen)
        );

        const onChain = await scratch.fetchDecodedFrame(provider.connection);
        expect(onChain.readU32(frameDataLen)).to.equal(frameInfo!.data.length);
    });

    it("composes reset + let in one tx via tx.add(scratch.ix*)", async () => {
        const frameId = randomFrameId();
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: 256,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

        const tx = new Transaction();
        const resetIx = scratch.ixReset();
        const seven = scratch.letConstU64(7);
        tx.add(resetIx);
        tx.add(scratch.ixLet(seven));
        await sendAndConfirmTransaction(provider, tx, "ifx · compose reset + let in one tx");

        const decoded = await scratch.fetchDecodedFrame(provider.connection);
        expect(decoded.cursor).to.be.greaterThan(0);
        expect(decoded.tape[0]).to.equal(4); // U64 tag
        expect(decoded.readU64(seven)).to.equal(7n);
    });

    it("close_frame reclaims rent for close_authority", async () => {
        const frameId = randomFrameId();
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: MIN_FRAME_LEN,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

        const tx = new Transaction();
        tx.add(scratch.ixCloseFrame(payer.publicKey));
        await sendAndConfirmTransaction(provider, tx, "ifx · close_frame reclaims rent");

        const info = await provider.connection.getAccountInfo(scratch.frame);
        expect(info).to.be.null;
    });

    it("rejects zero tape_len at create", async () => {
        const frameId = randomFrameId();
        try {
            FrameScratch.ixCreateFrame({
                payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: 0,
            });
            expect.fail("expected create to fail");
        } catch (e: unknown) {
            expect(String(e)).to.match(/tapeLen|tape/i);
        }
    });

    it("rejects tape_len above MAX_FRAME_TAPE_LEN at create", async () => {
        const frameId = randomFrameId();
        try {
            FrameScratch.ixCreateFrame({
                payer: payer.publicKey,
                frameId,
                authority: payer.publicKey,
                tapeLen: 70_000,
            });
            expect.fail("expected create to fail");
        } catch (e: unknown) {
            expect(String(e)).to.match(/tapeLen|65535/i);
        }
    });

    it("ifx_patched_cpi patches system transfer lamports from frame", async () => {
        const frameId = randomFrameId();
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: 256,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

        const recipient = Keypair.generate();
        const airdrop = await provider.connection.requestAirdrop(
            recipient.publicKey,
            LAMPORTS_PER_SOL
        );
        await confirmSignature(provider.connection, airdrop);

        const transferLamports = 50_000;
        const resetIx = scratch.ixReset();
        const {transferAmount, xfer} = buildTransferPatch(
            scratch,
            recipient.publicKey,
            transferLamports
        );

        const before = await provider.connection.getBalance(recipient.publicKey);

        await sendAndConfirm(
            provider,
            "ifx · patched_cpi System transfer lamports",
            resetIx,
            scratch.ixLet(transferAmount),
            scratch.ixCpi(xfer)
        );

        const after = await provider.connection.getBalance(recipient.publicKey);
        expect(after - before).to.equal(transferLamports);
    });

    it("ifx_if_else runs then_arm cpi when cond is true", async () => {
        const frameId = randomFrameId();
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: 256,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

        const recipient = Keypair.generate();
        const airdrop = await provider.connection.requestAirdrop(
            recipient.publicKey,
            LAMPORTS_PER_SOL / 10
        );
        await confirmSignature(provider.connection, airdrop);

        const before = await provider.connection.getBalance(recipient.publicKey);
        const resetIx = scratch.ixReset();
        const letBatch = scratch.letBuilder();
        const condTrue = letBatch.letConstBool(true);
        const transferAmount = letBatch.letConstU64(1_000);
        const xfer = rawCpi(
            SystemProgram.transfer({
                fromPubkey: payer.publicKey,
                toPubkey: recipient.publicKey,
                lamports: 0,
            }),
            {patches: [rawCpiPatch(4, transferAmount)]}
        ).build();

        await sendAndConfirm(
            provider,
            "ifx · if_else then_arm cpi",
            resetIx,
            letBatch.buildIx(),
            scratch.ixIfElse(
                ifElseArgs(condTrue, arm.cpi(xfer.cpi)),
                xfer.remaining
            )
        );

        const after = await provider.connection.getBalance(recipient.publicKey);
        expect(after - before).to.equal(1_000);
    });

    it("ifx_if_else runs else_arm cpi when cond is false", async () => {
        const frameId = randomFrameId();
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: 256,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

        const recipient = Keypair.generate();
        const airdrop = await provider.connection.requestAirdrop(
            recipient.publicKey,
            LAMPORTS_PER_SOL / 10
        );
        await confirmSignature(provider.connection, airdrop);

        const before = await provider.connection.getBalance(recipient.publicKey);
        const resetIx = scratch.ixReset();
        const letBatch = scratch.letBuilder();
        const condFalse = letBatch.letConstBool(false);
        const transferAmount = letBatch.letConstU64(2_000);
        const xfer = rawCpi(
            SystemProgram.transfer({
                fromPubkey: payer.publicKey,
                toPubkey: recipient.publicKey,
                lamports: 0,
            }),
            {patches: [rawCpiPatch(4, transferAmount)]}
        ).build();

        await sendAndConfirm(
            provider,
            "ifx · if_else else_arm cpi",
            resetIx,
            letBatch.buildIx(),
            scratch.ixIfElse(
                ifElseArgs(condFalse, arm.skip(), arm.cpi(xfer.cpi)),
                xfer.remaining
            )
        );

        const after = await provider.connection.getBalance(recipient.publicKey);
        expect(after - before).to.equal(2_000);
    });

    it("ifx_if_else skip arm does not invoke CPI", async () => {
        const frameId = randomFrameId();
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: 256,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);

        const recipient = Keypair.generate();
        const airdrop = await provider.connection.requestAirdrop(
            recipient.publicKey,
            LAMPORTS_PER_SOL / 10
        );
        await confirmSignature(provider.connection, airdrop);

        const before = await provider.connection.getBalance(recipient.publicKey);
        const resetIx = scratch.ixReset();
        const letBatch = scratch.letBuilder();
        const condTrue = letBatch.letConstBool(true);
        const transferAmount = letBatch.letConstU64(3_000);
        const xfer = rawCpi(
            SystemProgram.transfer({
                fromPubkey: payer.publicKey,
                toPubkey: recipient.publicKey,
                lamports: 0,
            }),
            {patches: [rawCpiPatch(4, transferAmount)]}
        ).build();

        await sendAndConfirm(
            provider,
            "ifx · if_else skip arm (no CPI)",
            resetIx,
            letBatch.buildIx(),
            scratch.ixIfElse(
                ifElseArgs(condTrue, arm.skip(), arm.cpi(xfer.cpi)),
                xfer.remaining
            )
        );

        const after = await provider.connection.getBalance(recipient.publicKey);
        expect(after).to.equal(before);
    });

    it("ifx_if_else revert arm fails the transaction", async () => {
        const frameId = randomFrameId();
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: 256,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);
        const resetIx = scratch.ixReset();
        const condTrue = scratch.letConstBool(true);

        try {
            await sendAndConfirm(
                provider,
                "ifx · if_else revert arm (expect fail)",
                resetIx,
                scratch.ixLet(condTrue),
                scratch.ixIfElse(ifElseArgs(condTrue, arm.revert()))
            );
            expect.fail("expected if_else revert arm to fail");
        } catch (e: unknown) {
            const msg = String(e);
            expect(msg).to.match(/IfElseRevert|6009|revert/i);
        }
    });

    it("ifx_if_else else revert when cond is false", async () => {
        const frameId = randomFrameId();
        const { scratch, ixCreate } = planLocalFrame({
            payer: payer.publicKey,
            frameId,
            authority: payer.publicKey,
            tapeLen: 256,
        });
        await sendAndConfirm(provider, LABEL_SETUP_CREATE_FRAME, ixCreate);
        const resetIx = scratch.ixReset();
        const condFalse = scratch.letConstBool(false);

        try {
            await sendAndConfirm(
                provider,
                "ifx · if_else else revert (expect fail)",
                resetIx,
                scratch.ixLet(condFalse),
                scratch.ixIfElse(ifElseArgs(condFalse, arm.skip(), arm.revert()))
            );
            expect.fail("expected else revert arm to fail");
        } catch (e: unknown) {
            const msg = String(e);
            expect(msg).to.match(/IfElseRevert|6009|revert/i);
        }
    });

    it("frame PDA matches framePda helper", () => {
        const frameId = randomFrameId();
        const [first] = framePda(payer.publicKey, frameId, IFX_LOCALNET_PROGRAM_ID);
        const [second] = framePda(payer.publicKey, frameId, IFX_LOCALNET_PROGRAM_ID);
        expect(first.equals(second)).to.be.true;
    });
});

const MIN_FRAME_LEN = 64;
