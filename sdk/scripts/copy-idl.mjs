import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "dist", "idl");
mkdirSync(outDir, { recursive: true });
copyFileSync(join(root, "src", "idl", "ifx.json"), join(outDir, "ifx.json"));
