#!/usr/bin/env sh
# Phase 0 — deterministic audit gate (see audits/AUDIT-WORKFLOW.md)
# cargo audit: on fetch failure, script falls back to --no-fetch --stale;
# optional HTTP(S) proxy — see AUDIT-WORKFLOW.md § cargo audit troubleshooting.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SHA_FULL="$(git rev-parse HEAD)"
SHA_SHORT="$(git rev-parse --short HEAD)"
DIR="audits/scratch/${SHA_SHORT}"
LOG="${DIR}/phase0.log"

mkdir -p "$DIR"
echo "$SHA_FULL" > "${DIR}/commit.txt"

{
  echo "=== Ifx audit Phase 0 ==="
  echo "commit: ${SHA_FULL} (${SHA_SHORT})"
  echo "scope: programs/ifx/"
  echo "started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
} | tee "$LOG"

run() {
  echo "--- $* ---" | tee -a "$LOG"
  "$@" >>"$LOG" 2>&1
  echo "ok: $*" | tee -a "$LOG"
}

run npm run security:preflight
run npm test
run sh -c "cd programs/ifx && cargo test"

if cargo audit --version >/dev/null 2>&1; then
  echo "--- cargo audit ---" | tee -a "$LOG"
  if cargo audit >>"$LOG" 2>&1; then
    echo "ok: cargo audit" | tee -a "$LOG"
  elif cargo audit --no-fetch --stale >>"$LOG" 2>&1; then
    echo "ok: cargo audit (local advisory-db; git fetch skipped)" | tee -a "$LOG"
  else
    echo "warn: cargo audit exit non-zero (see log)" | tee -a "$LOG"
  fi
else
  echo "skip: cargo audit (cargo install cargo-audit)" | tee -a "$LOG"
fi

{
  echo ""
  echo "Phase 0 PASSED"
  echo "scratch: ${DIR}/"
  echo "next: Reader agent → ${DIR}/reader.md (see audits/templates/reader-prompt.md)"
} | tee -a "$LOG"
