# Shared devnet helpers for deploy scripts.
# shellcheck shell=sh

DEFAULT_DEVNET_RPC="https://api.devnet.solana.com"
DEFAULT_SOLANA_WALLET="${HOME}/.config/solana/id.json"

apply_devnet_proxy() {
  if [ "${IFX_NO_PROXY:-}" = 1 ]; then
    echo "proxy: disabled (IFX_NO_PROXY=1)"
    return 0
  fi

  IFX_PROXY="${IFX_PROXY:-http://127.0.0.1:7890}"
  export https_proxy="$IFX_PROXY"
  export http_proxy="$IFX_PROXY"
  export HTTPS_PROXY="$IFX_PROXY"
  export HTTP_PROXY="$IFX_PROXY"
  export all_proxy="${all_proxy:-$IFX_PROXY}"
  export ALL_PROXY="${ALL_PROXY:-$IFX_PROXY}"
  echo "proxy: $IFX_PROXY"
}

expand_path() {
  case "$1" in
    ~/*) printf '%s/%s\n' "$HOME" "${1#~/}" ;;
    ~) printf '%s\n' "$HOME" ;;
    *) printf '%s\n' "$1" ;;
  esac
}

require_deploy_wallet() {
  if [ -z "${ANCHOR_WALLET:-}" ]; then
    echo "ANCHOR_WALLET is required — path to a dedicated deploy keypair." >&2
    echo "" >&2
    echo "Example:" >&2
    echo "  ANCHOR_WALLET=~/.keys/ifx-devnet-deploy.json sh scripts/deploy-devnet.sh" >&2
    exit 1
  fi

  DEPLOY_WALLET="$(expand_path "$ANCHOR_WALLET")"
  case "$DEPLOY_WALLET" in
    /*) ;;
    *) DEPLOY_WALLET="${ROOT:-.}/$DEPLOY_WALLET" ;;
  esac

  if [ "$DEPLOY_WALLET" = "$DEFAULT_SOLANA_WALLET" ]; then
    echo "Refusing ~/.config/solana/id.json — use a dedicated devnet deploy keypair." >&2
    exit 1
  fi
  if [ ! -f "$DEPLOY_WALLET" ]; then
    echo "ANCHOR_WALLET not found: $DEPLOY_WALLET" >&2
    exit 1
  fi

  export ANCHOR_WALLET="$DEPLOY_WALLET"
  echo "deploy wallet (fee payer): $DEPLOY_WALLET"
}

load_devnet_program_id() {
  DEVNET_PROGRAM_ID_FILE="${ROOT}/keys/devnet.program-id"
  if [ ! -f "$DEVNET_PROGRAM_ID_FILE" ]; then
    echo "missing $DEVNET_PROGRAM_ID_FILE" >&2
    exit 1
  fi
  DEVNET_ID="$(tr -d '[:space:]' < "$DEVNET_PROGRAM_ID_FILE")"
}

check_devnet_rpc() {
  RPC_URL="${ANCHOR_PROVIDER_URL:-$DEFAULT_DEVNET_RPC}"
  export ANCHOR_PROVIDER_URL="$RPC_URL"
  echo "devnet RPC: $RPC_URL"
  if ! solana cluster-version --url "$RPC_URL" >/dev/null 2>&1; then
    echo "" >&2
    echo "Cannot reach devnet RPC. Try:" >&2
    echo "  IFX_PROXY=http://127.0.0.1:7890 ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ..." >&2
    echo "  ANCHOR_PROVIDER_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY ..." >&2
    exit 1
  fi
}
