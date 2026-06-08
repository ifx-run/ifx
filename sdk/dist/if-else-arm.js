"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IF_ELSE_ARM = void 0;
exports.ifElseArmStepTag = ifElseArmStepTag;
/** `ifx_if_else` arm wire tags (single u8 per arm). See `docs/implementation.md`. */
exports.IF_ELSE_ARM = {
    skip: 0x00,
    revert: 0xff,
    stepMin: 0x01,
    stepMax: 0xfe,
    maxSteps: 254,
};
function ifElseArmStepTag(count) {
    if (count < 1 || count > exports.IF_ELSE_ARM.maxSteps) {
        throw new Error(`IfElseArm step count must be 1..=${exports.IF_ELSE_ARM.maxSteps}, got ${count}`);
    }
    return count;
}
