/**
 * Structured CPI patch wire encoding (matches on-chain `StructuredCpiPatch`).
 *
 * One flat enum per official ix layout — no separate kind + payload layers.
 * Dynamic values use [`Value`] (Frame binding index).
 */

import { resolveRef } from "./expr";
import type { ScratchValue } from "./scratch";
import type { IfxTy } from "./typed";
import type { Value } from "./types";

const amountDecimalsTag = {
  amountOnly: 0,
  both: 1,
  decimalsOnly: 2,
} as const;

const lamportsSpaceTag = {
  lamportsOnly: 0,
  spaceOnly: 1,
  both: 2,
} as const;

const setTransferFeeTag = {
  bpsOnly: 0,
  maxOnly: 1,
  both: 2,
} as const;

const amountDecimalsFeeTag = {
  amountOnly: 0,
  decimalsOnly: 1,
  feeOnly: 2,
  amountDecimals: 3,
  amountFee: 4,
  decimalsFee: 5,
  allFromFrame: 6,
} as const;

const freezeAuthTag = {
  none: 0,
  someValue: 1,
  someLiteral: 2,
} as const;

const pubkeyValueTag = {
  fromFrame: 0,
  literal: 1,
} as const;

/** Wire tag 0–28 (matches on-chain `StructuredCpiPatch::wire_tag`). */
export const STRUCTURED_CPI_PATCH_WIRE = {
  /** (0) System `Transfer` — dynamic lamports. */
  systemTransfer: 0,
  /** (1) System `CreateAccount` — lamports/space via `LamportsSpacePatch`. */
  systemCreateAccount: 1,
  /** (2) System `Allocate` — dynamic space. */
  systemAllocate: 2,
  /** (3) SPL Token `Transfer` — dynamic amount. */
  tokenTransfer: 3,
  /** (4) SPL Token `Approve` — dynamic amount. */
  tokenApprove: 4,
  /** (5) SPL Token `MintTo` — dynamic amount. */
  tokenMintTo: 5,
  /** (6) SPL Token `Burn` — dynamic amount. */
  tokenBurn: 6,
  /** (7) SPL Token `TransferChecked` — `AmountDecimalsPatch`. */
  tokenTransferChecked: 7,
  /** (8) SPL Token `ApproveChecked` — `AmountDecimalsPatch`. */
  tokenApproveChecked: 8,
  /** (9) SPL Token `MintToChecked` — `AmountDecimalsPatch`. */
  tokenMintToChecked: 9,
  /** (10) SPL Token `BurnChecked` — `AmountDecimalsPatch`. */
  tokenBurnChecked: 10,
  /** (11) SPL Token `AmountToUiAmount` — dynamic amount. */
  tokenAmountToUiAmount: 11,
  /** (12) SPL Token `InitializeMint` — `InitializeMintPatch`. */
  tokenInitializeMint: 12,
  /** (13) SPL Token `InitializeMint2` — `InitializeMintPatch`. */
  tokenInitializeMint2: 13,
  /** (14) SPL Token `InitializeMultisig` — dynamic m. */
  tokenInitializeMultisig: 14,
  /** (15) Token-2022 `Transfer` — dynamic amount. */
  token2022Transfer: 15,
  /** (16) Token-2022 `Approve` — dynamic amount. */
  token2022Approve: 16,
  /** (17) Token-2022 `MintTo` — dynamic amount. */
  token2022MintTo: 17,
  /** (18) Token-2022 `Burn` — dynamic amount. */
  token2022Burn: 18,
  /** (19) Token-2022 `TransferChecked` — `AmountDecimalsPatch`. */
  token2022TransferChecked: 19,
  /** (20) Token-2022 `ApproveChecked` — `AmountDecimalsPatch`. */
  token2022ApproveChecked: 20,
  /** (21) Token-2022 `MintToChecked` — `AmountDecimalsPatch`. */
  token2022MintToChecked: 21,
  /** (22) Token-2022 `BurnChecked` — `AmountDecimalsPatch`. */
  token2022BurnChecked: 22,
  /** (23) Token-2022 `AmountToUiAmount` — dynamic amount. */
  token2022AmountToUiAmount: 23,
  /** (24) Token-2022 `InitializeMint` — `InitializeMintPatch`. */
  token2022InitializeMint: 24,
  /** (25) Token-2022 `InitializeMint2` — `InitializeMintPatch`. */
  token2022InitializeMint2: 25,
  /** (26) Token-2022 `InitializeMultisig` — dynamic m. */
  token2022InitializeMultisig: 26,
  /** (27) Token-2022 TransferFee `TransferCheckedWithFee` — `AmountDecimalsFeePatch`. */
  token2022TransferCheckedWithFee: 27,
  /** (28) Token-2022 TransferFee `SetTransferFee` — `SetTransferFeePatch`. */
  token2022SetTransferFee: 28,
} as const;

