// Package frameauthority encodes Frame authority write gates (on-curve vs off-curve).
package frameauthority

import "github.com/gagliardetto/solana-go"

// RequiresSigner reports whether writes need an ed25519 authority signer.
func RequiresSigner(authority solana.PublicKey) bool {
	return authority.IsOnCurve()
}

// WriteAuthorityMeta is the authority signer for private Frame reset / let (remaining[0]).
func WriteAuthorityMeta(authority solana.PublicKey) *solana.AccountMeta {
	return solana.Meta(authority).SIGNER()
}

// PrependWriteAuthorityRemaining prepends on-curve authority to remaining; public Frame → unchanged.
func PrependWriteAuthorityRemaining(authority solana.PublicKey, remaining solana.AccountMetaSlice) solana.AccountMetaSlice {
	if !RequiresSigner(authority) {
		return remaining
	}
	out := make(solana.AccountMetaSlice, 1+len(remaining))
	out[0] = WriteAuthorityMeta(authority)
	copy(out[1:], remaining)
	return out
}
