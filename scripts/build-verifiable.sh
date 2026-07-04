#!/usr/bin/env sh
# Deterministic program build via solana-verify (Docker). Output: target/deploy/ifx.so
#
# Requires: solana-verify, Docker daemon running.
#
# Required for devnet/mainnet deploy:
#   IFX_CLUSTER=devnet|mainnet  — selects declare_id! via Cargo feature (verify-from-repo)
#
# Optional:
#   IFX_SOURCE_REVISION — logged only; build.rs embeds git HEAD inside Docker
#   IFX_SOURCE_RELEASE  — logged only; build.rs reads tag / metadata/security.json
#   IFX_LIBRARY_NAME    — program lib name (default: ifx)
#
# Set IFX_SKIP_VERIFIABLE=1 in deploy scripts to fall back to anchor build --no-idl.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LIB="${IFX_LIBRARY_NAME:-ifx}"
SO="$ROOT/target/deploy/${LIB}.so"
CLUSTER="${IFX_CLUSTER:-}"

if ! command -v solana-verify >/dev/null 2>&1; then
  echo "missing solana-verify — install: cargo install solana-verify" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker must be running for verifiable builds (solana-verify uses a container)" >&2
  exit 1
fi

SBF_ARGS=""
case "$CLUSTER" in
  devnet)
    SBF_ARGS="--cargo-build-sbf-args=--features devnet"
    ;;
  mainnet)
    SBF_ARGS="--cargo-build-sbf-args=--features mainnet"
    ;;
  localnet | "")
    echo "warn: IFX_CLUSTER unset — building localnet declare_id (devnet/mainnet deploy must set IFX_CLUSTER)" >&2
    ;;
  *)
    echo "IFX_CLUSTER must be devnet or mainnet (got: $CLUSTER)" >&2
    exit 1
    ;;
esac

REVISION="$(git rev-parse HEAD)"
if git describe --tags --exact-match >/dev/null 2>&1; then
  RELEASE="$(git describe --tags --exact-match)"
else
  RELEASE="$(node -e "console.log(require('./metadata/security.json').source_release)")"
fi

echo "verifiable build: cluster=${CLUSTER:-localnet} library=${LIB} release=${RELEASE} revision=${REVISION}"

if [ -n "$SBF_ARGS" ]; then
  solana-verify build --library-name "$LIB" "$SBF_ARGS" "$ROOT"
else
  solana-verify build --library-name "$LIB" "$ROOT"
fi

if [ ! -f "$SO" ]; then
  echo "missing $SO after solana-verify build" >&2
  exit 1
fi

echo "verifiable build OK: $SO"
solana-verify get-executable-hash "$SO" || true
