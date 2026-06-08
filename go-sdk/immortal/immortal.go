// Package immortal provides public / non-closeable Frame close_authority helpers.
package immortal

import (
	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/frame"
)

// CloseAuthority returns the Frame PDA as close_authority (no Signer can close).
func CloseAuthority(payer solana.PublicKey, frameID [32]byte, programID solana.PublicKey) solana.PublicKey {
	if programID.IsZero() {
		programID = constants.DefaultProgramID
	}
	pk, _, _ := frame.FramePDA(programID, payer, frameID)
	return pk
}

// IsImmortalCloseAuthority reports whether close_authority is the Frame PDA itself.
func IsImmortalCloseAuthority(closeAuthority, framePK solana.PublicKey) bool {
	return closeAuthority.Equals(framePK)
}
