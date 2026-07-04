#!/usr/bin/env sh
# Submit on-chain verification PDA via solana-verify (post-deploy).
#
# Usage:
#   sh scripts/verify-from-repo.sh devnet
#   sh scripts/verify-from-repo.sh mainnet
#   ANCHOR_PROVIDER_URL=https://... sh scripts/verify-from-repo.sh mainnet
#
# Optional:
#   IFX_VERIFY_REPO       — default https://github.com/ifx-run/ifx
#   IFX_SOURCE_REVISION   — default git HEAD (must match deployed build)
#   IFX_VERIFY_KEYPAIR    — uploader / upgrade authority (cluster-specific default)
#   IFX_VERIFY_SKIP_PROMPT=1 — pass -y to solana-verify
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CLUSTER="${1:-}"
if [ -z "$CLUSTER" ]; then
  echo "usage: sh scripts/verify-from-repo.sh <devnet|mainnet>" >&2
  exit 1
fi

REPO="${IFX_VERIFY_REPO:-https://github.com/ifx-run/ifx}"
COMMIT="${IFX_SOURCE_REVISION:-$(git rev-parse HEAD)}"

case "$CLUSTER" in
  devnet)
    PROGRAM_ID="$(tr -d '[:space:]' < "$ROOT/keys/devnet.program-id")"
    SOLANA_CLUSTER="devnet"
    DEFAULT_KEY="$ROOT/keys/devnet-program-keypair.json"
    ;;
  mainnet)
    PROGRAM_ID="$(tr -d '[:space:]' < "$ROOT/keys/mainnet.program-id")"
    SOLANA_CLUSTER="mainnet-beta"
    DEFAULT_KEY="$ROOT/keys/mainnet-program-keypair.json"
    ;;
  *)
    echo "cluster must be devnet or mainnet (got: $CLUSTER)" >&2
    exit 1
    ;;
esac

KEYPAIR="${IFX_VERIFY_KEYPAIR:-$DEFAULT_KEY}"

if ! command -v solana-verify >/dev/null 2>&1; then
  echo "missing solana-verify — install: cargo install solana-verify" >&2
  exit 1
fi

echo "verify-from-repo: cluster=$CLUSTER program=$PROGRAM_ID commit=$COMMIT"

FEATURE_ARG=""
case "$CLUSTER" in
  devnet) FEATURE_ARG="--features devnet" ;;
  mainnet) FEATURE_ARG="--features mainnet" ;;
esac

PROMPT_FLAG=""
if [ "${IFX_VERIFY_SKIP_PROMPT:-}" = 1 ]; then
  PROMPT_FLAG="-y"
fi

if [ -n "${ANCHOR_PROVIDER_URL:-}" ]; then
  solana-verify verify-from-repo \
    -u "$SOLANA_CLUSTER" \
    --url "$ANCHOR_PROVIDER_URL" \
    --program-id "$PROGRAM_ID" \
    --commit-hash "$COMMIT" \
    --library-name ifx \
    --mount-path . \
    --keypair "$KEYPAIR" \
    $PROMPT_FLAG \
    "$REPO" \
    -- $FEATURE_ARG
else
  solana-verify verify-from-repo \
    -u "$SOLANA_CLUSTER" \
    --program-id "$PROGRAM_ID" \
    --commit-hash "$COMMIT" \
    --library-name ifx \
    --mount-path . \
    --keypair "$KEYPAIR" \
    $PROMPT_FLAG \
    "$REPO" \
    -- $FEATURE_ARG
fi

echo "verify-from-repo: submitted for $PROGRAM_ID"
echo "Mainnet: after PDA upload, run: solana-verify remote submit-job --program-id $PROGRAM_ID --uploader \$(solana-keygen pubkey $KEYPAIR)"
