import { expect } from "chai";

import {
  IFX_ERROR,
  IFX_ERROR_CODE_BASE,
  ifxErrorName,
  isIfxErrorCode,
} from "../sdk/src/errors";
import idl from "../idl/ifx.json";

describe("sdk Ifx error codes", () => {
  it("IFX_ERROR matches IDL errors array (6000 + index)", () => {
    expect(IFX_ERROR_CODE_BASE).to.equal(6000);
    const idlErrors = idl.errors as { code: number; name: string; msg: string }[];
    const sdkErrorNames = Object.keys(IFX_ERROR);
    expect(idlErrors.length).to.equal(sdkErrorNames.length);

    for (let i = 0; i < idlErrors.length; i++) {
      const entry = idlErrors[i]!;
      expect(entry.code).to.equal(IFX_ERROR_CODE_BASE + i);
      expect(IFX_ERROR[entry.name as keyof typeof IFX_ERROR]).to.equal(
        entry.code
      );
    }
  });

  it("ifxErrorName round-trips known codes", () => {
    expect(ifxErrorName(6022)).to.equal("IndexCapReached");
    expect(ifxErrorName(6028)).to.equal("CastOverflow");
    expect(ifxErrorName(9999)).to.be.undefined;
    expect(isIfxErrorCode(6005)).to.be.true;
    expect(isIfxErrorCode(7000)).to.be.false;
  });
});
