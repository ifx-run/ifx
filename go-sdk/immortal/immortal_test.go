package immortal

import (
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/frame"
)

func TestCloseAuthorityReturnsFramePDA(t *testing.T) {
	payer := solana.NewWallet().PublicKey()
	var frameID [32]byte
	frameID[0] = 3
	framePK, _, err := frame.FramePDA(constants.DevnetProgramID, payer, frameID)
	if err != nil {
		t.Fatal(err)
	}
	got := CloseAuthority(payer, frameID, constants.DevnetProgramID)
	if !got.Equals(framePK) {
		t.Fatalf("CloseAuthority %s != frame %s", got, framePK)
	}
}

func TestIsImmortalCloseAuthority(t *testing.T) {
	framePK := solana.NewWallet().PublicKey()
	if !IsImmortalCloseAuthority(framePK, framePK) {
		t.Fatal("self-referential authority expected immortal")
	}
	if IsImmortalCloseAuthority(solana.NewWallet().PublicKey(), framePK) {
		t.Fatal("unrelated authority must not be immortal")
	}
	if IsImmortalCloseAuthority(constants.DefaultProgramID, framePK) {
		t.Fatal("program id must not be immortal close authority")
	}
}
