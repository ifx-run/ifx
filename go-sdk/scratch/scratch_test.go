package scratch

import (
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/codec"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/typed"
)

func TestPlanPublicFrameSetsFrameAuthority(t *testing.T) {
	payer := solana.NewWallet().PublicKey()
	var frameID [32]byte
	frameID[0] = 11

	plan, err := PlanPublicFrame(PlanNewFrameParams{
		Payer:     payer,
		FrameID:   frameID,
		TapeLen:   512,
		ProgramID: constants.LocalnetProgramID,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !plan.Scratch.Authority.Equals(plan.Frame) {
		t.Fatalf("authority %s != frame %s", plan.Scratch.Authority, plan.Frame)
	}
	data, err := plan.IxCreate.Data()
	if err != nil {
		t.Fatal(err)
	}
	if data[0] != constants.IxDiscCreateFrame {
		t.Fatalf("disc %d", data[0])
	}
	var auth solana.PublicKey
	copy(auth[:], data[1+32:1+32+32])
	if !auth.Equals(plan.Frame) {
		t.Fatalf("create ix authority %s != frame %s", auth, plan.Frame)
	}
}

func TestForPublicFrameSetsFrameAuthority(t *testing.T) {
	frame := solana.NewWallet().PublicKey()
	s := ForPublicFrame(frame, constants.LocalnetProgramID, intPtr(512))
	if !s.Authority.Equals(frame) {
		t.Fatalf("authority %s != frame %s", s.Authority, frame)
	}
	if !s.Frame.Equals(frame) {
		t.Fatal("frame mismatch")
	}
	if s.Cursor != 0 || s.NextIndex != 0 {
		t.Fatalf("cursor/index not reset")
	}
}

func TestLetLamportsRemainingIndex(t *testing.T) {
	frame := solana.NewWallet().PublicKey()
	user := solana.NewWallet().PublicKey()
	s := NewFrameScratch(frame, intPtr(512), constants.LocalnetProgramID, solana.NewWallet().PublicKey())

	sv, err := s.LetLamports(user)
	if err != nil {
		t.Fatal(err)
	}
	if len(sv.Remaining) != 1 || sv.Remaining[0].Pubkey != user.String() {
		t.Fatalf("remaining: %+v", sv.Remaining)
	}
	ix, err := s.IxLet(sv)
	if err != nil {
		t.Fatal(err)
	}
	if ix.Accounts()[2].PublicKey != user {
		t.Fatal("ix missing user in remaining")
	}
	if sv.Index != 0 {
		t.Fatalf("index %d", sv.Index)
	}
}

func TestLetConstU64EmptyRemaining(t *testing.T) {
	frame := solana.NewWallet().PublicKey()
	s := NewFrameScratch(frame, intPtr(512), constants.LocalnetProgramID, solana.NewWallet().PublicKey())
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
	s := NewFrameScratch(frame, intPtr(512), constants.LocalnetProgramID, solana.NewWallet().PublicKey())
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
	ix, err := b.BuildIx()
	if err != nil {
		t.Fatal(err)
	}
	if len(ix.Accounts()) != 3 {
		t.Fatalf("accounts %d", len(ix.Accounts()))
	}
}

func TestMinimalBusinessWire(t *testing.T) {
	frame := solana.NewWallet().PublicKey()
	s := NewFrameScratch(frame, intPtr(512), constants.LocalnetProgramID, solana.NewWallet().PublicKey())
	s.IxReset()
	one, err := s.LetConstU64(1)
	if err != nil {
		t.Fatal(err)
	}
	letIx, err := s.IxLet(one)
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
	assertIx, err := s.IxAssert(expr.NonZero(one))
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

func TestIxLetPatchedCpiReservesTwoLets(t *testing.T) {
	frame := solana.NewWallet().PublicKey()
	auth := solana.NewWallet().PublicKey()
	program := solana.NewWallet().PublicKey()
	s := NewFrameScratch(frame, intPtr(512), constants.LocalnetProgramID, auth)
	step := codec.Cpi{
		AccountsStart: 0,
		AccountsLen:   1,
		Data:          []byte{1, 2, 3, 4, 5, 6, 7, 8},
	}
	remaining := []typed.AccountMeta{{Pubkey: program.String()}}
	lets := []codec.ReturnDataLet{
		{Ty: typed.TyU64, Offset: 0},
		{Ty: typed.TyU64, Offset: 8},
	}
	ix, values, err := s.IxLetPatchedCpi(step, remaining, lets)
	if err != nil {
		t.Fatal(err)
	}
	data, err := ix.Data()
	if err != nil {
		t.Fatal(err)
	}
	if data[0] != constants.IxDiscLetPatchedCpi || data[14] != 2 || data[15] != 4 {
		t.Fatalf("wire %v", data)
	}
	if values[0].Index != 0 || values[1].Index != 1 {
		t.Fatalf("indices %d %d", values[0].Index, values[1].Index)
	}
	accs := ix.Accounts()
	if len(accs) != 3 || !accs[0].IsWritable || !accs[1].IsSigner || !accs[2].PublicKey.Equals(program) {
		t.Fatalf("accounts %+v", accs)
	}
	if _, _, err := s.IxLetPatchedCpi(step, remaining, nil); err == nil {
		t.Fatal("expected empty lets to fail")
	}
	if s.NextIndex != 2 {
		t.Fatalf("next index %d", s.NextIndex)
	}
}

func intPtr(n int) *int { return &n }