export type StructuredCpiPatchWireTag =
  (typeof STRUCTURED_CPI_PATCH_WIRE)[keyof typeof STRUCTURED_CPI_PATCH_WIRE];

export type ValueInput = Value | ScratchValue<IfxTy>;

export function asValue(source: ValueInput): Value {
  if (typeof source === "object" && source !== null && "index" in source) {
    const idx = (source as Value).index;
    if (typeof idx === "number") {
      return { index: idx };
    }
  }
  return { index: resolveRef(source as ScratchValue<IfxTy>).index };
}

/** `TransferChecked`-family sub-layout: Frame Value vs literal for amount/decimals. */
export type AmountDecimalsPatch =
  /** Amount from Frame; decimals literal. */
  | { tag: "amountOnly"; amount: Value; decimals: number }
  /** Amount and decimals from Frame. */
  | { tag: "both"; amount: Value; decimals: Value }
  /** Amount literal; decimals from Frame. */
  | { tag: "decimalsOnly"; amount: bigint; decimals: Value };

/** System `CreateAccount` sub-layout: Frame vs literal lamports/space. */
export type LamportsSpacePatch =
  | { tag: "lamportsOnly"; lamports: Value; space: bigint }
  | { tag: "spaceOnly"; lamports: bigint; space: Value }
  | { tag: "both"; lamports: Value; space: Value };

/** Token-2022 `TransferCheckedWithFee` sub-layout (≥1 Frame Value). */
export type AmountDecimalsFeePatch =
  | { tag: "amountOnly"; amount: Value; decimals: number; fee: bigint }
  | { tag: "decimalsOnly"; amount: bigint; decimals: Value; fee: bigint }
  | { tag: "feeOnly"; amount: bigint; decimals: number; fee: Value }
  | { tag: "amountDecimals"; amount: Value; decimals: Value; fee: bigint }
  | { tag: "amountFee"; amount: Value; decimals: number; fee: Value }
  | { tag: "decimalsFee"; amount: bigint; decimals: Value; fee: Value }
  | { tag: "allFromFrame"; amount: Value; decimals: Value; fee: Value };

/** Token-2022 TransferFee `SetTransferFee` sub-layout. */
export type SetTransferFeePatch =
  | { tag: "bpsOnly"; basisPoints: Value; maximumFee: bigint }
  | { tag: "maxOnly"; basisPoints: number; maximumFee: Value }
  | { tag: "both"; basisPoints: Value; maximumFee: Value };

/** Pubkey Value: Frame binding or 32-byte wire literal. */
export type PubkeyValue =
  | { tag: "fromFrame"; value: Value }
  | { tag: "literal"; bytes: Buffer };

/** Optional freeze authority on InitializeMint-family ixs. */
export type FreezeAuthPatch =
  | { tag: "none" }
  | { tag: "someValue"; pubkey: Value }
  | { tag: "someLiteral"; bytes: Buffer };

/** SPL `InitializeMint*` dynamic fields (decimals, mint authority, freeze). */
export type InitializeMintPatch = {
  decimals: Value;
  mintAuthority: PubkeyValue;
  freeze: FreezeAuthPatch;
};

