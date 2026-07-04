#!/usr/bin/env sh
# Build and deploy ifx to mainnet, then restore localnet workspace state.
#
# Required:
#   ANCHOR_WALLET — fee payer (must NOT be ~/.config/solana/id.json)
#
# Optional:
#   ANCHOR_PROVIDER_URL — mainnet RPC (defaults to api.mainnet-beta.solana.com)
#   IFX_SKIP_BALANCE_CHECK=1 — skip getBalance pre-check (if RPC blocks it, e.g. Tatum free tier)
#   IFX_PROXY — enable local proxy; mainnet does NOT default to 127.0.0.1:7890 (unlike devnet)
#   IFX_NO_PROXY=1 — force proxy off
#   UPGRADE_AUTHORITY — keypair for program extend (default: keys/mainnet-program-keypair.json)
#   IFX_PROGRAM_EXTEND_HEADROOM — extra bytes on extend (default: 65536)
#   IFX_PROGRAM_BUFFER — reuse an existing upload buffer (anchor program deploy --buffer)
#   IFX_BUFFER_WRITE=1 — write/resume target/deploy/ifx.so into that buffer before deploy
#   IFX_SKIP_VERIFIABLE=1 — use anchor build --no-idl instead of solana-verify (non-verified)
#   IFX_SKIP_BUILD=1 — skip keys sync + build (deploy-from-buffer only; requires IFX_PROGRAM_BUFFER)
#   IFX_SOLANA_USE_RPC=1 — default; write-buffer / deploy use --use-rpc (proxy-safe). Set 0 for TPU upload.
# Usage:
#   ANCHOR_PROVIDER_URL=https://your-mainnet-rpc ANCHOR_WALLET=~/.keys/ifx-mainnet-deploy.json sh scripts/deploy-mainnet.sh
#   IFX_PROGRAM_BUFFER=1RDK... IFX_SKIP_BUILD=1 IFX_SKIP_BALANCE_CHECK=1 ... sh scripts/deploy-mainnet.sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
. "$ROOT/scripts/mainnet-env.sh"
. "$ROOT/scripts/deploy-common.sh"

MAINNET_KEYPAIR="$ROOT/keys/mainnet-program-keypair.json"
MAINNET_PROGRAM_ID_FILE="$ROOT/keys/mainnet.program-id"
PROGRAM_SO="$ROOT/target/deploy/ifx.so"

check_mainnet_keypair() {
  if [ ! -f "$MAINNET_KEYPAIR" ]; then
    echo "missing $MAINNET_KEYPAIR" >&2
    echo "Mainnet keypair is gitignored. Place the upgrade authority key there." >&2
    if [ -f "$MAINNET_PROGRAM_ID_FILE" ]; then
      echo "Pubkey must match keys/mainnet.program-id ($(tr -d '[:space:]' < "$MAINNET_PROGRAM_ID_FILE"))" >&2
    fi
    exit 1
  fi

  if [ ! -f "$MAINNET_PROGRAM_ID_FILE" ]; then
    echo "missing $MAINNET_PROGRAM_ID_FILE" >&2
    exit 1
  fi

  load_mainnet_program_id
  MAINNET_KEY_PUB="$(solana-keygen pubkey "$MAINNET_KEYPAIR")"

  if [ "$MAINNET_KEY_PUB" != "$MAINNET_ID" ]; then
    echo "mainnet program keypair mismatch:" >&2
    echo "  keypair: $MAINNET_KEY_PUB" >&2
    echo "  keys/mainnet.program-id: $MAINNET_ID" >&2
    exit 1
  fi
}

restore_localnet() {
  echo "restore localnet (keys:sync + anchor keys sync)…"
  sh scripts/restore-program-keys.sh
}

PROGRAM_DATA_HEADER=45
IFX_PROGRAM_EXTEND_HEADROOM="${IFX_PROGRAM_EXTEND_HEADROOM:-65536}"

ensure_program_data_capacity() {
  PROGRAM_BYTES=$(wc -c < "$PROGRAM_SO" | tr -d ' ')
  REQUIRED_LEN=$((PROGRAM_BYTES + PROGRAM_DATA_HEADER + IFX_PROGRAM_EXTEND_HEADROOM))

  SHOW_FILE="$(mktemp "${TMPDIR:-/tmp}/ifx-program-show.XXXXXX")"
  if ! solana program show "$MAINNET_ID" --url "$RPC_URL" >"$SHOW_FILE" 2>&1; then
    rm -f "$SHOW_FILE"
    echo "program not on mainnet yet (fresh deploy will size ProgramData)"
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

  UPGRADE_AUTH="${UPGRADE_AUTHORITY:-$MAINNET_KEYPAIR}"
  run_program_data_extend "$MAINNET_ID" "$UPGRADE_AUTH" "$CURRENT_LEN" "$REQUIRED_LEN"
}

deploy_mainnet_program() {
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
        --provider.cluster mainnet \
        --provider.wallet "$DEPLOY_WALLET" \
        --program-keypair "$MAINNET_KEYPAIR" \
        --program-id "$MAINNET_ID" \
        --buffer "$IFX_PROGRAM_BUFFER" \
        --no-idl \
        -- --use-rpc
    else
      anchor program deploy \
        --provider.cluster mainnet \
        --provider.wallet "$DEPLOY_WALLET" \
        --program-keypair "$MAINNET_KEYPAIR" \
        --program-id "$MAINNET_ID" \
        --buffer "$IFX_PROGRAM_BUFFER" \
        --no-idl
    fi
    return 0
  fi

  if ifx_solana_use_rpc_enabled; then
    anchor program deploy \
      --provider.cluster mainnet \
      --provider.wallet "$DEPLOY_WALLET" \
      --program-keypair "$MAINNET_KEYPAIR" \
      --program-id "$MAINNET_ID" \
      --no-idl \
      "$PROGRAM_SO" \
      -- --use-rpc
  else
    anchor program deploy \
      --provider.cluster mainnet \
      --provider.wallet "$DEPLOY_WALLET" \
      --program-keypair "$MAINNET_KEYPAIR" \
      --program-id "$MAINNET_ID" \
      --no-idl \
      "$PROGRAM_SO"
  fi
}

apply_mainnet_proxy
require_deploy_wallet
check_mainnet_keypair
check_mainnet_rpc

trap restore_localnet EXIT

if [ "${IFX_SKIP_BUILD:-}" = 1 ]; then
  if [ -z "${IFX_PROGRAM_BUFFER:-}" ]; then
    echo "IFX_SKIP_BUILD=1 requires IFX_PROGRAM_BUFFER" >&2
    exit 1
  fi
  load_mainnet_program_id
  echo "build: skipped (IFX_SKIP_BUILD=1)"
else
  IFX_CLUSTER=mainnet sh scripts/sync-program-keys.sh
  if [ "${IFX_SKIP_VERIFIABLE:-}" = 1 ]; then
    anchor keys sync --provider.cluster mainnet
    echo "build: anchor build --no-idl (IFX_SKIP_VERIFIABLE=1)"
    anchor build --no-idl
  else
    IFX_CLUSTER=mainnet sh scripts/build-verifiable.sh
  fi
  npm run security-txt:check
  ensure_program_data_capacity
fi

check_deploy_wallet_balance "Fund the deploy wallet (not the program address) on mainnet, then retry."
deploy_mainnet_program

echo "deploy:mainnet OK ($MAINNET_ID)"
