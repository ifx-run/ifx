"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindSplTokenAmount = bindSplTokenAmount;
exports.bindSplTokenDelegatedAmount = bindSplTokenDelegatedAmount;
exports.bindSplTokenAccountState = bindSplTokenAccountState;
exports.bindSplMintSupply = bindSplMintSupply;
exports.bindSplMintDecimals = bindSplMintDecimals;
const binding_1 = require("../binding");
/** `ifx_let` binding: SPL token account `amount` (typed unpack, owner `spl_token`). */
function bindSplTokenAmount(scratch, remainingAccountIndex) {
    return scratch.planAtRemainingIndex(binding_1.binding.splTokenAccountAmount(0), remainingAccountIndex);
}
function bindSplTokenDelegatedAmount(scratch, remainingAccountIndex) {
    return scratch.planAtRemainingIndex(binding_1.binding.splTokenAccountDelegatedAmount(0), remainingAccountIndex);
}
function bindSplTokenAccountState(scratch, remainingAccountIndex) {
    return scratch.planAtRemainingIndex(binding_1.binding.splTokenAccountState(0), remainingAccountIndex);
}
function bindSplMintSupply(scratch, remainingAccountIndex) {
    return scratch.planAtRemainingIndex(binding_1.binding.splMintSupply(0), remainingAccountIndex);
}
function bindSplMintDecimals(scratch, remainingAccountIndex) {
    return scratch.planAtRemainingIndex(binding_1.binding.splMintDecimals(0), remainingAccountIndex);
}
