import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

import type { StructuredCpiPatch } from "./structured-cpi-patch";

/** SPL Token / Token-2022 instruction byte (first byte of ix data). */
const SPL_IX = {
  initializeMint: 0,
  initializeMultisig: 2,
  transfer: 3,
  approve: 4,
  mintTo: 7,
  burn: 8,
  transferChecked: 12,
  approveChecked: 13,
  mintToChecked: 14,
  burnChecked: 15,
  initializeMultisig2: 19,
  initializeMint2: 20,
  amountToUiAmount: 23,
  /** Token-2022 extension prefix (`TokenInstruction::TransferFeeExtension`). */
  transferFeeExtension: 26,
} as const;

/** TransferFee extension sub-instructions (byte after extension prefix). */
const TRANSFER_FEE_IX = {
  transferCheckedWithFee: 1,
  setTransferFee: 5,
} as const;

/** System program instruction (u32 LE at data[0..4]). */
const SYSTEM_IX = {
  createAccount: 0,
  transfer: 2,
  allocate: 8,
} as const;

export type StructuredCpiPatchTagName = StructuredCpiPatch["tag"];

function readSystemDiscriminator(data: Buffer): number | null {
  if (data.length < 4) return null;
  return data.readUInt32LE(0);
}

function inferToken2022TransferFee(
  data: Buffer
): StructuredCpiPatchTagName | null {
  if (data.length < 2 || data[0] !== SPL_IX.transferFeeExtension) {
    return null;
  }
  switch (data[1]) {
    case TRANSFER_FEE_IX.transferCheckedWithFee:
      return "token2022TransferCheckedWithFee";
    case TRANSFER_FEE_IX.setTransferFee:
      return "token2022SetTransferFee";
    default:
      return null;
  }
}

function inferTokenFamily(
  programId: PublicKey,
  data: Buffer
): StructuredCpiPatchTagName | null {
  const token = programId.equals(TOKEN_PROGRAM_ID);
  const token2022 = programId.equals(TOKEN_2022_PROGRAM_ID);
  if (!token && !token2022) return null;

  if (token2022) {
    const fee = inferToken2022TransferFee(data);
    if (fee) return fee;
  }

  const opcode = data[0];
  const prefix = token ? "token" : "token2022";
  switch (opcode) {
    case SPL_IX.transfer:
      return `${prefix}Transfer` as StructuredCpiPatchTagName;
    case SPL_IX.approve:
      return `${prefix}Approve` as StructuredCpiPatchTagName;
    case SPL_IX.mintTo:
      return `${prefix}MintTo` as StructuredCpiPatchTagName;
    case SPL_IX.burn:
      return `${prefix}Burn` as StructuredCpiPatchTagName;
    case SPL_IX.transferChecked:
      return `${prefix}TransferChecked` as StructuredCpiPatchTagName;
    case SPL_IX.approveChecked:
      return `${prefix}ApproveChecked` as StructuredCpiPatchTagName;
    case SPL_IX.mintToChecked:
      return `${prefix}MintToChecked` as StructuredCpiPatchTagName;
    case SPL_IX.burnChecked:
      return `${prefix}BurnChecked` as StructuredCpiPatchTagName;
    case SPL_IX.amountToUiAmount:
      return `${prefix}AmountToUiAmount` as StructuredCpiPatchTagName;
    case SPL_IX.initializeMint:
      return `${prefix}InitializeMint` as StructuredCpiPatchTagName;
    case SPL_IX.initializeMint2:
      return `${prefix}InitializeMint2` as StructuredCpiPatchTagName;
    case SPL_IX.initializeMultisig:
    case SPL_IX.initializeMultisig2:
      return `${prefix}InitializeMultisig` as StructuredCpiPatchTagName;
    default:
      return null;
  }
}

/**
 * Infer `StructuredCpiPatch.tag` from an official SDK instruction template.
 * Returns null when the program / opcode is not in the structured registry.
 */
export function inferStructuredCpiPatchTag(
  template: TransactionInstruction
): StructuredCpiPatchTagName | null {
  const { programId, data } = template;
  if (data.length === 0) return null;

  if (programId.equals(SystemProgram.programId)) {
    const disc = readSystemDiscriminator(data);
    switch (disc) {
      case SYSTEM_IX.transfer:
        return "systemTransfer";
      case SYSTEM_IX.createAccount:
        return "systemCreateAccount";
      case SYSTEM_IX.allocate:
        return "systemAllocate";
      default:
        return null;
    }
  }

  if (
    programId.equals(TOKEN_PROGRAM_ID) ||
    programId.equals(TOKEN_2022_PROGRAM_ID)
  ) {
    return inferTokenFamily(programId, data);
  }

  return null;
}

export function isStructuredCpiPatch(
  value: unknown
): value is StructuredCpiPatch {
  return (
    typeof value === "object" &&
    value !== null &&
    "tag" in value &&
    typeof (value as StructuredCpiPatch).tag === "string"
  );
}

/** Merge inferred tag with a patch body that omits `tag`. */
export function resolveStructuredCpiPatch(
  template: TransactionInstruction,
  input: StructuredCpiPatch | Record<string, unknown>
): StructuredCpiPatch {
  if (isStructuredCpiPatch(input)) {
    return input;
  }
  const tag = inferStructuredCpiPatchTag(template);
  if (!tag) {
    throw new Error(
      `cannot infer StructuredCpiPatch tag from program ${template.programId.toBase58()} (ix data len ${template.data.length})`
    );
  }
  return { tag, ...input } as StructuredCpiPatch;
}
