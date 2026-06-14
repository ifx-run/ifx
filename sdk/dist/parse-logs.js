"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIfxLogs = parseIfxLogs;
exports.firstIfxErrorInLogs = firstIfxErrorInLogs;
const errors_1 = require("./errors");
const CUSTOM_ERR_RE = /custom program error: 0x([0-9a-fA-F]+)/;
const ANCHOR_ERR_RE = /Error Code: (\w+)/;
const INSTRUCTION_FAILED_RE = /instruction #(\d+)/i;
const PROGRAM_FAILED_RE = /Program (\w+) failed/i;
function parseCustomProgramError(raw) {
    const m = raw.match(CUSTOM_ERR_RE);
    if (!m?.[1])
        return undefined;
    const parsed = Number.parseInt(m[1], 16);
    if (!Number.isFinite(parsed))
        return undefined;
    if ((0, errors_1.isIfxErrorCode)(parsed)) {
        return (0, errors_1.ifxErrorName)(parsed);
    }
    const low = parsed & 0xff;
    for (const [name, code] of Object.entries(errors_1.IFX_ERROR)) {
        if ((code & 0xff) === low) {
            return name;
        }
    }
    return undefined;
}
function parseAnchorErrorName(raw) {
    const m = raw.match(ANCHOR_ERR_RE);
    if (!m?.[1])
        return undefined;
    const name = m[1];
    return name in errors_1.IFX_ERROR ? name : undefined;
}
function parseLine(raw) {
    const instructionFailed = raw.match(INSTRUCTION_FAILED_RE);
    if (instructionFailed?.[1]) {
        return {
            raw,
            kind: "instruction_failed",
            instructionIndex: Number.parseInt(instructionFailed[1], 10),
        };
    }
    const anchorName = parseAnchorErrorName(raw);
    if (anchorName) {
        return {
            raw,
            kind: "ifx_error",
            errorName: anchorName,
            errorCode: errors_1.IFX_ERROR[anchorName],
        };
    }
    const customName = parseCustomProgramError(raw);
    if (customName) {
        return {
            raw,
            kind: "ifx_error",
            errorName: customName,
            errorCode: errors_1.IFX_ERROR[customName],
        };
    }
    if (PROGRAM_FAILED_RE.test(raw)) {
        return { raw, kind: "program_failed" };
    }
    return { raw, kind: "other" };
}
/**
 * Parse RPC / simulation log lines for Ifx error codes and instruction failure indices.
 * Venue-agnostic — pass the full `logs` array from `simulateTransaction` or `getTransaction`.
 */
function parseIfxLogs(logs) {
    return logs.map(parseLine);
}
/** First Ifx-named error in `logs`, if any. */
function firstIfxErrorInLogs(logs) {
    return parseIfxLogs(logs).find((l) => l.kind === "ifx_error");
}
