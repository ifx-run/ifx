package frameauthority

import (
	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/frame"
)

// PublicFrameAuthority returns the Frame PDA as off-curve authority for planPublicFrame.
func PublicFrameAuthority(payer solana.PublicKey, frameID [32]byte, programID solana.PublicKey) solana.PublicKey {
	if programID.IsZero() {
		programID = constants.DefaultProgramID
	}
	pk, _, _ := frame.FramePDA(programID, payer, frameID)
	return pk
}

// IsPublicFrameAuthority reports whether authority is the Frame PDA (public Frame).
func IsPublicFrameAuthority(authority, framePK solana.PublicKey) bool {
	return authority.Equals(framePK)
}
