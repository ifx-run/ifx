# Shared mainnet helpers for deploy scripts.
# shellcheck shell=sh

DEFAULT_MAINNET_RPC="https://api.mainnet-beta.solana.com"
DEFAULT_SOLANA_WALLET="${HOME}/.config/solana/id.json"

apply_mainnet_proxy() {
  if [ "${IFX_NO_PROXY:-}" = 1 ]; then
    echo "proxy: disabled (IFX_NO_PROXY=1)"
    return 0
  fi
  if [ -z "${IFX_PROXY:-}" ]; then
    echo "proxy: disabled (unset IFX_PROXY; use IFX_PROXY=... only if you need a local proxy)"
    return 0
  fi

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
    echo "  ANCHOR_PROVIDER_URL=https://... ANCHOR_WALLET=~/.keys/ifx-mainnet-deploy.json sh scripts/deploy-mainnet.sh" >&2
    exit 1
  fi

  DEPLOY_WALLET="$(expand_path "$ANCHOR_WALLET")"
  case "$DEPLOY_WALLET" in
    /*) ;;
    *) DEPLOY_WALLET="${ROOT:-.}/$DEPLOY_WALLET" ;;
  esac

  if [ "$DEPLOY_WALLET" = "$DEFAULT_SOLANA_WALLET" ]; then
    echo "Refusing ~/.config/solana/id.json — use a dedicated mainnet deploy keypair." >&2
    exit 1
  fi
  if [ ! -f "$DEPLOY_WALLET" ]; then
    echo "ANCHOR_WALLET not found: $DEPLOY_WALLET" >&2
    exit 1
  fi

  export ANCHOR_WALLET="$DEPLOY_WALLET"
  echo "deploy wallet (fee payer): $DEPLOY_WALLET"
}

load_mainnet_program_id() {
  MAINNET_PROGRAM_ID_FILE="${ROOT}/keys/mainnet.program-id"
  if [ ! -f "$MAINNET_PROGRAM_ID_FILE" ]; then
    echo "missing $MAINNET_PROGRAM_ID_FILE" >&2
    exit 1
  fi
  MAINNET_ID="$(tr -d '[:space:]' < "$MAINNET_PROGRAM_ID_FILE")"
}

check_mainnet_rpc() {
  if [ -z "${ANCHOR_PROVIDER_URL:-}" ]; then
    RPC_URL="$DEFAULT_MAINNET_RPC"
    echo "warn: ANCHOR_PROVIDER_URL unset — using public mainnet RPC" >&2
  else
    RPC_URL="$ANCHOR_PROVIDER_URL"
  fi
  export ANCHOR_PROVIDER_URL="$RPC_URL"
  echo "mainnet RPC: $RPC_URL"
  if ! solana cluster-version --url "$RPC_URL" >/dev/null 2>&1; then
    echo "" >&2
    echo "Cannot reach mainnet RPC. Try:" >&2
    echo "  IFX_NO_PROXY=1 ANCHOR_PROVIDER_URL=https://your-mainnet-rpc ..." >&2
    echo "  IFX_PROXY=http://127.0.0.1:7890 ANCHOR_PROVIDER_URL=https://your-mainnet-rpc ..." >&2
    exit 1
  fi
}
