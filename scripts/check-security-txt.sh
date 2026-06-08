#!/usr/bin/env sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SO="${1:-$ROOT/target/deploy/ifx.so}"

if ! command -v query-security-txt >/dev/null 2>&1; then
  echo "skip: install query-security-txt (cargo install query-security-txt)" >&2
  exit 0
fi

if [ ! -f "$SO" ]; then
  echo "missing $SO — run: CARGO_TARGET_DIR=\$PWD/target cargo build-sbf" >&2
  exit 1
fi

echo "query-security-txt $SO"
query-security-txt "$SO"
