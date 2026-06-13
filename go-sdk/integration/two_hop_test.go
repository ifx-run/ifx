package integration

import (
	"context"
	"crypto/rand"
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/examples"
	"github.com/ifx-run/ifx/go-sdk/scratch"
)

const (
	mockHop1UsdcOut = uint64(2_000_000)
	mockHop2BOut    = uint64(5_000_000)
)

func TestTwoHopSwapLocalnet(t *testing.T) {
	ctx := context.Background()
	client := localRPC(t)
	wallet := loadWallet(t)
	payer := wallet.PublicKey()

	user := solana.NewWallet()
	pool := solana.NewWallet()
	if err := airdropLamports(ctx, t, client, user.PublicKey(), 1_000_000_000); err != nil {
		t.Fatal(err)
	}
	if err := airdropLamports(ctx, t, client, pool.PublicKey(), 1_000_000_000); err != nil {
		t.Fatal(err)
	}

	var frameID [32]byte
	if _, err := rand.Read(frameID[:]); err != nil {
		t.Fatal(err)
	}
	plan, err := scratch.PlanNewFrame(scratch.PlanNewFrameParams{
		Payer:     payer,
		FrameID:   frameID,
		Authority: payer,
		TapeLen:   512,
		ProgramID: constants.LocalnetProgramID,
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendTx(ctx, t, client, wallet, "setup · create Frame PDA (two-hop)", plan.IxCreate); err != nil {
		t.Fatalf("create frame: %v", err)
	}

	_, mintUsdc := createSplMint(ctx, t, client, wallet, payer, 6)
	_, mintB := createSplMint(ctx, t, client, wallet, payer, 6)

	userUsdcAta := createSplAta(ctx, t, client, wallet, user.PublicKey(), mintUsdc)
	userBAta := createSplAta(ctx, t, client, wallet, user.PublicKey(), mintB)
	poolUsdcAta := createSplAta(ctx, t, client, wallet, pool.PublicKey(), mintUsdc)
	poolBAta := createSplAta(ctx, t, client, wallet, pool.PublicKey(), mintB)

	mintSplTo(ctx, t, client, wallet, mintUsdc, poolUsdcAta, payer, true, 10_000_000)
	mintSplTo(ctx, t, client, wallet, mintB, poolBAta, payer, true, 10_000_000)

	hop1, err := splTransferIx(poolUsdcAta, userUsdcAta, pool.PublicKey(), mockHop1UsdcOut)
	if err != nil {
		t.Fatal(err)
	}
	hop2Template, err := splTransferIx(userUsdcAta, poolUsdcAta, user.PublicKey(), 0)
	if err != nil {
		t.Fatal(err)
	}
	hop2Deliver, err := splTransferIx(poolBAta, userBAta, pool.PublicKey(), mockHop2BOut)
	if err != nil {
		t.Fatal(err)
	}

	s := plan.Scratch
	ixs, err := examples.PlanTwoHopTokenSwapInstructions(s, examples.TwoHopTokenSwapAccounts{
		UserUsdcAta: userUsdcAta,
	}, examples.TwoHopTokenSwapInstructions{
		Hop1:         hop1,
		Hop2Template: hop2Template,
		Hop2Deliver:  &hop2Deliver,
	})
	if err != nil {
		t.Fatal(err)
	}

	if _, err := sendTxSigners(ctx, t, client, wallet,
		"go-sdk · two-hop A→USDC→B",
		[]*solana.Wallet{wallet, pool, user},
		ixs...,
	); err != nil {
		t.Fatalf("two-hop tx: %v", err)
	}

	usdcBal, err := client.GetTokenAccountBalance(ctx, userUsdcAta, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}
	if usdcBal.Value.Amount != "0" {
		t.Fatalf("USDC ATA balance = %s, want 0", usdcBal.Value.Amount)
	}
	bBal, err := client.GetTokenAccountBalance(ctx, userBAta, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}
	if bBal.Value.Amount != "5000000" {
		t.Fatalf("token B balance = %s, want 5000000", bBal.Value.Amount)
	}

	dec, err := s.FetchDecodedFrame(ctx, client, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}
	if dec.Cursor == 0 {
		t.Fatal("expected cursor > 0 after let")
	}
}
