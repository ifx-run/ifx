# Shared deploy helpers (balance pre-check, buffer write, RPC upload flags).
# shellcheck shell=sh
# Requires: DEPLOY_WALLET, RPC_URL, PROGRAM_SO

# BPF Loader ExtendProgram: minimum additional bytes per instruction (or extend to max).
IFX_PROGRAM_EXTEND_MIN_BYTES=10240

# Return bytes to pass to `solana program extend` (>= loader minimum).
ifx_program_extend_amount() {
  DEFICIT=$1
  MIN=${IFX_PROGRAM_EXTEND_MIN_BYTES:-10240}
  if [ "$DEFICIT" -lt "$MIN" ]; then
    echo "$MIN"
  else
    echo "$DEFICIT"
  fi
}

# Extend upgradeable ProgramData when CURRENT_LEN < REQUIRED_LEN.
run_program_data_extend() {
  PROGRAM_ID=$1
  UPGRADE_KEYPAIR=$2
  CURRENT_LEN=$3
  REQUIRED_LEN=$4

  if [ "$REQUIRED_LEN" -le "$CURRENT_LEN" ]; then
    echo "ProgramData OK: ${CURRENT_LEN} bytes (binary + headroom need ${REQUIRED_LEN})"
    return 0
  fi

  DEFICIT=$((REQUIRED_LEN - CURRENT_LEN))
  ADDITIONAL=$(ifx_program_extend_amount "$DEFICIT")
  echo "ProgramData too small: ${CURRENT_LEN} < ${REQUIRED_LEN}; extending by ${ADDITIONAL} bytes (deficit ${DEFICIT})…"
  solana program extend "$PROGRAM_ID" "$ADDITIONAL" \
    --url "$RPC_URL" \
    --keypair "$UPGRADE_KEYPAIR"
}

# BSD awk (macOS) does not accept `1e9`; use integer divisor.
format_sol_from_lamports() {
  awk "BEGIN {printf \"%.3f\", $1/1000000000}"
}

# Default on: upload via JSON-RPC (works through HTTP proxy). TPU pubsub often times out behind 127.0.0.1:7890.
ifx_solana_use_rpc_enabled() {
  [ "${IFX_SOLANA_USE_RPC:-1}" != 0 ]
}

write_program_buffer() {
  if ifx_solana_use_rpc_enabled; then
    echo "write-buffer (--use-rpc) → $IFX_PROGRAM_BUFFER"
    solana program write-buffer "$PROGRAM_SO" \
      --buffer "$IFX_PROGRAM_BUFFER" \
      --url "$RPC_URL" \
      --keypair "$DEPLOY_WALLET" \
      --use-rpc
  else
    echo "write-buffer → $IFX_PROGRAM_BUFFER"
    solana program write-buffer "$PROGRAM_SO" \
      --buffer "$IFX_PROGRAM_BUFFER" \
      --url "$RPC_URL" \
      --keypair "$DEPLOY_WALLET"
  fi
}

# Before deploy --buffer: dump on-chain ELF and compare executable hash to local .so.
# Size-only checks miss corrupt buffers (upload interrupted but account already full).
verify_buffer_matches_program() {
  BUFFER=$1
  if [ ! -f "$PROGRAM_SO" ]; then
    echo "warn: skip buffer hash check — missing $PROGRAM_SO" >&2
    return 0
  fi
  if ! command -v solana-verify >/dev/null 2>&1; then
    echo "warn: skip buffer hash check — missing solana-verify" >&2
    return 0
  fi

  LOCAL_HASH=$(solana-verify get-executable-hash "$PROGRAM_SO" | tr -d '[:space:]')
  TMP_SO="$(mktemp "${TMPDIR:-/tmp}/ifx-buffer-dump.XXXXXX.so")"
  if ! solana program dump "$BUFFER" "$TMP_SO" --url "$RPC_URL" >/dev/null 2>&1; then
    rm -f "$TMP_SO"
    echo "buffer dump failed: $BUFFER" >&2
    exit 1
  fi
  BUFFER_HASH=$(solana-verify get-executable-hash "$TMP_SO" | tr -d '[:space:]')
  rm -f "$TMP_SO"

  if [ "$LOCAL_HASH" != "$BUFFER_HASH" ]; then
    echo "buffer ELF does not match local program (upload corrupt or stale buffer):" >&2
    echo "  local:  $LOCAL_HASH ($PROGRAM_SO)" >&2
    echo "  buffer: $BUFFER_HASH ($BUFFER)" >&2
    echo "" >&2
    echo "Close the buffer and upload again, or re-upload with IFX_BUFFER_WRITE=1 to a new buffer." >&2
    exit 1
  fi
  echo "buffer ELF OK: matches $PROGRAM_SO"
}

check_deploy_wallet_balance() {
  FUND_HINT="${1:-Fund the deploy wallet (not the program address), then retry.}"

  if [ "${IFX_SKIP_BALANCE_CHECK:-}" = 1 ]; then
    echo "balance check: skipped (IFX_SKIP_BALANCE_CHECK=1)"
    return 0
  fi

  PROGRAM_BYTES=$(wc -c < "$PROGRAM_SO" | tr -d ' ')
  BALANCE_FILE="$(mktemp "${TMPDIR:-/tmp}/ifx-balance.XXXXXX")"
  if ! solana balance "$DEPLOY_WALLET" --lamports --url "$RPC_URL" >"$BALANCE_FILE" 2>&1; then
    echo "deploy wallet balance check failed (RPC may not support getBalance on your plan):" >&2
    sed 's/^/  /' "$BALANCE_FILE" >&2
    rm -f "$BALANCE_FILE"
    echo "" >&2
    echo "Verify balance manually (Solscan / another RPC), then either:" >&2
    echo "  - use an RPC that supports getBalance, or" >&2
    echo "  - IFX_SKIP_BALANCE_CHECK=1 ... npm run deploy:mainnet" >&2
    exit 1
  fi
  BALANCE=$(tr -dc '0-9' < "$BALANCE_FILE")
  rm -f "$BALANCE_FILE"
  if [ -z "$BALANCE" ]; then
    echo "deploy wallet balance check returned empty — RPC may not support getBalance." >&2
    echo "Set IFX_SKIP_BALANCE_CHECK=1 after verifying balance manually." >&2
    exit 1
  fi

  BUFFER_RENT=$(solana rent "$PROGRAM_BYTES" --lamports --url "$RPC_URL" 2>/dev/null | tr -dc '0-9')
  if [ -z "$BUFFER_RENT" ]; then
    BUFFER_RENT=$((PROGRAM_BYTES * 7000))
  fi
  MIN=$((BUFFER_RENT + 100000000))
  if [ "$BALANCE" -lt "$MIN" ]; then
    SHORT=$((MIN - BALANCE))
    echo "deploy wallet balance too low for program deploy/upgrade:" >&2
    echo "  wallet:  ${BALANCE} lamports ($(format_sol_from_lamports "$BALANCE") SOL)" >&2
    echo "  need:    ~${MIN} lamports (~$(format_sol_from_lamports "$MIN") SOL incl. buffer rent)" >&2
    echo "  short:   ~${SHORT} lamports (~$(format_sol_from_lamports "$SHORT") SOL)" >&2
    echo "" >&2
    echo "$FUND_HINT" >&2
    exit 1
  fi
  echo "deploy wallet balance OK: $(format_sol_from_lamports "$BALANCE") SOL"
}
