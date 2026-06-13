#!/usr/bin/env sh
# Build and deploy ifx to devnet, then restore localnet workspace state.
#
# Required:
#   ANCHOR_WALLET   — fee payer (must NOT be ~/.config/solana/id.json)
#
# Optional:
#   IFX_PROXY — default http://127.0.0.1:7890; IFX_NO_PROXY=1 to disable
#   UPGRADE_AUTHORITY — keypair that can extend/upgrade (default: ANCHOR_WALLET)
#   IFX_PROGRAM_EXTEND_HEADROOM — extra bytes on extend (default: 65536)
#
# Usage:
#   ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json sh scripts/deploy-devnet.sh
#   ANCHOR_PROVIDER_URL=https://... ANCHOR_WALLET=~/.keys/... sh scripts/deploy-devnet.sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
. "$ROOT/scripts/devnet-env.sh"
. "$ROOT/scripts/deploy-common.sh"

DEVNET_KEYPAIR="$ROOT/keys/devnet-program-keypair.json"
DEVNET_PROGRAM_ID_FILE="$ROOT/keys/devnet.program-id"
PROGRAM_SO="$ROOT/target/deploy/ifx.so"

check_devnet_keypair() {
  if [ ! -f "$DEVNET_KEYPAIR" ]; then
    echo "missing $DEVNET_KEYPAIR" >&2
    echo "Devnet keypair is gitignored. Place the upgrade authority key there." >&2
    if [ -f "$DEVNET_PROGRAM_ID_FILE" ]; then
      echo "Pubkey must match keys/devnet.program-id ($(tr -d '[:space:]' < "$DEVNET_PROGRAM_ID_FILE"))" >&2
    fi
    exit 1
  fi

  if [ ! -f "$DEVNET_PROGRAM_ID_FILE" ]; then
    echo "missing $DEVNET_PROGRAM_ID_FILE" >&2
    exit 1
  fi

  load_devnet_program_id
  DEVNET_KEY_PUB="$(solana-keygen pubkey "$DEVNET_KEYPAIR")"

  if [ "$DEVNET_KEY_PUB" != "$DEVNET_ID" ]; then
    echo "devnet program keypair mismatch:" >&2
    echo "  keypair: $DEVNET_KEY_PUB" >&2
    echo "  keys/devnet.program-id: $DEVNET_ID" >&2
    exit 1
  fi
}

restore_localnet() {
  echo "restore localnet (keys:sync + anchor keys sync)…"
  sh scripts/restore-program-keys.sh
}

# Upgradeable ProgramData header (type + slot + upgrade authority option + pubkey).
PROGRAM_DATA_HEADER=45
# Extra bytes reserved on extend so minor binary growth does not require another extend.
IFX_PROGRAM_EXTEND_HEADROOM="${IFX_PROGRAM_EXTEND_HEADROOM:-65536}"

ensure_program_data_capacity() {
  PROGRAM_BYTES=$(wc -c < "$PROGRAM_SO" | tr -d ' ')
  REQUIRED_LEN=$((PROGRAM_BYTES + PROGRAM_DATA_HEADER + IFX_PROGRAM_EXTEND_HEADROOM))

  SHOW_FILE="$(mktemp "${TMPDIR:-/tmp}/ifx-program-show.XXXXXX")"
  if ! solana program show "$DEVNET_ID" --url "$RPC_URL" >"$SHOW_FILE" 2>&1; then
    rm -f "$SHOW_FILE"
    echo "program not on devnet yet (fresh deploy will size ProgramData)"
    return 0
  fi

  CURRENT_LEN=$(grep '^Data Length:' "$SHOW_FILE" | sed -n 's/^Data Length: \([0-9]*\).*/\1/p' | head -1)
  rm -f "$SHOW_FILE"

  if [ -z "$CURRENT_LEN" ]; then
    echo "warn: could not parse ProgramData length; skipping extend pre-check" >&2
    return 0
  fi

  if [ "$REQUIRED_LEN" -le "$CURRENT_LEN" ]; then
    echo "ProgramData OK: ${CURRENT_LEN} bytes (binary + headroom need ${REQUIRED_LEN})"
    return 0
  fi

  ADDITIONAL=$((REQUIRED_LEN - CURRENT_LEN))
  UPGRADE_AUTH="${UPGRADE_AUTHORITY:-$DEPLOY_WALLET}"
  echo "ProgramData too small: ${CURRENT_LEN} < ${REQUIRED_LEN}; extending by ${ADDITIONAL} bytes…"
  # `solana program extend` signs with --keypair (must be on-chain upgrade authority).
  solana program extend "$DEVNET_ID" "$ADDITIONAL" \
    --url "$RPC_URL" \
    --keypair "$UPGRADE_AUTH"
}

apply_devnet_proxy
require_deploy_wallet
check_devnet_keypair
check_devnet_rpc

trap restore_localnet EXIT

IFX_CLUSTER=devnet sh scripts/sync-program-keys.sh
anchor keys sync --provider.cluster devnet
anchor build --no-idl
ensure_program_data_capacity
check_deploy_wallet_balance "Devnet faucet (repeat if rate-limited): solana airdrop 2 $(solana-keygen pubkey "$DEPLOY_WALLET") --url devnet"
anchor program deploy \
  --provider.cluster devnet \
  --provider.wallet "$DEPLOY_WALLET" \
  --program-keypair "$DEVNET_KEYPAIR" \
  --program-id "$DEVNET_ID" \
  --no-idl \
  "$PROGRAM_SO"

echo "deploy:devnet OK ($DEVNET_ID)"
