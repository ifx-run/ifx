package examples

import (
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/scratch"
)

func TestPlanDustDestroyInstructionCount(t *testing.T) {
	frame := solana.NewWallet().PublicKey()
	s := scratch.NewFrameScratch(frame, intPtr(256), constants.LocalnetProgramID)
	accts := DustDestroyAccounts{
		Mint:            solana.NewWallet().PublicKey(),
		TokenAccount:    solana.NewWallet().PublicKey(),
		Owner:           solana.NewWallet().PublicKey(),
		OwnerSigner:     true,
		RentDestination: solana.NewWallet().PublicKey(),
	}
	ixs, err := PlanDustDestroyInstructions(s, accts)
	if err != nil {
		t.Fatal(err)
	}
	if len(ixs) != 5 {
		t.Fatalf("got %d instructions, want 5 (reset, let, 3x if_else)", len(ixs))
	}
}

func intPtr(n int) *int { return &n }
