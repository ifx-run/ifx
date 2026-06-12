package integration

import (
	"context"
	"crypto/rand"
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/ifelse"
	"github.com/ifx-run/ifx/go-sdk/patch"
	"github.com/ifx-run/ifx/go-sdk/patchedcpi"
	"github.com/ifx-run/ifx/go-sdk/scratch"
)

// TestOrchestrationLocalnet mirrors tests/ifx.ts patched transfer + assert + if_else in one business tx.
//
// Business tx (create/close excluded): reset → let → assert → patched_cpi → if_else
func TestOrchestrationLocalnet(t *testing.T) {
	ctx := context.Background()
	client := localRPC(t)
	wallet := loadWallet(t)
	payer := wallet.PublicKey()

	var frameID [32]byte
	if _, err := rand.Read(frameID[:]); err != nil {
		t.Fatal(err)
	}

	plan, err := scratch.PlanNewFrame(scratch.PlanNewFrameParams{
		Payer:          payer,
		FrameID:        frameID,
		Authority: payer,
		TapeLen:   512,
		ProgramID:      constants.LocalnetProgramID,
	})
	if err != nil {
		t.Fatal(err)
	}
	s := plan.Scratch

	if _, err := sendTx(ctx, t, client, wallet, "setup · create Frame PDA (go-sdk orchestration)", plan.IxCreate); err != nil {
		t.Fatalf("create frame: %v", err)
	}

	recipientA := solana.NewWallet().PublicKey()
	recipientB := solana.NewWallet().PublicKey()
	if err := airdropLamports(ctx, t, client, recipientA, 1_000_000_000); err != nil {
		t.Fatalf("airdrop recipientA: %v", err)
	}
	if err := airdropLamports(ctx, t, client, recipientB, 1_000_000_000); err != nil {
		t.Fatalf("airdrop recipientB: %v", err)
	}

	const (
		mainLamports  = uint64(50_000)
		bonusLamports = uint64(1_000)
	)

	resetIx := s.IxReset()

	b := s.LetBuilder()
	slot, err := b.ClockSlot()
	if err != nil {
		t.Fatal(err)
	}
	mainAmount, err := b.LetConstU64(mainLamports)
	if err != nil {
		t.Fatal(err)
	}
	bonusAmount, err := b.LetConstU64(bonusLamports)
	if err != nil {
		t.Fatal(err)
	}
	doBonus, err := b.LetEval(expr.Bool(true))
	if err != nil {
		t.Fatal(err)
	}
	letIx, err := b.BuildIx()
	if err != nil {
		t.Fatal(err)
	}

	assertIx, err := s.IxAssert(expr.NonZero(expr.Ref(slot.Index)))
	if err != nil {
		t.Fatal(err)
	}

	mainXfer, err := patchedcpi.RawCpi(
		patchedcpi.SystemTransferTemplate(payer, recipientA),
		patch.RawCpiPatch(4, mainAmount),
	).Build(nil)
	if err != nil {
		t.Fatal(err)
	}
	mainCpiIx, err := s.IxCpi(mainXfer.WireBuild())
	if err != nil {
		t.Fatal(err)
	}

	bonusXfer, err := patchedcpi.RawCpi(
		patchedcpi.SystemTransferTemplate(payer, recipientB),
		patch.RawCpiPatch(4, bonusAmount),
	).Build(nil)
	if err != nil {
		t.Fatal(err)
	}
	ifElseArgs, err := ifelse.Args(
		doBonus,
		ifelse.Cpi(bonusXfer.Cpi),
		ifelse.Skip,
	)
	if err != nil {
		t.Fatal(err)
	}
	ifElseIx, err := s.IxIfElse(
		ifElseArgs,
		bonusXfer.Remaining,
	)
	if err != nil {
		t.Fatal(err)
	}

	balanceA, err := client.GetBalance(ctx, recipientA, "confirmed")
	if err != nil {
		t.Fatal(err)
	}
	balanceB, err := client.GetBalance(ctx, recipientB, "confirmed")
	if err != nil {
		t.Fatal(err)
	}

	if _, err := sendTx(
		ctx, t, client, wallet,
		"go-sdk · reset → let → assert → patched_cpi → if_else",
		resetIx,
		letIx,
		assertIx,
		mainCpiIx,
		ifElseIx,
	); err != nil {
		t.Fatalf("business tx: %v", err)
	}

	afterA, err := client.GetBalance(ctx, recipientA, "confirmed")
	if err != nil {
		t.Fatal(err)
	}
	afterB, err := client.GetBalance(ctx, recipientB, "confirmed")
	if err != nil {
		t.Fatal(err)
	}

	deltaA := afterA.Value - balanceA.Value
	deltaB := afterB.Value - balanceB.Value
	if deltaA != mainLamports {
		t.Fatalf("recipientA delta = %d, want %d", deltaA, mainLamports)
	}
	if deltaB != bonusLamports {
		t.Fatalf("recipientB delta = %d, want %d", deltaB, bonusLamports)
	}
}
