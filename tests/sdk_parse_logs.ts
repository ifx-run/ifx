import { expect } from "chai";

import {
  firstIfxErrorInLogs,
  IFX_ERROR,
  parseIfxLogs,
} from "../sdk/src";

describe("parseIfxLogs", () => {
  it("extracts Anchor error names and custom program error codes", () => {
    const logs = [
      "Program ifxmwWVVZ invoke [1]",
      "Program log: AnchorError occurred. Error Code: AssertFailed. Error Number: 6005.",
      `Program ifxmwWVVZ failed: custom program error: 0x${(IFX_ERROR.AssertFailed & 0xff).toString(16)}`,
    ];
    const parsed = parseIfxLogs(logs);
    expect(parsed[1]!.kind).to.equal("ifx_error");
    expect(parsed[1]!.errorName).to.equal("AssertFailed");
    expect(parsed[1]!.errorCode).to.equal(IFX_ERROR.AssertFailed);
    expect(parsed[2]!.kind).to.equal("ifx_error");
    expect(firstIfxErrorInLogs(logs)?.errorName).to.equal("AssertFailed");
  });

  it("parses instruction failure index", () => {
    const parsed = parseIfxLogs(["Transaction simulation failed: Error processing Instruction #3"]);
    expect(parsed[0]!.kind).to.equal("instruction_failed");
    expect(parsed[0]!.instructionIndex).to.equal(3);
  });
});
