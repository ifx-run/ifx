import { type IfxErrorName } from "./errors";
/** One parsed line from transaction simulation / RPC logs. */
export type ParsedIfxLog = {
    raw: string;
    kind: "ifx_error" | "instruction_failed" | "program_failed" | "other";
    instructionIndex?: number;
    errorName?: IfxErrorName;
    errorCode?: number;
};
/**
 * Parse RPC / simulation log lines for Ifx error codes and instruction failure indices.
 * Venue-agnostic — pass the full `logs` array from `simulateTransaction` or `getTransaction`.
 */
export declare function parseIfxLogs(logs: readonly string[]): ParsedIfxLog[];
/** First Ifx-named error in `logs`, if any. */
export declare function firstIfxErrorInLogs(logs: readonly string[]): ParsedIfxLog | undefined;
