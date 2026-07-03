#!/usr/bin/env sh
# Build and deploy ifx to devnet, then restore localnet workspace state.
#
# Required:
#   ANCHOR_WALLET   — fee payer (must NOT be ~/.config/solana/id.json)
#
# Optional:
#   ANCHOR_PROVIDER_URL — devnet RPC (defaults to api.devnet.solana.com)
#   IFX_SKIP_BALANCE_CHECK=1 — skip getBalance pre-check
#   IFX_PROXY — default http://127.0.0.1:7890; IFX_NO_PROXY=1 to disable
#   UPGRADE_AUTHORITY — keypair that can extend/upgrade (default: ANCHOR_WALLET)
#   IFX_PROGRAM_EXTEND_HEADROOM — extra bytes on extend (default: 65536)
#   IFX_PROGRAM_BUFFER — reuse an existing upload buffer (anchor program deploy --buffer)
#   IFX_BUFFER_WRITE=1 — write/resume target/deploy/ifx.so into that buffer before deploy
#   IFX_SKIP_BUILD=1 — skip keys sync + build (deploy-from-buffer only; requires IFX_PROGRAM_BUFFER)
#   IFX_SOLANA_USE_RPC=1 — default; write-buffer / deploy use --use-rpc (proxy-safe). Set 0 for TPU upload.
#
# Usage:
#   ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json sh scripts/deploy-devnet.sh
#   ANCHOR_PROVIDER_URL=https://... ANCHOR_WALLET=~/.keys/... sh scripts/deploy-devnet.sh
#   IFX_PROGRAM_BUFFER=2a3nc... IFX_SKIP_BUILD=1 ANCHOR_WALLET=~/.keys/... sh scripts/deploy-devnet.sh
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

deploy_devnet_program() {
  if [ -n "${IFX_PROGRAM_BUFFER:-}" ]; then
    echo "deploy: reusing upload buffer $IFX_PROGRAM_BUFFER"
    if [ "${IFX_BUFFER_WRITE:-}" = 1 ]; then
      if [ ! -f "$PROGRAM_SO" ]; then
        echo "missing $PROGRAM_SO — build first or unset IFX_BUFFER_WRITE" >&2
        exit 1
      fi
      write_program_buffer
    fi
    # Deploy from on-chain buffer only — do not pass local .so (avoids re-upload / ELF mismatch).
    if ifx_solana_use_rpc_enabled; then
      anchor program deploy \
        --provider.cluster devnet \
        --provider.wallet "$DEPLOY_WALLET" \
        --program-keypair "$DEVNET_KEYPAIR" \
        --program-id "$DEVNET_ID" \
        --buffer "$IFX_PROGRAM_BUFFER" \
        --no-idl \
        -- --use-rpc
    else
      anchor program deploy \
        --provider.cluster devnet \
        --provider.wallet "$DEPLOY_WALLET" \
        --program-keypair "$DEVNET_KEYPAIR" \
        --program-id "$DEVNET_ID" \
        --buffer "$IFX_PROGRAM_BUFFER" \
        --no-idl
    fi
    return 0
  fi

  if ifx_solana_use_rpc_enabled; then
    anchor program deploy \
      --provider.cluster devnet \
      --provider.wallet "$DEPLOY_WALLET" \
      --program-keypair "$DEVNET_KEYPAIR" \
      --program-id "$DEVNET_ID" \
      --no-idl \
      "$PROGRAM_SO" \
      -- --use-rpc
  else
    anchor program deploy \
      --provider.cluster devnet \
      --provider.wallet "$DEPLOY_WALLET" \
      --program-keypair "$DEVNET_KEYPAIR" \
      --program-id "$DEVNET_ID" \
      --no-idl \
      "$PROGRAM_SO"
  fi
}

apply_devnet_proxy
require_deploy_wallet
check_devnet_keypair
check_devnet_rpc

trap restore_localnet EXIT

if [ "${IFX_SKIP_BUILD:-}" = 1 ]; then
  if [ -z "${IFX_PROGRAM_BUFFER:-}" ]; then
    echo "IFX_SKIP_BUILD=1 requires IFX_PROGRAM_BUFFER" >&2
    exit 1
  fi
  load_devnet_program_id
  echo "build: skipped (IFX_SKIP_BUILD=1)"
else
  IFX_CLUSTER=devnet sh scripts/sync-program-keys.sh
  anchor keys sync --provider.cluster devnet
  anchor build --no-idl
  ensure_program_data_capacity
fi

check_deploy_wallet_balance "Devnet faucet (repeat if rate-limited): solana airdrop 2 $(solana-keygen pubkey "$DEPLOY_WALLET") --url devnet"
deploy_devnet_program

echo "deploy:devnet OK ($DEVNET_ID)"
