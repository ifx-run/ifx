"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cpi = exports.CpiBuilder = exports.RawCpiBuilder = exports.rawCpiPatch = void 0;
exports.resolveCpiRemaining = resolveCpiRemaining;
exports.rawCpi = rawCpi;
exports.staticCpi = staticCpi;
exports.systemTransferDataTemplate = systemTransferDataTemplate;
exports.systemTransferTemplate = systemTransferTemplate;
const web3_js_1 = require("@solana/web3.js");
const patch_list_1 = require("./patch-list");
var patch_1 = require("./patch");
Object.defineProperty(exports, "rawCpiPatch", { enumerable: true, get: function () { return patch_1.rawCpiPatch; } });
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
 * Derive `accountsStart` / `accountsLen` + validate CPI account slice in `remaining`.
 *
 * Default `remaining`: `[programId, ...template.keys]`. Pass a longer list when merging
 * multiple CPI steps (e.g. transfer + syncNative in one `ifx_if_else` arm).
 */
function resolveCpiRemaining(programId, ixKeys, remaining) {
    const metas = remaining === undefined
        ? [
            {
                pubkey: programId,
                isSigner: false,
                isWritable: false,
            },
            ...ixKeys,
        ]
        : normalizeRemaining(remaining);
    const accountsStart = metas.findIndex((m) => m.pubkey.equals(programId));
    if (accountsStart < 0) {
        throw new Error("remaining must include the CPI program id");
    }
    const slice = metas.slice(accountsStart);
    if (slice.length < 1 + ixKeys.length) {
        throw new Error(`remaining slice too short: need program + ${ixKeys.length} account(s)`);
    }
    for (let i = 0; i < ixKeys.length; i++) {
        const exp = ixKeys[i];
        const got = slice[1 + i];
        if (!got.pubkey.equals(exp.pubkey)) {
            throw new Error(`account mismatch at remaining[${accountsStart + 1 + i}]: expected ${exp.pubkey.toBase58()}`);
        }
    }
    return {
        accountsStart,
        accountsLen: slice.length,
        remaining: metas,
    };
}
/**
 * Raw patched CPI: clone template `data`, apply {@link rawCpiPatch} byte overlays at build time.
 * Escape hatch for DEX / custom layouts — prefer {@link structuredCpi} for official ix.
 */
class RawCpiBuilder {
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
        return new RawCpiBuilder(template, options?.patches ?? []);
    }
    build(remaining) {
        const { accountsStart, accountsLen, remaining: metas } = resolveCpiRemaining(this.programId, this.ixKeys, remaining);
        const stepBase = {
            accountsStart,
            accountsLen,
            data: this.data,
        };
        return {
            cpi: {
                kind: "rawPatched",
                ...stepBase,
                patches: (0, patch_list_1.patchListPatched)(this.patches),
            },
            staticStep: {
                kind: "static",
                ...stepBase,
            },
            remaining: metas,
        };
    }
}
exports.RawCpiBuilder = RawCpiBuilder;
/** @deprecated Use {@link RawCpiBuilder} */
exports.CpiBuilder = RawCpiBuilder;
/** Shorthand for {@link RawCpiBuilder.fromInstruction}. */
function rawCpi(template, options) {
    return RawCpiBuilder.fromInstruction(template, options);
}
/** @deprecated Use {@link rawCpi} */
exports.cpi = rawCpi;
/** Static CPI step for `ifx_if_else`. */
function staticCpi(template, remaining) {
    const built = RawCpiBuilder.fromInstruction(template).build(remaining);
    return {
        staticStep: built.staticStep,
        remaining: built.remaining,
    };
}
/** System Program `Transfer` ix data; lamports at byte offset 4 (for `rawCpiPatch`). */
function systemTransferDataTemplate(lamports = 0) {
    const buf = Buffer.alloc(12);
    buf.writeUInt32LE(2, 0);
    buf.writeBigUInt64LE(BigInt(lamports), 4);
    return buf;
}
/** Convenience: template transfer with `lamports: 0` for raw patching. */
function systemTransferTemplate(params) {
    return web3_js_1.SystemProgram.transfer({
        fromPubkey: params.fromPubkey,
        toPubkey: params.toPubkey,
        lamports: 0,
    });
}