/** Official-program CPI patch — ix variant + typed payload (1:1 with on-chain). */
export type StructuredCpiPatch =
  /** (0) System `Transfer` — dynamic lamports. */
  | { tag: "systemTransfer"; lamports: Value }
  /** (1) System `CreateAccount` — `LamportsSpacePatch`. */
  | { tag: "systemCreateAccount"; lamportsSpace: LamportsSpacePatch }
  /** (2) System `Allocate` — dynamic space. */
  | { tag: "systemAllocate"; space: Value }
  /** (3) SPL Token `Transfer` — dynamic amount. */
  | { tag: "tokenTransfer"; amount: Value }
  /** (4) SPL Token `Approve` — dynamic amount. */
  | { tag: "tokenApprove"; amount: Value }
  /** (5) SPL Token `MintTo` — dynamic amount. */
  | { tag: "tokenMintTo"; amount: Value }
  /** (6) SPL Token `Burn` — dynamic amount. */
  | { tag: "tokenBurn"; amount: Value }
  /** (7) SPL Token `TransferChecked` — `AmountDecimalsPatch`. */
  | { tag: "tokenTransferChecked"; amountDecimals: AmountDecimalsPatch }
  /** (8) SPL Token `ApproveChecked` — `AmountDecimalsPatch`. */
  | { tag: "tokenApproveChecked"; amountDecimals: AmountDecimalsPatch }
  /** (9) SPL Token `MintToChecked` — `AmountDecimalsPatch`. */
  | { tag: "tokenMintToChecked"; amountDecimals: AmountDecimalsPatch }
  /** (10) SPL Token `BurnChecked` — `AmountDecimalsPatch`. */
  | { tag: "tokenBurnChecked"; amountDecimals: AmountDecimalsPatch }
  /** (11) SPL Token `AmountToUiAmount` — dynamic amount. */
  | { tag: "tokenAmountToUiAmount"; amount: Value }
  /** (12) SPL Token `InitializeMint` — `InitializeMintPatch`. */
  | { tag: "tokenInitializeMint"; initializeMint: InitializeMintPatch }
  /** (13) SPL Token `InitializeMint2` — `InitializeMintPatch`. */
  | { tag: "tokenInitializeMint2"; initializeMint: InitializeMintPatch }
  /** (14) SPL Token `InitializeMultisig` — dynamic m. */
  | { tag: "tokenInitializeMultisig"; m: Value }
  /** (15) Token-2022 `Transfer` — dynamic amount. */
  | { tag: "token2022Transfer"; amount: Value }
  /** (16) Token-2022 `Approve` — dynamic amount. */
  | { tag: "token2022Approve"; amount: Value }
  /** (17) Token-2022 `MintTo` — dynamic amount. */
  | { tag: "token2022MintTo"; amount: Value }
  /** (18) Token-2022 `Burn` — dynamic amount. */
  | { tag: "token2022Burn"; amount: Value }
  /** (19) Token-2022 `TransferChecked` — `AmountDecimalsPatch`. */
  | { tag: "token2022TransferChecked"; amountDecimals: AmountDecimalsPatch }
  /** (20) Token-2022 `ApproveChecked` — `AmountDecimalsPatch`. */
  | { tag: "token2022ApproveChecked"; amountDecimals: AmountDecimalsPatch }
  /** (21) Token-2022 `MintToChecked` — `AmountDecimalsPatch`. */
  | { tag: "token2022MintToChecked"; amountDecimals: AmountDecimalsPatch }
  /** (22) Token-2022 `BurnChecked` — `AmountDecimalsPatch`. */
  | { tag: "token2022BurnChecked"; amountDecimals: AmountDecimalsPatch }
  /** (23) Token-2022 `AmountToUiAmount` — dynamic amount. */
  | { tag: "token2022AmountToUiAmount"; amount: Value }
  /** (24) Token-2022 `InitializeMint` — `InitializeMintPatch`. */
  | { tag: "token2022InitializeMint"; initializeMint: InitializeMintPatch }
  /** (25) Token-2022 `InitializeMint2` — `InitializeMintPatch`. */
  | { tag: "token2022InitializeMint2"; initializeMint: InitializeMintPatch }
  /** (26) Token-2022 `InitializeMultisig` — dynamic m. */
  | { tag: "token2022InitializeMultisig"; m: Value }
  /** (27) Token-2022 TransferFee `TransferCheckedWithFee` — `AmountDecimalsFeePatch`. */
  | { tag: "token2022TransferCheckedWithFee"; amountDecimalsFee: AmountDecimalsFeePatch }
  /** (28) Token-2022 TransferFee `SetTransferFee` — `SetTransferFeePatch`. */
  | { tag: "token2022SetTransferFee"; setTransferFee: SetTransferFeePatch };

