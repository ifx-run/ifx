// Package immortal provides public / non-closeable Frame authority helpers.
package immortal

import (
	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/frame"
)

// CloseAuthority returns the Frame PDA as off-curve authority (no Signer can close).
func CloseAuthority(payer solana.PublicKey, frameID [32]byte, programID solana.PublicKey) solana.PublicKey {
	if programID.IsZero() {
		programID = constants.DefaultProgramID
	}
	pk, _, _ := frame.FramePDA(programID, payer, frameID)
	return pk
}

// IsImmortalCloseAuthority reports whether authority is the Frame PDA itself.
func IsImmortalCloseAuthority(authority, framePK solana.PublicKey) bool {
	return authority.Equals(framePK)
}
