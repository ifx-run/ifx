#!/usr/bin/env node
/**
 * Grind a program keypair whose base58 pubkey starts with `prefix` (case-insensitive).
 *
 * Usage: node scripts/grind-program-keypair.mjs <prefix> <out.json> [--exact]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Keypair } from "@solana/web3.js";

const [, , prefixArg, outArg] = process.argv;
if (!prefixArg || !outArg) {
  console.error("usage: grind-program-keypair.mjs <prefix> <out.json>");
  process.exit(1);
}

const prefix = prefixArg;
const exact = process.argv.includes("--exact");
const maxAttempts = Number(process.env.IFX_VANITY_MAX_ATTEMPTS ?? "20000000");
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", outArg);

function matches(pubkey) {
  const addr = pubkey.toBase58();
  return exact
    ? addr.startsWith(prefix)
    : addr.toLowerCase().startsWith(prefix.toLowerCase());
}

const started = Date.now();
for (let i = 1; i <= maxAttempts; i++) {
  const kp = Keypair.generate();
  if (matches(kp.publicKey)) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(Array.from(kp.secretKey)));
    fs.chmodSync(out, 0o600);
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`found ${kp.publicKey.toBase58()} in ${i} attempts (${elapsed}s)`);
    console.log(`wrote ${out}`);
    process.exit(0);
  }
  if (i % 500_000 === 0) {
    console.log(`… ${i} attempts (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  }
}

console.error(`no match for prefix "${prefix}" in ${maxAttempts} attempts`);
process.exit(1);