function writeU64(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n);
  return b;
}

function writeU16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}

function writeValueIndex(source: Value): Buffer {
  return Buffer.from([source.index]);
}

function assertPubkey32(buf: Buffer, label: string): void {
  if (buf.length !== 32) {
    throw new Error(`${label} must be 32 bytes, got ${buf.length}`);
  }
}

export function structuredCpiPatchWireTag(patch: StructuredCpiPatch): number {
  return STRUCTURED_CPI_PATCH_WIRE[patch.tag];
}

function encodeAmountDecimalsPatch(patch: AmountDecimalsPatch): Buffer {
  switch (patch.tag) {
    case "amountOnly":
      return Buffer.concat([
        Buffer.from([amountDecimalsTag.amountOnly]),
        writeValueIndex(patch.amount),
        Buffer.from([patch.decimals]),
      ]);
    case "both":
      return Buffer.concat([
        Buffer.from([amountDecimalsTag.both]),
        writeValueIndex(patch.amount),
        writeValueIndex(patch.decimals),
      ]);
    case "decimalsOnly":
      return Buffer.concat([
        Buffer.from([amountDecimalsTag.decimalsOnly]),
        writeU64(patch.amount),
        writeValueIndex(patch.decimals),
      ]);
  }
}

function encodeLamportsSpacePatch(patch: LamportsSpacePatch): Buffer {
  switch (patch.tag) {
    case "lamportsOnly":
      return Buffer.concat([
        Buffer.from([lamportsSpaceTag.lamportsOnly]),
        writeValueIndex(patch.lamports),
        writeU64(patch.space),
      ]);
    case "spaceOnly":
      return Buffer.concat([
        Buffer.from([lamportsSpaceTag.spaceOnly]),
        writeU64(patch.lamports),
        writeValueIndex(patch.space),
      ]);
    case "both":
      return Buffer.concat([
        Buffer.from([lamportsSpaceTag.both]),
        writeValueIndex(patch.lamports),
        writeValueIndex(patch.space),
      ]);
  }
}

function encodeAmountDecimalsFeePatch(patch: AmountDecimalsFeePatch): Buffer {
  switch (patch.tag) {
    case "amountOnly":
      return Buffer.concat([
        Buffer.from([amountDecimalsFeeTag.amountOnly]),
        writeValueIndex(patch.amount),
        Buffer.from([patch.decimals]),
        writeU64(patch.fee),
      ]);
    case "decimalsOnly":
      return Buffer.concat([
        Buffer.from([amountDecimalsFeeTag.decimalsOnly]),
        writeU64(patch.amount),
        writeValueIndex(patch.decimals),
        writeU64(patch.fee),
      ]);
    case "feeOnly":
      return Buffer.concat([
        Buffer.from([amountDecimalsFeeTag.feeOnly]),
        writeU64(patch.amount),
        Buffer.from([patch.decimals]),
        writeValueIndex(patch.fee),
      ]);
    case "amountDecimals":
      return Buffer.concat([
        Buffer.from([amountDecimalsFeeTag.amountDecimals]),
        writeValueIndex(patch.amount),
        writeValueIndex(patch.decimals),
        writeU64(patch.fee),
      ]);
    case "amountFee":
      return Buffer.concat([
        Buffer.from([amountDecimalsFeeTag.amountFee]),
        writeValueIndex(patch.amount),
        Buffer.from([patch.decimals]),
        writeValueIndex(patch.fee),
      ]);
    case "decimalsFee":
      return Buffer.concat([
        Buffer.from([amountDecimalsFeeTag.decimalsFee]),
        writeU64(patch.amount),
        writeValueIndex(patch.decimals),
        writeValueIndex(patch.fee),
      ]);
    case "allFromFrame":
      return Buffer.concat([
        Buffer.from([amountDecimalsFeeTag.allFromFrame]),
        writeValueIndex(patch.amount),
        writeValueIndex(patch.decimals),
        writeValueIndex(patch.fee),
      ]);
  }
}

