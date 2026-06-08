package integration

import (
	"context"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/examples"
	"github.com/ifx-run/ifx/go-sdk/scratch"
)

type dustFixture struct {
	Payer           string `json:"payer"`
	FrameID         string `json:"frameId"`
	Mint            string `json:"mint"`
	TokenAccount    string `json:"tokenAccount"`
	Owner           string `json:"owner"`
	OwnerSecret     string `json:"ownerSecret"`
	RentDestination string `json:"rentDestination"`
	DustBalance     int    `json:"dustBalance"`
}

func loadDustFixtureFromPath(t *testing.T, path string) dustFixture {
	t.Helper()
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var fx dustFixture
	if err := json.Unmarshal(raw, &fx); err != nil {
		t.Fatal(err)
	}
	return fx
}

func loadDustFixture(t *testing.T) dustFixture {
	t.Helper()
	path := os.Getenv("IFX_DUST_FIXTURE")
	if path == "" {
		path = "/tmp/ifx-dust-fixture.json"
	}
	if _, err := os.Stat(path); err != nil {
		if os.Getenv("IFX_GEN_DUST_FIXTURE") != "1" {
			t.Skipf("dust fixture missing at %s (set IFX_GEN_DUST_FIXTURE=1 to generate)", path)
		}
		genDustFixture(t, path)
	}
	return loadDustFixtureFromPath(t, path)
}

func genDustFixture(t *testing.T, outPath string) {
	t.Helper()
	repoRoot, err := filepath.Abs("../..")
	if err != nil {
		t.Fatal(err)
	}
	script := filepath.Join(repoRoot, "go-sdk/scripts/dust-fixture.ts")
	cmd := exec.Command("npx", "ts-node", "-P", "tsconfig.json", script)
	cmd.Dir = repoRoot
	cmd.Env = append(os.Environ(),
		"ANCHOR_PROVIDER_URL="+localRPCURL(),
		"ANCHOR_WALLET="+anchorWalletPath(t),
		"IFX_DUST_FIXTURE="+outPath,
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("dust-fixture.ts: %v\n%s", err, out)
	}
}

func TestDustDestroyLocalnet(t *testing.T) {
	ctx := context.Background()
	client := localRPC(t)
	wallet := loadWallet(t)

	path := os.Getenv("IFX_DUST_FIXTURE")
	if path == "" {
		path = "/tmp/ifx-dust-fixture.json"
	}
	genDustFixture(t, path)
	fx := loadDustFixtureFromPath(t, path)

	frameIDBytes, err := hex.DecodeString(fx.FrameID)
	if err != nil {
		t.Fatal(err)
	}
	var frameID [32]byte
	copy(frameID[:], frameIDBytes)

	payer := solana.MustPublicKeyFromBase58(fx.Payer)
	plan, err := scratch.PlanNewFrame(scratch.PlanNewFrameParams{
		Payer:          payer,
		FrameID:        frameID,
		CloseAuthority: payer,
		TapeLen:        256,
		ProgramID:      constants.LocalnetProgramID,
	})
	if err != nil {
		t.Fatal(err)
	}

	ownerSecret, err := base64.StdEncoding.DecodeString(fx.OwnerSecret)
	if err != nil {
		t.Fatal(err)
	}
	ownerWallet := &solana.Wallet{PrivateKey: solana.PrivateKey(ownerSecret)}

	accts := examples.DustDestroyAccounts{
		Mint:            solana.MustPublicKeyFromBase58(fx.Mint),
		TokenAccount:    solana.MustPublicKeyFromBase58(fx.TokenAccount),
		Owner:           ownerWallet.PublicKey(),
		OwnerSigner:     true,
		RentDestination: solana.MustPublicKeyFromBase58(fx.RentDestination),
	}

	ixs, err := examples.PlanDustDestroyInstructions(plan.Scratch, accts)
	if err != nil {
		t.Fatal(err)
	}
	if len(ixs) != 5 {
		t.Fatalf("expected 5 instructions, got %d", len(ixs))
	}

	if _, err := client.GetTokenAccountBalance(ctx, accts.TokenAccount, rpc.CommitmentConfirmed); err != nil {
		t.Fatal(err)
	}

	if _, err := sendTxSigners(
		ctx, t, client, wallet,
		"go-sdk · dust destroy Token-2022",
		[]*solana.Wallet{wallet, ownerWallet},
		ixs...,
	); err != nil {
		t.Fatalf("dust destroy tx: %v", err)
	}

	acct, err := client.GetAccountInfoWithOpts(ctx, accts.TokenAccount, &rpc.GetAccountInfoOpts{
		Commitment: rpc.CommitmentConfirmed,
	})
	if err != nil && !errors.Is(err, rpc.ErrNotFound) {
		t.Fatal(err)
	}
	if acct != nil && acct.Value != nil {
		t.Fatal("expected token account to be closed")
	}
}
