package examples

import (
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/scratch"
)

func TestPlanTwoHopInstructionCount(t *testing.T) {
	frame := solana.NewWallet().PublicKey()
	s := scratch.NewFrameScratch(frame, intPtr(512), constants.LocalnetProgramID, solana.NewWallet().PublicKey())
	src := solana.NewWallet().PublicKey()
	dst := solana.NewWallet().PublicKey()
	owner := solana.NewWallet().PublicKey()
	hop1, err := token.NewTransferInstruction(1, src, dst, owner, nil).ValidateAndBuild()
	if err != nil {
		t.Fatal(err)
	}
	hop2, err := token.NewTransferInstruction(0, dst, src, owner, nil).ValidateAndBuild()
	if err != nil {
		t.Fatal(err)
	}
	ixs, err := PlanTwoHopTokenSwapInstructions(s, TwoHopTokenSwapAccounts{
		UserUsdcAta: dst,
	}, TwoHopTokenSwapInstructions{
		Hop1:         hop1,
		Hop2Template: hop2,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(ixs) != 4 {
		t.Fatalf("got %d instructions, want 4 (reset, hop1, let, patched hop2)", len(ixs))
	}
}

func TestPlanSponsoredBuyInstructionCount(t *testing.T) {
	frame := solana.NewWallet().PublicKey()
	s := scratch.NewFrameScratch(frame, intPtr(512), constants.LocalnetProgramID, solana.NewWallet().PublicKey())
	ixs, err := PlanSponsoredBuyInstructions(s, SponsoredBuyAccounts{
		Sponsor: solana.NewWallet().PublicKey(),
		User:    solana.NewWallet().PublicKey(),
		Pool:    solana.NewWallet().PublicKey(),
		UserATA: solana.NewWallet().PublicKey(),
	}, SponsoredBuyParams{TxSigFee: 15_000}, 3_000_000,
		system.NewTransferInstruction(0, solana.NewWallet().PublicKey(), solana.NewWallet().PublicKey()).Build(),
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(ixs) != 9 {
		t.Fatalf("got %d instructions, want 9", len(ixs))
	}
}

func TestPlanPersonalAmmInstructionCount(t *testing.T) {
	frame := solana.NewWallet().PublicKey()
	s := scratch.NewFrameScratch(frame, intPtr(512), constants.LocalnetProgramID, solana.NewWallet().PublicKey())
	plan, err := PlanPersonalAmmSwapInstructions(s, PersonalAmmAccounts{
		User:          solana.NewWallet().PublicKey(),
		Pool:          solana.NewWallet().PublicKey(),
		UserTokenAAta: solana.NewWallet().PublicKey(),
		PoolTokenAAta: solana.NewWallet().PublicKey(),
		UserTokenBAta: solana.NewWallet().PublicKey(),
		PoolTokenBAta: solana.NewWallet().PublicKey(),
	}, PersonalAmmSwapParams{AmountIn: 1_000_000, MinOut: 1})
	if err != nil {
		t.Fatal(err)
	}
	if len(plan.Instructions) != 5 {
		t.Fatalf("got %d instructions, want 5 (reset, let, assert, debit, patched credit)", len(plan.Instructions))
	}
}