function encodeSetTransferFeePatch(patch: SetTransferFeePatch): Buffer {
  switch (patch.tag) {
    case "bpsOnly":
      return Buffer.concat([
        Buffer.from([setTransferFeeTag.bpsOnly]),
        writeValueIndex(patch.basisPoints),
        writeU64(patch.maximumFee),
      ]);
    case "maxOnly":
      return Buffer.concat([
        Buffer.from([setTransferFeeTag.maxOnly]),
        writeU16(patch.basisPoints),
        writeValueIndex(patch.maximumFee),
      ]);
    case "both":
      return Buffer.concat([
        Buffer.from([setTransferFeeTag.both]),
        writeValueIndex(patch.basisPoints),
        writeValueIndex(patch.maximumFee),
      ]);
  }
}

function encodePubkeyValue(value: PubkeyValue): Buffer {
  switch (value.tag) {
    case "fromFrame":
      return Buffer.concat([
        Buffer.from([pubkeyValueTag.fromFrame]),
        writeValueIndex(value.value),
      ]);
    case "literal":
      assertPubkey32(value.bytes, "pubkeyValue.literal");
      return Buffer.concat([
        Buffer.from([pubkeyValueTag.literal]),
        value.bytes,
      ]);
  }
}

function encodeFreezeAuthPatch(freeze: FreezeAuthPatch): Buffer {
  switch (freeze.tag) {
    case "none":
      return Buffer.from([freezeAuthTag.none]);
    case "someValue":
      return Buffer.concat([
        Buffer.from([freezeAuthTag.someValue]),
        writeValueIndex(freeze.pubkey),
      ]);
    case "someLiteral":
      assertPubkey32(freeze.bytes, "freeze.someLiteral");
      return Buffer.concat([
        Buffer.from([freezeAuthTag.someLiteral]),
        freeze.bytes,
      ]);
  }
}

function encodeInitializeMintPatch(patch: InitializeMintPatch): Buffer {
  return Buffer.concat([
    writeValueIndex(patch.decimals),
    encodePubkeyValue(patch.mintAuthority),
    encodeFreezeAuthPatch(patch.freeze),
  ]);
}

/** Encode nested patch body (Borsh enum payload only — no top-level variant tag). */
function encodeStructuredCpiPatchBody(patch: StructuredCpiPatch): Buffer {
  switch (patch.tag) {
    case "systemTransfer":
      return writeValueIndex(patch.lamports);
    case "systemCreateAccount":
      return encodeLamportsSpacePatch(patch.lamportsSpace);
    case "systemAllocate":
      return writeValueIndex(patch.space);
    case "tokenTransfer":
    case "tokenApprove":
    case "tokenMintTo":
    case "tokenBurn":
    case "tokenAmountToUiAmount":
    case "token2022Transfer":
    case "token2022Approve":
    case "token2022MintTo":
    case "token2022Burn":
    case "token2022AmountToUiAmount":
      return writeValueIndex(patch.amount);
    case "tokenTransferChecked":
    case "tokenApproveChecked":
    case "tokenMintToChecked":
    case "tokenBurnChecked":
    case "token2022TransferChecked":
    case "token2022ApproveChecked":
    case "token2022MintToChecked":
    case "token2022BurnChecked":
      return encodeAmountDecimalsPatch(patch.amountDecimals);
    case "tokenInitializeMultisig":
    case "token2022InitializeMultisig":
      return writeValueIndex(patch.m);
    case "token2022TransferCheckedWithFee":
      return encodeAmountDecimalsFeePatch(patch.amountDecimalsFee);
    case "token2022SetTransferFee":
      return encodeSetTransferFeePatch(patch.setTransferFee);
    case "tokenInitializeMint":
    case "tokenInitializeMint2":
    case "token2022InitializeMint":
    case "token2022InitializeMint2":
      return encodeInitializeMintPatch(patch.initializeMint);
  }
}

