#!/usr/bin/env sh
# Restore localnet keypair + declare_id! after devnet deploy (or on failure).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

IFX_CLUSTER=localnet sh scripts/sync-program-keys.sh
anchor keys sync --provider.cluster localnet
echo "keys:restore OK — localnet keypair + declare_id! restored"
