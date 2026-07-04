#!/usr/bin/env node
/**
 * Ensure program ids are consistent: keys/, declare_id!, Anchor.toml, SDK, IDL.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  PATHS,
  LOCALNET_PROGRAM_ID_PREFIX,
  DEVNET_PROGRAM_ID_PREFIX,
  MAINNET_PROGRAM_ID_PREFIX,
  hasPrefix,
  loadProgramIds,
  readKeypairPubkey,
  readSdkProgramIds,
} from "./program-ids.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function main() {
  const errors = [];
  const keys = loadProgramIds();
  const sdk = readSdkProgramIds();

  for (const [label, id, prefix] of [
    ["localnet (keys)", keys.localnet, LOCALNET_PROGRAM_ID_PREFIX],
    ["devnet (keys)", keys.devnet, DEVNET_PROGRAM_ID_PREFIX],
    ["mainnet (keys)", keys.mainnet, MAINNET_PROGRAM_ID_PREFIX],
    ["localnet (sdk)", sdk.localnet, LOCALNET_PROGRAM_ID_PREFIX],
    ["devnet (sdk)", sdk.devnet, DEVNET_PROGRAM_ID_PREFIX],
    ["mainnet (sdk)", sdk.mainnet, MAINNET_PROGRAM_ID_PREFIX],
  ]) {
    if (!hasPrefix(id, prefix)) {
      errors.push(`${label} must start with "${prefix}": ${id}`);
    }
  }

  if (keys.localnet !== sdk.localnet) {
    errors.push(
      `sdk IFX_LOCALNET_PROGRAM_ID ${sdk.localnet} != keys localnet ${keys.localnet}`
    );
  }
  if (keys.devnet !== sdk.devnet) {
    errors.push(
      `sdk IFX_DEVNET_PROGRAM_ID ${sdk.devnet} != keys devnet ${keys.devnet}`
    );
  }
  if (keys.mainnet !== sdk.mainnet) {
    errors.push(
      `sdk IFX_MAINNET_PROGRAM_ID ${sdk.mainnet} != keys mainnet ${keys.mainnet}`
    );
  }

  if (sdk.defaultRef !== "IFX_MAINNET_PROGRAM_ID") {
    errors.push(
      `sdk DEFAULT_IFX_PROGRAM_ID must be IFX_MAINNET_PROGRAM_ID (got ${sdk.defaultRef})`
    );
  }

  if (keys.localnet === keys.devnet || keys.localnet === keys.mainnet || keys.devnet === keys.mainnet) {
    errors.push("localnet, devnet, and mainnet program ids must differ");
  }

  const libRs = fs.readFileSync(
    path.join(root, "programs/ifx/src/lib.rs"),
    "utf8"
  );

  const cfgGatedDeclareIds =
    libRs.includes('not(feature = "devnet")') &&
    libRs.includes('feature = "devnet"') &&
    libRs.includes('feature = "mainnet"');

  if (cfgGatedDeclareIds) {
    const localnetCfg =
      '#[cfg(all(not(feature = "devnet"), not(feature = "mainnet")))]';
    const devnetCfg =
      '#[cfg(all(feature = "devnet", not(feature = "mainnet")))]';
    const mainnetCfg =
      '#[cfg(all(feature = "mainnet", not(feature = "devnet")))]';
    for (const [label, cfg, id] of [
      ["localnet", localnetCfg, keys.localnet],
      ["devnet", devnetCfg, keys.devnet],
      ["mainnet", mainnetCfg, keys.mainnet],
    ]) {
      if (!libRs.includes(cfg)) {
        errors.push(`lib.rs missing ${label} declare_id! cfg gate`);
      }
      if (!libRs.includes(`declare_id!("${id}")`)) {
        errors.push(`lib.rs missing ${label} declare_id! ${id}`);
      }
    }
  } else {
    if (!libRs.includes(`declare_id!("${keys.localnet}")`)) {
      errors.push(
        `lib.rs declare_id! must be localnet ${keys.localnet} (run: npm run keys:restore)`
      );
    }
    if (libRs.includes(`declare_id!("${keys.devnet}")`)) {
      errors.push(
        `lib.rs still has devnet declare_id! ${keys.devnet} (run: npm run keys:restore)`
      );
    }
  }

  const anchorToml = fs.readFileSync(PATHS.anchorToml, "utf8");
  if (
    !anchorToml.includes(`[programs.localnet]`) ||
    !anchorToml.includes(`ifx = "${keys.localnet}"`)
  ) {
    errors.push(`Anchor.toml [programs.localnet] missing ${keys.localnet}`);
  }
  if (
    !anchorToml.includes(`[programs.devnet]`) ||
    !anchorToml.includes(`ifx = "${keys.devnet}"`)
  ) {
    errors.push(`Anchor.toml [programs.devnet] missing ${keys.devnet}`);
  }
  if (
    !anchorToml.includes(`[programs.mainnet]`) ||
    !anchorToml.includes(`ifx = "${keys.mainnet}"`)
  ) {
    errors.push(`Anchor.toml [programs.mainnet] missing ${keys.mainnet}`);
  }

  if (fs.existsSync(PATHS.devnetKeypair)) {
    const devnetKeyPub = readKeypairPubkey(PATHS.devnetKeypair);
    if (devnetKeyPub !== keys.devnet) {
      errors.push(
        `keys/devnet-program-keypair.json: ${devnetKeyPub} (expected ${keys.devnet})`
      );
    }
  }

  if (fs.existsSync(PATHS.mainnetKeypair)) {
    const mainnetKeyPub = readKeypairPubkey(PATHS.mainnetKeypair);
    if (mainnetKeyPub !== keys.mainnet) {
      errors.push(
        `keys/mainnet-program-keypair.json: ${mainnetKeyPub} (expected ${keys.mainnet})`
      );
    }
  }

  const idl = JSON.parse(fs.readFileSync(PATHS.idlJson, "utf8"));
  if (idl.address !== keys.localnet) {
    errors.push(
      `idl/ifx.json address ${idl.address} (expected localnet ${keys.localnet})`
    );
  }

  for (const rel of [
    "target/deploy/ifx-keypair.json",
    "programs/ifx/target/deploy/ifx-keypair.json",
  ]) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) {
      errors.push(`missing ${rel} (run: npm run keys:sync)`);
      continue;
    }
    const pub = readKeypairPubkey(p);
    if (pub !== keys.localnet) {
      errors.push(`${rel}: ${pub} (expected localnet ${keys.localnet})`);
    }
  }

  if (fs.existsSync(path.join(root, "ifx"))) {
    errors.push("stray directory ifx/ exists (remove it)");
  }

  if (errors.length) {
    console.error(
      "keys:verify FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n")
    );
    process.exit(1);
  }
  console.log(
    `keys:verify OK (localnet ${keys.localnet}, devnet ${keys.devnet}, mainnet ${keys.mainnet}, prefixes ${LOCALNET_PROGRAM_ID_PREFIX}/${DEVNET_PROGRAM_ID_PREFIX}/${MAINNET_PROGRAM_ID_PREFIX})`
  );
}

main();
