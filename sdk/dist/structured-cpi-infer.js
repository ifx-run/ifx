"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAKE_PROGRAM_ID = void 0;
exports.inferStructuredCpiPatchTag = inferStructuredCpiPatchTag;
exports.isStructuredCpiPatch = isStructuredCpiPatch;
exports.resolveStructuredCpiPatch = resolveStructuredCpiPatch;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
/** SPL Token / Token-2022 instruction byte (first byte of ix data). */
const SPL_IX = {
    initializeMint: 0,
    initializeMultisig: 2,
    transfer: 3,
    approve: 4,
    mintTo: 7,
    burn: 8,
    transferChecked: 12,
    approveChecked: 13,
    mintToChecked: 14,
    burnChecked: 15,
    initializeMultisig2: 19,
    initializeMint2: 20,
    amountToUiAmount: 23,
    /** p-token `UnwrapLamports` (SPL Token program only). */
    unwrapLamports: 45,
    /** Token-2022 extension prefix (`TokenInstruction::TransferFeeExtension`). */
    transferFeeExtension: 26,
};
/** TransferFee extension sub-instructions (byte after extension prefix). */
const TRANSFER_FEE_IX = {
    transferCheckedWithFee: 1,
    setTransferFee: 5,
};
/** System program instruction (u32 LE at data[0..4]). */
const SYSTEM_IX = {
    createAccount: 0,
    transfer: 2,
    allocate: 8,
};
/** Native stake program (`Stake11111111111111111111111111111111111111`). */
exports.STAKE_PROGRAM_ID = new web3_js_1.PublicKey("Stake11111111111111111111111111111111111111");
/** Stake instruction variant (u32 LE at data[0..4], bincode). */
const STAKE_IX = {
    delegateStake: 2,
    split: 3,
    withdraw: 4,
    deactivate: 5,
};
function readU32Le(data) {
    if (data.length < 4)
        return null;
    return data.readUInt32LE(0);
}
function readSystemDiscriminator(data) {
    if (data.length < 4)
        return null;
    return data.readUInt32LE(0);
}
function inferToken2022TransferFee(data) {
    if (data.length < 2 || data[0] !== SPL_IX.transferFeeExtension) {
        return null;
    }
    switch (data[1]) {
        case TRANSFER_FEE_IX.transferCheckedWithFee:
            return "token2022TransferCheckedWithFee";
        case TRANSFER_FEE_IX.setTransferFee:
            return "token2022SetTransferFee";
        default:
            return null;
    }
}
function inferTokenFamily(programId, data) {
    const token = programId.equals(spl_token_1.TOKEN_PROGRAM_ID);
    const token2022 = programId.equals(spl_token_1.TOKEN_2022_PROGRAM_ID);
    if (!token && !token2022)
        return null;
    if (token2022) {
        const fee = inferToken2022TransferFee(data);
        if (fee)
            return fee;
    }
    const opcode = data[0];
    const prefix = token ? "token" : "token2022";
    switch (opcode) {
        case SPL_IX.transfer:
            return `${prefix}Transfer`;
        case SPL_IX.approve:
            return `${prefix}Approve`;
        case SPL_IX.mintTo:
            return `${prefix}MintTo`;
        case SPL_IX.burn:
            return `${prefix}Burn`;
        case SPL_IX.transferChecked:
            return `${prefix}TransferChecked`;
        case SPL_IX.approveChecked:
            return `${prefix}ApproveChecked`;
        case SPL_IX.mintToChecked:
            return `${prefix}MintToChecked`;
        case SPL_IX.burnChecked:
            return `${prefix}BurnChecked`;
        case SPL_IX.amountToUiAmount:
            return `${prefix}AmountToUiAmount`;
        case SPL_IX.initializeMint:
            return `${prefix}InitializeMint`;
        case SPL_IX.initializeMint2:
            return `${prefix}InitializeMint2`;
        case SPL_IX.initializeMultisig:
        case SPL_IX.initializeMultisig2:
            return `${prefix}InitializeMultisig`;
        case SPL_IX.unwrapLamports:
            return token ? "tokenUnwrapLamports" : null;
        default:
            return null;
    }
}
/**
 * Infer `StructuredCpiPatch.tag` from an official SDK instruction template.
 * Returns null when the program / opcode is not in the structured registry.
 */
function inferStructuredCpiPatchTag(template) {
    const { programId, data } = template;
    if (data.length === 0)
        return null;
    if (programId.equals(web3_js_1.SystemProgram.programId)) {
        const disc = readSystemDiscriminator(data);
        switch (disc) {
            case SYSTEM_IX.transfer:
                return "systemTransfer";
            case SYSTEM_IX.createAccount:
                return "systemCreateAccount";
            case SYSTEM_IX.allocate:
                return "systemAllocate";
            default:
                return null;
        }
    }
    if (programId.equals(spl_token_1.TOKEN_PROGRAM_ID) ||
        programId.equals(spl_token_1.TOKEN_2022_PROGRAM_ID)) {
        return inferTokenFamily(programId, data);
    }
    if (programId.equals(exports.STAKE_PROGRAM_ID)) {
        const variant = readU32Le(data);
        switch (variant) {
            case STAKE_IX.withdraw:
                return "stakeWithdraw";
            case STAKE_IX.split:
                return "stakeSplit";
            case STAKE_IX.deactivate:
                return "stakeDeactivate";
            case STAKE_IX.delegateStake:
                return "stakeDelegateStake";
            default:
                return null;
        }
    }
    return null;
}
function isStructuredCpiPatch(value) {
    return (typeof value === "object" &&
        value !== null &&
        "tag" in value &&
        typeof value.tag === "string");
}
/** Merge inferred tag with a patch body that omits `tag`. */
function resolveStructuredCpiPatch(template, input) {
    if (isStructuredCpiPatch(input)) {
        return input;
    }
    const tag = inferStructuredCpiPatchTag(template);
    if (!tag) {
        throw new Error(`cannot infer StructuredCpiPatch tag from program ${template.programId.toBase58()} (ix data len ${template.data.length})`);
    }
    return { tag, ...input };
}
