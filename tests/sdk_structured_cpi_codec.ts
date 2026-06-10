import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";
import {
  createInitializeMint2Instruction,
  createTransferCheckedInstruction,
  createTransferCheckedWithFeeInstruction,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { encodeCpi } from "../sdk/src/codec";
import {
  asValue,
  encodeStructuredCpiPatch,
  encodeStructuredCpiPatchPayload,
  structuredCpiPatch,
  structuredCpiPatchWireTag,
  STRUCTURED_CPI_PATCH_WIRE,
} from "../sdk/src/structured-cpi-patch";
import { structuredCpi, structuredCpiStep } from "../sdk/src/structured-cpi";
import { inferStructuredCpiPatchTag } from "../sdk/src/structured-cpi-infer";

describe("sdk structured CPI codec", () => {
  it("encodeStructuredCpiPatchPayload amountOnly matches nested Borsh body", () => {
    const patch = structuredCpiPatch.tokenTransferChecked.amountOnly(
      asValue({ index: 3 }),
      9
    );
    const buf = encodeStructuredCpiPatchPayload(patch);
    expect(buf).to.deep.equal(Buffer.from([0, 3, 9]));
    expect(encodeStructuredCpiPatch(patch)).to.deep.equal(
      Buffer.from([STRUCTURED_CPI_PATCH_WIRE.tokenTransferChecked, 0, 3, 9])
    );
    expect(structuredCpiPatchWireTag(patch)).to.equal(
      STRUCTURED_CPI_PATCH_WIRE.tokenTransferChecked
    );
  });

  it("encodeCpi structured has no data template", () => {
    const patch = structuredCpiPatch.tokenTransferChecked.amountOnly(
      asValue({ index: 3 }),
      9
    );
    const step = structuredCpiStep({
      accountsStart: 1,
      accountsLen: 4,
      patch,
    });
    const wire = encodeCpi(step);
    expect(wire).to.deep.equal(Buffer.from([2, 1, 4, 7, 0, 3, 9]));
  });

  it("structuredCpi builder derives accountsStart/Len from instruction", () => {
    const source = PublicKey.unique();
    const mint = PublicKey.unique();
    const dest = PublicKey.unique();
    const owner = PublicKey.unique();

    const template = createTransferCheckedInstruction(
      source,
      mint,
      dest,
      owner,
      0n,
      9
    );

    const built = structuredCpi(template, {
      patch: structuredCpiPatch.tokenTransferChecked.amountOnly(asValue({ index: 3 }), 9),
    }).build();

    expect(built.cpi.kind).to.equal("structured");
    expect(built.cpi.accountsStart).to.equal(0);
    expect(built.cpi.accountsLen).to.equal(1 + template.keys.length);
    expect(built.remaining[0].pubkey.equals(TOKEN_PROGRAM_ID)).to.equal(true);

    const wire = encodeCpi(built.cpi);
    expect(wire.subarray(3)).to.deep.equal(Buffer.from([7, 0, 3, 9]));
  });

  it("inferStructuredCpiPatchTag from transferChecked ix", () => {
    const template = createTransferCheckedInstruction(
      PublicKey.unique(),
      PublicKey.unique(),
      PublicKey.unique(),
      PublicKey.unique(),
      0n,
      9
    );
    const built = structuredCpi(template, {
      amountDecimals: {
        tag: "amountOnly",
        amount: asValue({ index: 3 }),
        decimals: 9,
      },
    }).build();
    expect(built.cpi.kind).to.equal("structured");
    if (built.cpi.kind !== "structured") return;
    expect(built.cpi.patch.tag).to.equal("tokenTransferChecked");
    expect(
      inferStructuredCpiPatchTag(template)
    ).to.equal("tokenTransferChecked");
  });

  it("inferStructuredCpiPatchTag from transferCheckedWithFee ix", () => {
    const template = createTransferCheckedWithFeeInstruction(
      PublicKey.unique(),
      PublicKey.unique(),
      PublicKey.unique(),
      PublicKey.unique(),
      0n,
      6,
      1n,
      [],
      TOKEN_2022_PROGRAM_ID
    );
    expect(inferStructuredCpiPatchTag(template)).to.equal(
      "token2022TransferCheckedWithFee"
    );
    expect(template.data[0]).to.equal(26);
    expect(template.data[1]).to.equal(1);
  });

  it("structuredCpiPatch exposes every STRUCTURED_CPI_PATCH_WIRE tag", () => {
    const wireKeys = Object.keys(STRUCTURED_CPI_PATCH_WIRE) as Array<
      keyof typeof STRUCTURED_CPI_PATCH_WIRE
    >;
    expect(wireKeys).to.have.length(29);
    for (const key of wireKeys) {
      expect(structuredCpiPatch).to.have.property(key);
    }
  });

  it("initializeMint patch wire omits data template", () => {
    const mint = PublicKey.unique();
    const authority = PublicKey.unique();
    const patch = structuredCpiPatch.initializeMint2({
      decimals: asValue({ index: 4 }),
      mintAuthority: authority.toBuffer(),
      freeze: { tag: "none" },
    });
    const step = structuredCpiStep({
      accountsStart: 0,
      accountsLen: 2,
      patch,
    });
    const wire = encodeCpi(step);
    expect(wire[0]).to.equal(2);
    expect(wire[1]).to.equal(0);
    expect(wire[2]).to.equal(2);
    expect(wire[3]).to.equal(STRUCTURED_CPI_PATCH_WIRE.tokenInitializeMint2);
    const payloadWire = wire.subarray(4);
    expect(payloadWire[0]).to.equal(4);
    expect(payloadWire[1]).to.equal(1);
    expect(payloadWire.subarray(2, 34)).to.deep.equal(authority.toBuffer());
    expect(payloadWire[34]).to.equal(0);
    expect(payloadWire.length).to.equal(35);

    const splIx = createInitializeMint2Instruction(
      mint,
      6,
      authority,
      null
    );
    expect(splIx.data[0]).to.equal(20);
    expect(splIx.data[1]).to.equal(6);
  });
});
