package integration

import (
	"context"
	"errors"
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/ifx-run/ifx/go-sdk/examples"
)

func TestDustDestroyLocalnet(t *testing.T) {
	ctx := context.Background()
	client := localRPC(t)
	wallet := loadWallet(t)

	setup := setupDustDestroyFixture(ctx, t, client, wallet)

	ixs, err := examples.PlanDustDestroyInstructions(setup.Plan.Scratch, setup.Accts)
	if err != nil {
		t.Fatal(err)
	}
	if len(ixs) != 5 {
		t.Fatalf("expected 5 instructions, got %d", len(ixs))
	}

	if _, err := client.GetTokenAccountBalance(ctx, setup.Accts.TokenAccount, rpc.CommitmentConfirmed); err != nil {
		t.Fatal(err)
	}

	if _, err := sendTxSigners(
		ctx, t, client, wallet,
		"go-sdk · dust destroy Token-2022",
		[]*solana.Wallet{wallet, setup.Owner},
		ixs...,
	); err != nil {
		t.Fatalf("dust destroy tx: %v", err)
	}

	acct, err := client.GetAccountInfoWithOpts(ctx, setup.Accts.TokenAccount, &rpc.GetAccountInfoOpts{
		Commitment: rpc.CommitmentConfirmed,
	})
	if err != nil && !errors.Is(err, rpc.ErrNotFound) {
		t.Fatal(err)
	}
	if acct != nil && acct.Value != nil {
		t.Fatal("expected token account to be closed")
	}
}