/** Full Borsh `StructuredCpiPatch` bytes (variant tag + nested payload). */
export function encodeStructuredCpiPatch(patch: StructuredCpiPatch): Buffer {
  return Buffer.concat([
    Buffer.from([structuredCpiPatchWireTag(patch)]),
    encodeStructuredCpiPatchBody(patch),
  ]);
}

/**
 * @deprecated Use {@link encodeStructuredCpiPatch}. Legacy layout omitted the top-level
 * variant tag (it lived in `Cpi::Structured` before `accounts_start`).
 */
export function encodeStructuredCpiPatchPayload(patch: StructuredCpiPatch): Buffer {
  return encodeStructuredCpiPatchBody(patch);
}

function buildInitializeMintPatch(args: {
  decimals: ValueInput;
  mintAuthority: ValueInput | Buffer;
  freeze?: FreezeAuthPatch;
}): InitializeMintPatch {
  const mintAuthority: PubkeyValue = Buffer.isBuffer(args.mintAuthority)
    ? { tag: "literal", bytes: args.mintAuthority }
    : { tag: "fromFrame", value: asValue(args.mintAuthority) };
  return {
    decimals: asValue(args.decimals),
    mintAuthority,
    freeze: args.freeze ?? { tag: "none" },
  };
}

type AmountDecimalsPatchTag = StructuredCpiPatch["tag"] &
  (
    | "tokenTransferChecked"
    | "tokenApproveChecked"
    | "tokenMintToChecked"
    | "tokenBurnChecked"
    | "token2022TransferChecked"
    | "token2022ApproveChecked"
    | "token2022MintToChecked"
    | "token2022BurnChecked"
  );

function amountDecimalsPatch(
  tag: AmountDecimalsPatchTag,
  amountDecimals: AmountDecimalsPatch
): StructuredCpiPatch {
  return { tag, amountDecimals } as StructuredCpiPatch;
}

function amountDecimalsBuilders(tag: AmountDecimalsPatchTag) {
  return {
    amountOnly(amount: ValueInput, decimals: number): StructuredCpiPatch {
      return amountDecimalsPatch(tag, {
        tag: "amountOnly",
        amount: asValue(amount),
        decimals,
      });
    },
    both(amount: ValueInput, decimals: ValueInput): StructuredCpiPatch {
      return amountDecimalsPatch(tag, {
        tag: "both",
        amount: asValue(amount),
        decimals: asValue(decimals),
      });
    },
    decimalsOnly(amount: bigint, decimals: ValueInput): StructuredCpiPatch {
      return amountDecimalsPatch(tag, {
        tag: "decimalsOnly",
        amount,
        decimals: asValue(decimals),
      });
    },
  };
}

type AmountDecimalsFeePatchTag = "token2022TransferCheckedWithFee";

function amountDecimalsFeePatch(
  tag: AmountDecimalsFeePatchTag,
  amountDecimalsFee: AmountDecimalsFeePatch
): StructuredCpiPatch {
  return { tag, amountDecimalsFee };
}

