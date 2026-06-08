package scratch

import (
	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/typed"
)

// ToSolanaMeta converts scratch account meta to solana-go AccountMeta.
func ToSolanaMeta(m typed.AccountMeta) *solana.AccountMeta {
	pub := solana.MustPublicKeyFromBase58(m.Pubkey)
	return &solana.AccountMeta{
		PublicKey:  pub,
		IsSigner:   m.IsSigner,
		IsWritable: m.IsWritable,
	}
}

// FromSolanaMeta converts solana-go AccountMeta to scratch meta.
func FromSolanaMeta(m *solana.AccountMeta) typed.AccountMeta {
	return typed.AccountMeta{
		Pubkey:     m.PublicKey.String(),
		IsSigner:   m.IsSigner,
		IsWritable: m.IsWritable,
	}
}

// ToSolanaMetas converts a slice for ix builders.
func ToSolanaMetas(ms []typed.AccountMeta) solana.AccountMetaSlice {
	out := make(solana.AccountMetaSlice, len(ms))
	for i, m := range ms {
		out[i] = ToSolanaMeta(m)
	}
	return out
}

// NormalizeRemaining converts pubkeys to readonly metas.
func NormalizeRemaining(keys []solana.PublicKey) []typed.AccountMeta {
	out := make([]typed.AccountMeta, len(keys))
	for i, k := range keys {
		out[i] = typed.AccountMeta{Pubkey: k.String()}
	}
	return out
}

func mergeMeta(existing, incoming typed.AccountMeta) typed.AccountMeta {
	return typed.AccountMeta{
		Pubkey:     existing.Pubkey,
		IsSigner:   existing.IsSigner || incoming.IsSigner,
		IsWritable: existing.IsWritable || incoming.IsWritable,
	}
}

func toLetMeta(account interface{}) typed.AccountMeta {
	switch v := account.(type) {
	case solana.PublicKey:
		return typed.AccountMeta{Pubkey: v.String()}
	case *solana.AccountMeta:
		return FromSolanaMeta(v)
	case typed.AccountMeta:
		return v
	default:
		panic("LetAccountInput must be solana.PublicKey, *solana.AccountMeta, or typed.AccountMeta")
	}
}
