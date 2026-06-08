// Package examples demonstrates go-sdk usage (compile-only smoke tests).
package examples

import (
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/scratch"
)

func TestPlanMinimalFrameBusiness(t *testing.T) {
	payer := solana.NewWallet().PublicKey()
	var frameID [32]byte
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
	s := plan.Scratch
	s.IxReset(nil)
	one, err := s.LetConstU64(1)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.IxLet(one, nil); err != nil {
		t.Fatal(err)
	}
	if _, err := s.IxAssert(expr.NonZero(expr.Ref(one.Index)), nil); err != nil {
		t.Fatal(err)
	}
	if plan.IxCreate == nil || plan.Frame.IsZero() {
		t.Fatal("plan missing create ix")
	}
}
