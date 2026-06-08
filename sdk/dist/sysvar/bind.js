"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindClockSlot = bindClockSlot;
exports.bindClockEpochStartTimestamp = bindClockEpochStartTimestamp;
exports.bindClockEpoch = bindClockEpoch;
exports.bindClockLeaderScheduleEpoch = bindClockLeaderScheduleEpoch;
exports.bindClockUnixTimestamp = bindClockUnixTimestamp;
exports.bindRentMinimumBalance = bindRentMinimumBalance;
const binding_1 = require("../binding");
function bindClockSlot(scratch) {
    return scratch.plan(binding_1.binding.sysvarClockSlot());
}
function bindClockEpochStartTimestamp(scratch) {
    return scratch.plan(binding_1.binding.sysvarClockEpochStartTimestamp());
}
function bindClockEpoch(scratch) {
    return scratch.plan(binding_1.binding.sysvarClockEpoch());
}
function bindClockLeaderScheduleEpoch(scratch) {
    return scratch.plan(binding_1.binding.sysvarClockLeaderScheduleEpoch());
}
function bindClockUnixTimestamp(scratch) {
    return scratch.plan(binding_1.binding.sysvarClockUnixTimestamp());
}
function bindRentMinimumBalance(scratch, dataLen) {
    return scratch.plan(binding_1.binding.sysvarRentMinimumBalance(dataLen));
}
