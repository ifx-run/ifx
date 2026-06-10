"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRUCTURED_CPI_PATCH_WIRE = exports.structuredCpiPatchWireTag = exports.encodeStructuredCpiPatchPayload = exports.encodeStructuredCpiPatch = exports.asValue = exports.structuredCpiPatch = exports.resolveStructuredCpiPatch = exports.isStructuredCpiPatch = exports.inferStructuredCpiPatchTag = exports.StructuredCpiBuilder = void 0;
exports.structuredCpiStep = structuredCpiStep;
exports.structuredCpi = structuredCpi;
exports.encodeStructuredCpiWire = encodeStructuredCpiWire;
const cpi_1 = require("./cpi");
const structured_cpi_patch_1 = require("./structured-cpi-patch");
const structured_cpi_infer_1 = require("./structured-cpi-infer");
/** Build a structured CPI wire step (manual account slice — for codec tests). */
function structuredCpiStep(input) {
    return {
        kind: "structured",
        accountsStart: input.accountsStart,
        accountsLen: input.accountsLen,
        patch: input.patch,
    };
}
function normalizeStructuredCpiPatch(template, input) {
    if ((0, structured_cpi_infer_1.isStructuredCpiPatch)(input)) {
        return input;
    }
    if (typeof input === "object" && input !== null && "patch" in input) {
        const inner = input.patch;
        return (0, structured_cpi_infer_1.isStructuredCpiPatch)(inner)
            ? inner
            : (0, structured_cpi_infer_1.resolveStructuredCpiPatch)(template, inner);
    }
    return (0, structured_cpi_infer_1.resolveStructuredCpiPatch)(template, input);
}
/**
 * Structured CPI from an official SDK instruction — same account ergonomics as {@link cpi}.
 *
 * @example
 * ```ts
 * const built = structuredCpi(transferCheckedIx, {
 *   patch: structuredCpiPatch.tokenTransferChecked.amountOnly(amount, 9),
 * }).build();
 * tx.add(scratch.ixCpi(built));
 * ```
 */
class StructuredCpiBuilder {
    constructor(template, input) {
        this.programId = template.programId;
        this.ixKeys = template.keys.map((k) => ({
            pubkey: k.pubkey,
            isSigner: k.isSigner,
            isWritable: k.isWritable,
        }));
        this.patch = normalizeStructuredCpiPatch(template, input);
    }
    static fromInstruction(template, input) {
        return new StructuredCpiBuilder(template, input);
    }
    build(remaining) {
        const { accountsStart, accountsLen, remaining: metas } = (0, cpi_1.resolveCpiRemaining)(this.programId, this.ixKeys, remaining);
        const cpi = {
            kind: "structured",
            accountsStart,
            accountsLen,
            patch: this.patch,
        };
        return { cpi, remaining: metas };
    }
}
exports.StructuredCpiBuilder = StructuredCpiBuilder;
/** Shorthand for {@link StructuredCpiBuilder.fromInstruction}. */
function structuredCpi(template, input) {
    return StructuredCpiBuilder.fromInstruction(template, input);
}
var structured_cpi_infer_2 = require("./structured-cpi-infer");
Object.defineProperty(exports, "inferStructuredCpiPatchTag", { enumerable: true, get: function () { return structured_cpi_infer_2.inferStructuredCpiPatchTag; } });
Object.defineProperty(exports, "isStructuredCpiPatch", { enumerable: true, get: function () { return structured_cpi_infer_2.isStructuredCpiPatch; } });
Object.defineProperty(exports, "resolveStructuredCpiPatch", { enumerable: true, get: function () { return structured_cpi_infer_2.resolveStructuredCpiPatch; } });
function encodeStructuredCpiWire(step) {
    return Buffer.concat([
        Buffer.from([2, step.accountsStart, step.accountsLen]),
        (0, structured_cpi_patch_1.encodeStructuredCpiPatch)(step.patch),
    ]);
}
var structured_cpi_patch_2 = require("./structured-cpi-patch");
Object.defineProperty(exports, "structuredCpiPatch", { enumerable: true, get: function () { return structured_cpi_patch_2.structuredCpiPatch; } });
Object.defineProperty(exports, "asValue", { enumerable: true, get: function () { return structured_cpi_patch_2.asValue; } });
Object.defineProperty(exports, "encodeStructuredCpiPatch", { enumerable: true, get: function () { return structured_cpi_patch_2.encodeStructuredCpiPatch; } });
Object.defineProperty(exports, "encodeStructuredCpiPatchPayload", { enumerable: true, get: function () { return structured_cpi_patch_2.encodeStructuredCpiPatchPayload; } });
Object.defineProperty(exports, "structuredCpiPatchWireTag", { enumerable: true, get: function () { return structured_cpi_patch_2.structuredCpiPatchWireTag; } });
Object.defineProperty(exports, "STRUCTURED_CPI_PATCH_WIRE", { enumerable: true, get: function () { return structured_cpi_patch_2.STRUCTURED_CPI_PATCH_WIRE; } });
