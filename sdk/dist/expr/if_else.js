"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arm = void 0;
exports.ifElseArgs = ifElseArgs;
const arm_1 = require("./arm");
Object.defineProperty(exports, "arm", { enumerable: true, get: function () { return arm_1.arm; } });
const cond_1 = require("./cond");
function ifElseArgs(cond, thenArm, elseArm = arm_1.arm.skip()) {
    return { cond: (0, cond_1.toCond)(cond), thenArm, elseArm };
}
