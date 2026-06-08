"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CpiBuilder = exports.cpiPatch = void 0;
exports.cpi = cpi;
exports.staticCpi = staticCpi;
exports.systemTransferDataTemplate = systemTransferDataTemplate;
exports.systemTransferTemplate = systemTransferTemplate;
const web3_js_1 = require("@solana/web3.js");
const patch_list_1 = require("./patch-list");
var patch_1 = require("./patch");
Object.defineProperty(exports, "cpiPatch", { enumerable: true, get: function () { return patch_1.cpiPatch; } });
function normalizeRemaining(accounts) {
    if (accounts.length === 0)
        return [];
    if (accounts[0] instanceof web3_js_1.PublicKey) {
        return accounts.map((pk) => ({
            pubkey: pk,
            isSigner: false,
            isWritable: false,
        }));
    }
    return accounts;
}
/**
 * Semi-built CPI: clone `data` from a template {@link TransactionInstruction},
 * apply {@link cpiPatch} at `build()` time, and derive account layout for ifx remaining.
 */
class CpiBuilder {
    constructor(template, patches) {
        this.programId = template.programId;
        this.ixKeys = template.keys.map((k) => ({
            pubkey: k.pubkey,
            isSigner: k.isSigner,
            isWritable: k.isWritable,
        }));
        this.data = Buffer.from(template.data);
        this.patches = patches;
    }
    /** Start from any instruction (e.g. `SystemProgram.transfer` with lamports `0`). */
    static fromInstruction(template, options) {
        return new CpiBuilder(template, options?.patches ?? []);
    }
    /**
     * Finalize wire args + ifx `remaining` account list.
     *
     * With no args: `[programId, ...template.keys]` from the template instruction (preferred).
     * Custom `remaining` only when the CPI slice sits inside a longer list; must include
     * `programId` then `template.keys` in order. Avoid `PublicKey[]` — signer/writable are lost.
     */
    build(remaining) {
        const metas = remaining === undefined
            ? [
                {
                    pubkey: this.programId,
                    isSigner: false,
                    isWritable: false,
                },
                ...this.ixKeys,
            ]
            : normalizeRemaining(remaining);
        const accountsStart = metas.findIndex((m) => m.pubkey.equals(this.programId));
        if (accountsStart < 0) {
            throw new Error("remaining must include the CPI program id");
        }
        const slice = metas.slice(accountsStart);
        if (slice.length < 1 + this.ixKeys.length) {
            throw new Error(`remaining slice too short: need program + ${this.ixKeys.length} account(s)`);
        }
        for (let i = 0; i < this.ixKeys.length; i++) {
            const exp = this.ixKeys[i];
            const got = slice[1 + i];
            if (!got.pubkey.equals(exp.pubkey)) {
                throw new Error(`account mismatch at remaining[${accountsStart + 1 + i}]: expected ${exp.pubkey.toBase58()}`);
            }
        }
        const accountsLen = slice.length;
        const stepBase = {
            accountsStart,
            accountsLen,
            data: this.data,
        };
        return {
            cpi: {
                ...stepBase,
                patches: (0, patch_list_1.patchListPatched)(this.patches),
            },
            staticStep: {
                ...stepBase,
                patches: (0, patch_list_1.patchListStatic)(),
            },
            remaining: metas,
        };
    }
}
exports.CpiBuilder = CpiBuilder;
/** Shorthand for {@link CpiBuilder.fromInstruction}. */
function cpi(template, options) {
    return CpiBuilder.fromInstruction(template, options);
}
/** Static CPI step for `ifx_if_else` — empty `PatchList` (`U16LenVec` count 0). */
function staticCpi(template, remaining) {
    const built = CpiBuilder.fromInstruction(template).build(remaining);
    return {
        staticStep: built.staticStep,
        remaining: built.remaining,
    };
}
/** System Program `Transfer` ix data; lamports at byte offset 4 (for `cpiPatch`). */
function systemTransferDataTemplate(lamports = 0) {
    const buf = Buffer.alloc(12);
    buf.writeUInt32LE(2, 0);
    buf.writeBigUInt64LE(BigInt(lamports), 4);
    return buf;
}
/** Convenience: template transfer with `lamports: 0` for patching. */
function systemTransferTemplate(params) {
    return web3_js_1.SystemProgram.transfer({
        fromPubkey: params.fromPubkey,
        toPubkey: params.toPubkey,
        lamports: 0,
    });
}
