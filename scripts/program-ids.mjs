/**
 * Program IDs per cluster. Local keypair is committed; devnet/mainnet pubkeys are committed;
 * devnet/mainnet keypairs stay out of git (see keys/README.md).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Keypair } from "@solana/web3.js";

export const LOCALNET_PROGRAM_ID_PREFIX = "ifxL";
export const DEVNET_PROGRAM_ID_PREFIX = "ifx";
export const MAINNET_PROGRAM_ID_PREFIX = "ifxM";
/** @deprecated use {@link LOCALNET_PROGRAM_ID_PREFIX} */
export const PROGRAM_ID_PREFIX = LOCALNET_PROGRAM_ID_PREFIX;

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export const PATHS = {
  localnetKeypair: path.join(root, "keys", "localnet-program-keypair.json"),
  devnetKeypair: path.join(root, "keys", "devnet-program-keypair.json"),
  devnetProgramId: path.join(root, "keys", "devnet.program-id"),
  mainnetKeypair: path.join(root, "keys", "mainnet-program-keypair.json"),
  mainnetProgramId: path.join(root, "keys", "mainnet.program-id"),
  anchorToml: path.join(root, "Anchor.toml"),
  sdkConstants: path.join(root, "sdk", "src", "constants.ts"),
  idlJson: path.join(root, "idl", "ifx.json"),
};

export function readKeypairPubkey(file) {
  const secret = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(secret) || secret.length < 64) {
    throw new Error(`invalid keypair: ${file}`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(secret)).publicKey.toBase58();
}

export function readProgramIdFile(file) {
  const id = fs.readFileSync(file, "utf8").trim();
  if (!id) throw new Error(`empty program id file: ${file}`);
  return id;
}

export function hasPrefix(id, prefix = PROGRAM_ID_PREFIX, exact = false) {
  return exact
    ? id.startsWith(prefix)
    : id.toLowerCase().startsWith(prefix.toLowerCase());
}

export function loadProgramIds() {
  const localnet = readKeypairPubkey(PATHS.localnetKeypair);
  const devnet = readProgramIdFile(PATHS.devnetProgramId);
  return { localnet, devnet };
}

/** Read program ids and DEFAULT from sdk/src/constants.ts */
export function readSdkProgramIds() {
  const src = fs.readFileSync(PATHS.sdkConstants, "utf8");
  const localnet = src.match(
    /IFX_LOCALNET_PROGRAM_ID = new PublicKey\(\s*\n?\s*"([^"]+)"/
  )?.[1];
  const devnet = src.match(
    /IFX_DEVNET_PROGRAM_ID = new PublicKey\(\s*\n?\s*"([^"]+)"/
  )?.[1];
  const defaultId = src.match(
    /DEFAULT_IFX_PROGRAM_ID = (IFX_[A-Z_]+)/
  )?.[1];
  if (!localnet || !devnet || !defaultId) {
    throw new Error("could not parse SDK program ids from constants.ts");
  }
  return { localnet, devnet, defaultRef: defaultId };
}
