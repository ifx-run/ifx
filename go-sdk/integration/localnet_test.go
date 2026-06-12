// Localnet integration: requires Surfpool/test-validator on ANCHOR_PROVIDER_URL (default :8899).
package integration

import (
	"context"
	"crypto/rand"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/scratch"
)

func localRPCURL() string {
	if u := os.Getenv("ANCHOR_PROVIDER_URL"); u != "" {
		return u
	}
	return "http://127.0.0.1:8899"
}

func localSolscanTxURL(sig solana.Signature, rpcURL string) string {
	custom := url.QueryEscape(rpcURL)
	return fmt.Sprintf("https://solscan.io/tx/%s?cluster=custom&customUrl=%s", sig, custom)
}

func logLocalTx(t *testing.T, label string, sig solana.Signature, wireBytes int) {
	t.Helper()
	if os.Getenv("IFX_LOG_TX") == "0" {
		return
	}
	t.Logf("\n[local tx] %s · legacy %d B\n%s\n", label, wireBytes, localSolscanTxURL(sig, localRPCURL()))
}

func localRPC(t *testing.T) *rpc.Client {
	t.Helper()
	rpcURL := localRPCURL()
	client := rpc.New(rpcURL)
	if _, err := client.GetHealth(context.Background()); err != nil {
		t.Skipf("localnet unavailable at %s: %v", rpcURL, err)
	}
	t.Logf("[local explorer] RPC: %s", rpcURL)
	t.Logf("Solscan: use the [local tx] links below (cluster=custom, customUrl=%s)", rpcURL)
	return client
}

func anchorWalletPath(t *testing.T) string {
	t.Helper()
	path := os.Getenv("ANCHOR_WALLET")
	if path == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			t.Fatal(err)
		}
		path = filepath.Join(home, ".config", "solana", "id.json")
	}
	return os.ExpandEnv(path)
}

func loadWallet(t *testing.T) *solana.Wallet {
	t.Helper()
	path := anchorWalletPath(t)
	pk, err := solana.PrivateKeyFromSolanaKeygenFile(path)
	if err != nil {
		t.Fatalf("load wallet %s: %v", path, err)
	}
	return &solana.Wallet{PrivateKey: pk}
}

func waitConfirmed(ctx context.Context, client *rpc.Client, sig solana.Signature) error {
	deadline := time.Now().Add(2 * time.Minute)
	for time.Now().Before(deadline) {
		out, err := client.GetSignatureStatuses(ctx, true, sig)
		if err != nil {
			return err
		}
		if out != nil && len(out.Value) > 0 && out.Value[0] != nil {
			st := out.Value[0]
			if st.Err != nil {
				return fmt.Errorf("tx %s failed: %v", sig, st.Err)
			}
			if st.ConfirmationStatus == rpc.ConfirmationStatusConfirmed ||
				st.ConfirmationStatus == rpc.ConfirmationStatusFinalized {
				return nil
			}
		}
		time.Sleep(400 * time.Millisecond)
	}
	return fmt.Errorf("timeout waiting for %s", sig)
}

func sendTx(
	ctx context.Context,
	t *testing.T,
	client *rpc.Client,
	wallet *solana.Wallet,
	label string,
	ixs ...solana.Instruction,
) (solana.Signature, error) {
	return sendTxSigners(ctx, t, client, wallet, label, []*solana.Wallet{wallet}, ixs...)
}

func sendTxSigners(
	ctx context.Context,
	t *testing.T,
	client *rpc.Client,
	feePayer *solana.Wallet,
	label string,
	signers []*solana.Wallet,
	ixs ...solana.Instruction,
) (solana.Signature, error) {
	recent, err := client.GetLatestBlockhash(ctx, rpc.CommitmentFinalized)
	if err != nil {
		return solana.Signature{}, err
	}
	tx, err := solana.NewTransaction(
		ixs,
		recent.Value.Blockhash,
		solana.TransactionPayer(feePayer.PublicKey()),
	)
	if err != nil {
		return solana.Signature{}, err
	}
	signerKeys := map[solana.PublicKey]*solana.PrivateKey{}
	for _, w := range signers {
		signerKeys[w.PublicKey()] = &w.PrivateKey
	}
	if _, err := tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		return signerKeys[key]
	}); err != nil {
		return solana.Signature{}, err
	}
	wire, err := tx.MarshalBinary()
	if err != nil {
		return solana.Signature{}, err
	}
	sig, err := client.SendTransaction(ctx, tx)
	if err != nil {
		return solana.Signature{}, err
	}
	if err := waitConfirmed(ctx, client, sig); err != nil {
		return sig, err
	}
	logLocalTx(t, label, sig, len(wire))
	return sig, nil
}

func airdropLamports(ctx context.Context, t *testing.T, client *rpc.Client, to solana.PublicKey, lamports uint64) error {
	t.Helper()
	sig, err := client.RequestAirdrop(ctx, to, lamports, rpc.CommitmentFinalized)
	if err != nil {
		return err
	}
	return waitConfirmed(ctx, client, sig)
}

func waitForNextSlot(ctx context.Context, t *testing.T, client *rpc.Client) {
	t.Helper()
	start, err := client.GetSlot(ctx, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(30 * time.Second)
	for time.Now().Before(deadline) {
		slot, err := client.GetSlot(ctx, rpc.CommitmentConfirmed)
		if err != nil {
			t.Fatal(err)
		}
		if slot > start {
			return
		}
		time.Sleep(200 * time.Millisecond)
	}
	t.Fatalf("slot did not advance past %d", start)
}

func TestMinimalFrameLocalnet(t *testing.T) {
	ctx := context.Background()
	client := localRPC(t)
	wallet := loadWallet(t)

	var frameID [32]byte
	if _, err := rand.Read(frameID[:]); err != nil {
		t.Fatal(err)
	}

	plan, err := scratch.PlanNewFrame(scratch.PlanNewFrameParams{
		Payer:          wallet.PublicKey(),
		FrameID:        frameID,
		Authority: wallet.PublicKey(),
		TapeLen:   512,
		ProgramID:      constants.LocalnetProgramID,
	})
	if err != nil {
		t.Fatal(err)
	}
	s := plan.Scratch

	t.Logf("frame PDA: %s", plan.Frame)

	if _, err := sendTx(ctx, t, client, wallet, "setup · create Frame PDA (go-sdk)", plan.IxCreate); err != nil {
		t.Fatalf("create frame: %v", err)
	}

	resetIx := s.IxReset()
	one, err := s.LetConstU64(1)
	if err != nil {
		t.Fatal(err)
	}
	letIx, err := s.IxLet(one)
	if err != nil {
		t.Fatal(err)
	}
	assertIx, err := s.IxAssert(expr.NonZero(expr.Ref(one.Index)))
	if err != nil {
		t.Fatal(err)
	}

	if _, err := sendTx(ctx, t, client, wallet, "go-sdk · reset → let u64(1) → assert non-zero", resetIx, letIx, assertIx); err != nil {
		t.Fatalf("business tx: %v", err)
	}

	dec, err := s.FetchDecodedFrame(ctx, client, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}
	got, err := dec.ReadU64(one)
	if err != nil {
		t.Fatal(err)
	}
	if got != 1 {
		t.Fatalf("readU64(index %d) = %d, want 1", one.Index, got)
	}
	if dec.Cursor == 0 {
		t.Fatal("expected cursor > 0 after let")
	}
	if dec.IndexCount != 1 {
		t.Fatalf("indexCount = %d, want 1", dec.IndexCount)
	}
}
