"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindSplToken2022AccountAmount = bindSplToken2022AccountAmount;
exports.bindSplToken2022AccountDelegatedAmount = bindSplToken2022AccountDelegatedAmount;
exports.bindSplToken2022AccountState = bindSplToken2022AccountState;
exports.bindSplToken2022AccountTransferFeeWithheld = bindSplToken2022AccountTransferFeeWithheld;
exports.bindSplToken2022MintSupply = bindSplToken2022MintSupply;
exports.bindSplToken2022MintDecimals = bindSplToken2022MintDecimals;
exports.bindSplToken2022MintTransferFeeBasisPoints = bindSplToken2022MintTransferFeeBasisPoints;
exports.bindSplToken2022MintTransferFeeMaximum = bindSplToken2022MintTransferFeeMaximum;
exports.bindSplToken2022MintWithheldAmount = bindSplToken2022MintWithheldAmount;
exports.bindSplToken2022MintDefaultAccountState = bindSplToken2022MintDefaultAccountState;
const binding_1 = require("../binding");
/** Token-2022 token account `amount` (owner `spl_token_2022`, typed unpack). */
function bindSplToken2022AccountAmount(scratch, remainingAccountIndex) {
    return scratch.planAtRemainingIndex(binding_1.binding.splToken2022AccountAmount(0), remainingAccountIndex);
}
function bindSplToken2022AccountDelegatedAmount(scratch, remainingAccountIndex) {
    return scratch.planAtRemainingIndex(binding_1.binding.splToken2022AccountDelegatedAmount(0), remainingAccountIndex);
}
function bindSplToken2022AccountState(scratch, remainingAccountIndex) {
    return scratch.planAtRemainingIndex(binding_1.binding.splToken2022AccountState(0), remainingAccountIndex);
}
function bindSplToken2022AccountTransferFeeWithheld(scratch, remainingAccountIndex) {
    return scratch.planAtRemainingIndex(binding_1.binding.splToken2022AccountTransferFeeWithheld(0), remainingAccountIndex);
}
function bindSplToken2022MintSupply(scratch, remainingAccountIndex) {
    return scratch.planAtRemainingIndex(binding_1.binding.splToken2022MintSupply(0), remainingAccountIndex);
}
function bindSplToken2022MintDecimals(scratch, remainingAccountIndex) {
    return scratch.planAtRemainingIndex(binding_1.binding.splToken2022MintDecimals(0), remainingAccountIndex);
}
function bindSplToken2022MintTransferFeeBasisPoints(scratch, remainingAccountIndex) {
    return scratch.planAtRemainingIndex(binding_1.binding.splToken2022MintTransferFeeBasisPoints(0), remainingAccountIndex);
}
function bindSplToken2022MintTransferFeeMaximum(scratch, remainingAccountIndex) {
    return scratch.planAtRemainingIndex(binding_1.binding.splToken2022MintTransferFeeMaximum(0), remainingAccountIndex);
}
function bindSplToken2022MintWithheldAmount(scratch, remainingAccountIndex) {
    return scratch.planAtRemainingIndex(binding_1.binding.splToken2022MintWithheldAmount(0), remainingAccountIndex);
}
function bindSplToken2022MintDefaultAccountState(scratch, remainingAccountIndex) {
    return scratch.planAtRemainingIndex(binding_1.binding.splToken2022MintDefaultAccountState(0), remainingAccountIndex);
}