function amountDecimalsFeeBuilders(tag: AmountDecimalsFeePatchTag) {
  return {
    amountOnly(
      amount: ValueInput,
      decimals: number,
      fee: bigint
    ): StructuredCpiPatch {
      return amountDecimalsFeePatch(tag, {
        tag: "amountOnly",
        amount: asValue(amount),
        decimals,
        fee,
      });
    },
    decimalsOnly(
      amount: bigint,
      decimals: ValueInput,
      fee: bigint
    ): StructuredCpiPatch {
      return amountDecimalsFeePatch(tag, {
        tag: "decimalsOnly",
        amount,
        decimals: asValue(decimals),
        fee,
      });
    },
    feeOnly(
      amount: bigint,
      decimals: number,
      fee: ValueInput
    ): StructuredCpiPatch {
      return amountDecimalsFeePatch(tag, {
        tag: "feeOnly",
        amount,
        decimals,
        fee: asValue(fee),
      });
    },
    amountDecimals(
      amount: ValueInput,
      decimals: ValueInput,
      fee: bigint
    ): StructuredCpiPatch {
      return amountDecimalsFeePatch(tag, {
        tag: "amountDecimals",
        amount: asValue(amount),
        decimals: asValue(decimals),
        fee,
      });
    },
    amountFee(
      amount: ValueInput,
      decimals: number,
      fee: ValueInput
    ): StructuredCpiPatch {
      return amountDecimalsFeePatch(tag, {
        tag: "amountFee",
        amount: asValue(amount),
        decimals,
        fee: asValue(fee),
      });
    },
    decimalsFee(
      amount: bigint,
      decimals: ValueInput,
      fee: ValueInput
    ): StructuredCpiPatch {
      return amountDecimalsFeePatch(tag, {
        tag: "decimalsFee",
        amount,
        decimals: asValue(decimals),
        fee: asValue(fee),
      });
    },
    allFromFrame(
      amount: ValueInput,
      decimals: ValueInput,
      fee: ValueInput
    ): StructuredCpiPatch {
      return amountDecimalsFeePatch(tag, {
        tag: "allFromFrame",
        amount: asValue(amount),
        decimals: asValue(decimals),
        fee: asValue(fee),
      });
    },
  };
}

type InitializeMintPatchTag = StructuredCpiPatch["tag"] &
  (
    | "tokenInitializeMint"
    | "tokenInitializeMint2"
    | "token2022InitializeMint"
    | "token2022InitializeMint2"
  );

function initializeMintBuilder(tag: InitializeMintPatchTag) {
  return (args: {
    decimals: ValueInput;
    mintAuthority: ValueInput | Buffer;
    freeze?: FreezeAuthPatch;
  }): StructuredCpiPatch =>
    ({
      tag,
      initializeMint: buildInitializeMintPatch(args),
    }) as StructuredCpiPatch;
}

