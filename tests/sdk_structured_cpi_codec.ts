import { expect } from "chai";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
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
import {
  inferStructuredCpiPatchTag,
  STAKE_PROGRAM_ID,
} from "../sdk/src/structured-cpi-infer";
import {
  stakeDeactivateInstruction,
  stakeWithdrawInstruction,
} from "./helpers/stake";

function tokenUnwrapLamportsInstruction(
  source: PublicKey,
  destination: PublicKey,
  authority: PublicKey,
  amount?: bigint
): TransactionInstruction {
  const data =
    amount === undefined
      ? Buffer.from([45, 0])
      : (() => {
          const amt = Buffer.alloc(8);
          amt.writeBigUInt64LE(amount);
          return Buffer.concat([Buffer.from([45, 1]), amt]);
        })();
  return {
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    data,
  };
}

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
    expect(wireKeys).to.have.length(34);
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

  it("encodeStructuredCpiPatch stake withdraw matches wire tag 29", () => {
    const patch = structuredCpiPatch.stakeWithdraw(asValue({ index: 2 }));
    const wire = encodeStructuredCpiPatch(patch);
    expect(wire).to.deep.equal(Buffer.from([29, 2]));
    expect(structuredCpiPatchWireTag(patch)).to.equal(
      STRUCTURED_CPI_PATCH_WIRE.stakeWithdraw
    );
  });

  it("inferStructuredCpiPatchTag resolves stake withdraw / deactivate", () => {
    const stake = PublicKey.unique();
    const recipient = PublicKey.unique();
    const authority = PublicKey.unique();
    const withdrawTpl = stakeWithdrawInstruction(
      stake,
      recipient,
      authority,
      0n
    );
    expect(withdrawTpl.programId.equals(STAKE_PROGRAM_ID)).to.equal(true);
    expect(inferStructuredCpiPatchTag(withdrawTpl)).to.equal("stakeWithdraw");

    const deactivateTpl = stakeDeactivateInstruction(stake, authority);
    expect(inferStructuredCpiPatchTag(deactivateTpl)).to.equal(
      "stakeDeactivate"
    );
  });

  it("structuredCpi builder infers stake withdraw patch tag", () => {
    const stake = PublicKey.unique();
    const recipient = PublicKey.unique();
    const authority = PublicKey.unique();
    const template = stakeWithdrawInstruction(
      stake,
      recipient,
      authority,
      1n
    );
    const built = structuredCpi(template, {
      lamports: asValue({ index: 0 }),
    }).build();
    expect(built.cpi.kind).to.equal("structured");
    const wire = encodeCpi(built.cpi);
    expect(wire.subarray(3, 5)).to.deep.equal(Buffer.from([29, 0]));
  });

  it("encodeStructuredCpiPatch tokenUnwrapLamports all matches nested Borsh", () => {
    const patch = structuredCpiPatch.tokenUnwrapLamports.all();
    expect(encodeStructuredCpiPatchPayload(patch)).to.deep.equal(
      Buffer.from([0])
    );
    expect(encodeStructuredCpiPatch(patch)).to.deep.equal(
      Buffer.from([STRUCTURED_CPI_PATCH_WIRE.tokenUnwrapLamports, 0])
    );
  });

  it("inferStructuredCpiPatchTag rejects token-2022 unwrap lamports", () => {
    const source = PublicKey.unique();
    const dest = PublicKey.unique();
    const authority = PublicKey.unique();
    const tpl = tokenUnwrapLamportsInstruction(source, dest, authority);
    expect(
      inferStructuredCpiPatchTag({
        ...tpl,
        programId: TOKEN_2022_PROGRAM_ID,
      })
    ).to.equal(null);
  });

  it("encodeStructuredCpiPatch tokenUnwrapLamports amount matches nested Borsh", () => {
    const patch = structuredCpiPatch.tokenUnwrapLamports.amount(
      asValue({ index: 2 })
    );
    expect(encodeStructuredCpiPatchPayload(patch)).to.deep.equal(
      Buffer.from([1, 2])
    );
    expect(encodeStructuredCpiPatch(patch)).to.deep.equal(
      Buffer.from([STRUCTURED_CPI_PATCH_WIRE.tokenUnwrapLamports, 1, 2])
    );
    expect(structuredCpiPatchWireTag(patch)).to.equal(
      STRUCTURED_CPI_PATCH_WIRE.tokenUnwrapLamports
    );
  });

  it("inferStructuredCpiPatchTag resolves token unwrap lamports", () => {
    const source = PublicKey.unique();
    const dest = PublicKey.unique();
    const authority = PublicKey.unique();
    const allTpl = tokenUnwrapLamportsInstruction(source, dest, authority);
    expect(inferStructuredCpiPatchTag(allTpl)).to.equal("tokenUnwrapLamports");

    const amountTpl = tokenUnwrapLamportsInstruction(
      source,
      dest,
      authority,
      5n
    );
    expect(inferStructuredCpiPatchTag(amountTpl)).to.equal(
      "tokenUnwrapLamports"
    );
  });

  it("structuredCpi builder infers token unwrap lamports patch tag", () => {
    const source = PublicKey.unique();
    const dest = PublicKey.unique();
    const authority = PublicKey.unique();
    const template = tokenUnwrapLamportsInstruction(source, dest, authority, 9n);
    const built = structuredCpi(template, {
      unwrapLamports: { tag: "amount", amount: asValue({ index: 0 }) },
    }).build();
    expect(built.cpi.kind).to.equal("structured");
    const wire = encodeCpi(built.cpi);
    expect(wire.subarray(3, 6)).to.deep.equal(Buffer.from([33, 1, 0]));
  });
});
