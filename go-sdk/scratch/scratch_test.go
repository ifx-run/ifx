package scratch

import (
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/codec"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
)

func TestLetLamportsRemainingIndex(t *testing.T) {
	frame := solana.NewWallet().PublicKey()
	user := solana.NewWallet().PublicKey()
	s := NewFrameScratch(frame, intPtr(256), constants.LocalnetProgramID)

	sv, err := s.LetLamports(user)
	if err != nil {
		t.Fatal(err)
	}
	if len(sv.Remaining) != 1 || sv.Remaining[0].Pubkey != user.String() {
		t.Fatalf("remaining: %+v", sv.Remaining)
	}
	ix, err := s.IxLet(sv, nil)
	if err != nil {
		t.Fatal(err)
	}
	if ix.Accounts()[1].PublicKey != user {
		t.Fatal("ix missing user in remaining")
	}
	if sv.Index != 0 {
		t.Fatalf("index %d", sv.Index)
	}
}

func TestLetConstU64EmptyRemaining(t *testing.T) {
	frame := solana.NewWallet().PublicKey()
	s := NewFrameScratch(frame, intPtr(256), constants.LocalnetProgramID)
	sv, err := s.LetConstU64(42)
	if err != nil {
		t.Fatal(err)
	}
	if len(sv.Remaining) != 0 {
		t.Fatalf("expected empty remaining")
	}
}

func TestLetBuilderDedupesAccounts(t *testing.T) {
	frame := solana.NewWallet().PublicKey()
	user := solana.NewWallet().PublicKey()
	s := NewFrameScratch(frame, intPtr(256), constants.LocalnetProgramID)
	b := s.LetBuilder()
	if _, err := b.Lamports(user); err != nil {
		t.Fatal(err)
	}
	if _, err := b.DataLen(user); err != nil {
		t.Fatal(err)
	}
	fin := b.Finish()
	if len(fin.Remaining) != 1 {
		t.Fatalf("expected 1 remaining, got %d", len(fin.Remaining))
	}
	ix, err := b.BuildIx(nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(ix.Accounts()) != 2 {
		t.Fatalf("accounts %d", len(ix.Accounts()))
	}
}

func TestMinimalBusinessWire(t *testing.T) {
	frame := solana.NewWallet().PublicKey()
	s := NewFrameScratch(frame, intPtr(256), constants.LocalnetProgramID)
	s.IxReset(nil)
	one, err := s.LetConstU64(1)
	if err != nil {
		t.Fatal(err)
	}
	letIx, err := s.IxLet(one, nil)
	if err != nil {
		t.Fatal(err)
	}
	letData, err := letIx.Data()
	if err != nil {
		t.Fatal(err)
	}
	if letData[0] != constants.IxDiscLet {
		t.Fatalf("disc %d", letData[0])
	}
	assertIx, err := s.IxAssert(expr.NonZero(expr.Ref(one.Index)), nil)
	if err != nil {
		t.Fatal(err)
	}
	assertData, err := assertIx.Data()
	if err != nil {
		t.Fatal(err)
	}
	if assertData[0] != constants.IxDiscAssert {
		t.Fatalf("disc %d", assertData[0])
	}
	_ = codec.LetArgs{}
}

func intPtr(n int) *int { return &n }