/** Builders for every wire tag in {@link STRUCTURED_CPI_PATCH_WIRE} (0–28). */
export const structuredCpiPatch = {
  systemTransfer(lamports: ValueInput): StructuredCpiPatch {
    return { tag: "systemTransfer", lamports: asValue(lamports) };
  },
  systemCreateAccount: {
    lamportsOnly(lamports: ValueInput, space: bigint): StructuredCpiPatch {
      return {
        tag: "systemCreateAccount",
        lamportsSpace: {
          tag: "lamportsOnly",
          lamports: asValue(lamports),
          space,
        },
      };
    },
    spaceOnly(lamports: bigint, space: ValueInput): StructuredCpiPatch {
      return {
        tag: "systemCreateAccount",
        lamportsSpace: {
          tag: "spaceOnly",
          lamports,
          space: asValue(space),
        },
      };
    },
    both(lamports: ValueInput, space: ValueInput): StructuredCpiPatch {
      return {
        tag: "systemCreateAccount",
        lamportsSpace: {
          tag: "both",
          lamports: asValue(lamports),
          space: asValue(space),
        },
      };
    },
  },
  systemAllocate(space: ValueInput): StructuredCpiPatch {
    return { tag: "systemAllocate", space: asValue(space) };
  },
  tokenTransfer(amount: ValueInput): StructuredCpiPatch {
    return { tag: "tokenTransfer", amount: asValue(amount) };
  },
  tokenApprove(amount: ValueInput): StructuredCpiPatch {
    return { tag: "tokenApprove", amount: asValue(amount) };
  },
  tokenMintTo(amount: ValueInput): StructuredCpiPatch {
    return { tag: "tokenMintTo", amount: asValue(amount) };
  },
  tokenBurn(amount: ValueInput): StructuredCpiPatch {
    return { tag: "tokenBurn", amount: asValue(amount) };
  },
  tokenTransferChecked: amountDecimalsBuilders("tokenTransferChecked"),
  tokenApproveChecked: amountDecimalsBuilders("tokenApproveChecked"),
  tokenMintToChecked: amountDecimalsBuilders("tokenMintToChecked"),
  tokenBurnChecked: amountDecimalsBuilders("tokenBurnChecked"),
  tokenAmountToUiAmount(amount: ValueInput): StructuredCpiPatch {
    return { tag: "tokenAmountToUiAmount", amount: asValue(amount) };
  },
  tokenInitializeMint: initializeMintBuilder("tokenInitializeMint"),
  tokenInitializeMint2: initializeMintBuilder("tokenInitializeMint2"),
  tokenInitializeMultisig(m: ValueInput): StructuredCpiPatch {
    return { tag: "tokenInitializeMultisig", m: asValue(m) };
  },
  token2022Transfer(amount: ValueInput): StructuredCpiPatch {
    return { tag: "token2022Transfer", amount: asValue(amount) };
  },
  token2022Approve(amount: ValueInput): StructuredCpiPatch {
    return { tag: "token2022Approve", amount: asValue(amount) };
  },
  token2022MintTo(amount: ValueInput): StructuredCpiPatch {
    return { tag: "token2022MintTo", amount: asValue(amount) };
  },
  token2022Burn(amount: ValueInput): StructuredCpiPatch {
    return { tag: "token2022Burn", amount: asValue(amount) };
  },
  token2022TransferChecked: amountDecimalsBuilders("token2022TransferChecked"),
  token2022ApproveChecked: amountDecimalsBuilders("token2022ApproveChecked"),
  token2022MintToChecked: amountDecimalsBuilders("token2022MintToChecked"),
  token2022BurnChecked: amountDecimalsBuilders("token2022BurnChecked"),
  token2022AmountToUiAmount(amount: ValueInput): StructuredCpiPatch {
    return { tag: "token2022AmountToUiAmount", amount: asValue(amount) };
  },
  token2022InitializeMint: initializeMintBuilder("token2022InitializeMint"),
  token2022InitializeMint2: initializeMintBuilder("token2022InitializeMint2"),
  token2022InitializeMultisig(m: ValueInput): StructuredCpiPatch {
    return { tag: "token2022InitializeMultisig", m: asValue(m) };
  },
  token2022TransferCheckedWithFee: amountDecimalsFeeBuilders(
    "token2022TransferCheckedWithFee"
  ),
  token2022SetTransferFee: {
    bpsOnly(basisPoints: ValueInput, maximumFee: bigint): StructuredCpiPatch {
      return {
        tag: "token2022SetTransferFee",
        setTransferFee: {
          tag: "bpsOnly",
          basisPoints: asValue(basisPoints),
          maximumFee,
        },
      };
    },
    maxOnly(basisPoints: number, maximumFee: ValueInput): StructuredCpiPatch {
      return {
        tag: "token2022SetTransferFee",
        setTransferFee: {
          tag: "maxOnly",
          basisPoints,
          maximumFee: asValue(maximumFee),
        },
      };
    },
    both(basisPoints: ValueInput, maximumFee: ValueInput): StructuredCpiPatch {
      return {
        tag: "token2022SetTransferFee",
        setTransferFee: {
          tag: "both",
          basisPoints: asValue(basisPoints),
          maximumFee: asValue(maximumFee),
        },
      };
    },
  },
  /** @deprecated Use {@link structuredCpiPatch.tokenTransfer}. */
  tokenAmount(amount: ValueInput): StructuredCpiPatch {
    return structuredCpiPatch.tokenTransfer(amount);
  },
  /** @deprecated Use {@link structuredCpiPatch.tokenInitializeMint2}. */
  initializeMint2: initializeMintBuilder("tokenInitializeMint2"),
};
