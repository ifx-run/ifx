package frameauthority

import (
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/frame"
)

func TestPublicFrameAuthorityReturnsFramePDA(t *testing.T) {
	payer := solana.NewWallet().PublicKey()
	var frameID [32]byte
	frameID[0] = 3
	framePK, _, err := frame.FramePDA(constants.DevnetProgramID, payer, frameID)
	if err != nil {
		t.Fatal(err)
	}
	got := PublicFrameAuthority(payer, frameID, constants.DevnetProgramID)
	if !got.Equals(framePK) {
		t.Fatalf("PublicFrameAuthority %s != frame %s", got, framePK)
	}
}

func TestIsPublicFrameAuthority(t *testing.T) {
	framePK := solana.NewWallet().PublicKey()
	if !IsPublicFrameAuthority(framePK, framePK) {
		t.Fatal("self-referential authority expected public frame")
	}
	if IsPublicFrameAuthority(solana.NewWallet().PublicKey(), framePK) {
		t.Fatal("unrelated authority must not be public frame authority")
	}
	if IsPublicFrameAuthority(constants.DefaultProgramID, framePK) {
		t.Fatal("program id must not be public frame authority")
	}
}
