/**
 * Merkle `verify_leaf` via static CPI — R3.2 pattern (no new Ifx opcode).
 *
 * Lighthouse wraps `spl-account-compression` the same way: fixed instruction data
 * at tx build time, optional `ifx_assert` before/after for orchestration.
 *
 * **Not a runnable demo** — tree setup / proof bytes come from your indexer.
 * Wire the returned `Transaction` after filling `leaf`, `index`, `root` buffers.
 */
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

import { staticCpi, arm, expr, ifElseArgs, type FrameScratch } from "../src/index";

/** SPL Account Compression program (mainnet-beta / devnet). */
export const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey(
  "cmtDvXqtGCi66P9LBdgDJ2VGt4XHkZV6xQZQqKqKzq"
);

/** Anchor-style ix discriminator length for compression program instructions. */
export const COMPRESSION_IX_DISCRIMINATOR_LEN = 8;

export type MerkleVerifyLeafAccounts = {
  /** Concurrent merkle tree account. */
  merkleTree: PublicKey;
  /** Tree authority / delegate (program-specific). */
  treeAuthority: PublicKey;
  /** Leaf owner / payer per your tree config. */
  payer: PublicKey;
};

export type MerkleVerifyLeafProof = {
  /** 32-byte leaf hash (already hashed per tree config). */
  leaf: Buffer;
  /** Leaf index in the tree. */
  index: number;
  /** 32-byte root at verification time. */
  root: Buffer;
  /** Merkle proof nodes (each 32 bytes). */
  proof: Buffer[];
};

/** Build template ix data — layout follows spl-account-compression `verify_leaf`. */
export function buildVerifyLeafInstructionData(
  proof: MerkleVerifyLeafProof
): Buffer {
  if (proof.leaf.length !== 32 || proof.root.length !== 32) {
    throw new Error("leaf and root must be 32 bytes");
  }
  for (const node of proof.proof) {
    if (node.length !== 32) throw new Error("proof nodes must be 32 bytes");
  }
  const index = Buffer.alloc(4);
  index.writeUInt32LE(proof.index);
  return Buffer.concat([
    Buffer.alloc(COMPRESSION_IX_DISCRIMINATOR_LEN, 0),
    proof.root,
    proof.leaf,
    index,
    Buffer.concat(proof.proof),
  ]);
}

export function buildVerifyLeafInstruction(
  accounts: MerkleVerifyLeafAccounts,
  proof: MerkleVerifyLeafProof
): TransactionInstruction {
  return new TransactionInstruction({
    programId: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    keys: [
      { pubkey: accounts.merkleTree, isSigner: false, isWritable: true },
      { pubkey: accounts.treeAuthority, isSigner: false, isWritable: false },
      { pubkey: accounts.payer, isSigner: true, isWritable: false },
    ],
    data: buildVerifyLeafInstructionData(proof),
  });
}

/**
 * Plan reset → optional assert → static CPI verify_leaf.
 * Fill `proof` off-chain; Ifx does not hash or store proofs on Frame tape.
 */
export function planMerkleVerifyLeafTx(
  scratch: FrameScratch,
  accounts: MerkleVerifyLeafAccounts,
  proof: MerkleVerifyLeafProof
): Transaction {
  const verify = staticCpi(buildVerifyLeafInstruction(accounts, proof));
  const tx = new Transaction();
  tx.add(scratch.ixReset());
  tx.add(
    scratch.ixIfElse(
      ifElseArgs(expr.bool(true), arm.cpi(verify.staticStep)),
      verify.remaining
    )
  );
  return tx;
}
