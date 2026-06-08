#!/usr/bin/env node
import fs from "fs";
import { PATHS, readKeypairPubkey } from "./program-ids.mjs";

const id = readKeypairPubkey(PATHS.devnetKeypair);
fs.writeFileSync(PATHS.devnetProgramId, `${id}\n`);
console.log(`wrote ${PATHS.devnetProgramId}: ${id}`);
