import { expect } from "chai";

import {
  decodeIfxInstruction,
  IFX_IX_NAMES,
  IX_DISC_LET,
  IX_DISC_RESET_FRAME,
  ifxIxHint,
} from "../sdk/src";

describe("decodeIfxInstruction", () => {
  it("maps discriminators to ix names", () => {
    expect(decodeIfxInstruction(Buffer.from([IX_DISC_RESET_FRAME])).name).to.equal(
      "ifx_reset_frame"
    );
    const letIx = decodeIfxInstruction(Buffer.from([IX_DISC_LET, 1, 2]));
    expect(letIx.name).to.equal("ifx_let");
    expect(letIx.payload).to.deep.equal(Buffer.from([1, 2]));
  });

  it("ifxIxHint returns undefined for unknown data", () => {
    expect(ifxIxHint(Buffer.from([99]))).to.be.undefined;
  });

  it("IFX_IX_NAMES covers all discriminators 0..7", () => {
    expect(IFX_IX_NAMES).to.have.length(8);
    expect(IFX_IX_NAMES[3]).to.equal("ifx_let");
  });
});
