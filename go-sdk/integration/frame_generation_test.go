package integration

import (
	"context"
	"crypto/rand"
	"testing"

	"github.com/gagliardetto/solana-go/rpc"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/scratch"
)

func TestFrameGenerationLocalnet(t *testing.T) {
	ctx := context.Background()
	client := localRPC(t)
	wallet := loadWallet(t)

	var frameID [32]byte
	if _, err := rand.Read(frameID[:]); err != nil {
		t.Fatal(err)
	}

	plan, err := scratch.PlanNewFrame(scratch.PlanNewFrameParams{
		Payer:     wallet.PublicKey(),
		FrameID:   frameID,
		Authority: wallet.PublicKey(),
		TapeLen:   256,
		ProgramID: constants.LocalnetProgramID,
	})
	if err != nil {
		t.Fatal(err)
	}
	s := plan.Scratch

	if _, err := sendTx(ctx, t, client, wallet, "setup · create Frame (generation)", plan.IxCreate); err != nil {
		t.Fatalf("create frame: %v", err)
	}

	dec, err := s.FetchDecodedFrame(ctx, client, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}
	if dec.Generation != 0 {
		t.Fatalf("generation at create = %d, want 0", dec.Generation)
	}

	if _, err := sendTx(ctx, t, client, wallet, "go-sdk · reset #1 (gen 0→1)", s.IxReset()); err != nil {
		t.Fatalf("reset #1: %v", err)
	}
	dec, err = s.FetchDecodedFrame(ctx, client, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}
	if dec.Generation != 1 {
		t.Fatalf("generation after reset = %d, want 1", dec.Generation)
	}
	if dec.IndexCount != 0 || dec.Cursor != 0 {
		t.Fatalf("after reset: indexCount=%d cursor=%d, want 0/0", dec.IndexCount, dec.Cursor)
	}

	waitForNextSlot(ctx, t, client)

	if _, err := sendTx(ctx, t, client, wallet, "go-sdk · reset #2 (gen 1→2)", s.IxReset()); err != nil {
		t.Fatalf("reset #2: %v", err)
	}
	dec, err = s.FetchDecodedFrame(ctx, client, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}
	if dec.Generation != 2 {
		t.Fatalf("generation after second reset = %d, want 2", dec.Generation)
	}

	gen, err := s.LetFrameGeneration()
	if err != nil {
		t.Fatal(err)
	}
	resetIx := s.IxReset()
	letGenIx, err := s.IxLet(gen)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendTx(ctx, t, client, wallet, "go-sdk · reset → let frame.generation", resetIx, letGenIx); err != nil {
		t.Fatalf("let generation: %v", err)
	}
	dec, err = s.FetchDecodedFrame(ctx, client, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}
	if dec.Generation != 3 {
		t.Fatalf("generation on account = %d, want 3", dec.Generation)
	}
	gotGen, err := dec.ReadU64(gen)
	if err != nil {
		t.Fatal(err)
	}
	if gotGen != 3 {
		t.Fatalf("tape generation binding = %d, want 3", gotGen)
	}

	idxCount, err := s.LetFrameIndexCount()
	if err != nil {
		t.Fatal(err)
	}
	letIdxIx, err := s.IxLet(idxCount)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendTx(ctx, t, client, wallet, "go-sdk · reset → let frame.index_count", s.IxReset(), letIdxIx); err != nil {
		t.Fatalf("let index_count: %v", err)
	}
	dec, err = s.FetchDecodedFrame(ctx, client, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}
	gotIdx, err := dec.ReadU16(idxCount)
	if err != nil {
		t.Fatal(err)
	}
	if gotIdx != 0 {
		t.Fatalf("tape index_count binding = %d, want 0 (eval before append)", gotIdx)
	}
}

func TestFrameGenerationContinuationLocalnet(t *testing.T) {
	ctx := context.Background()
	client := localRPC(t)
	wallet := loadWallet(t)

	var frameID [32]byte
	if _, err := rand.Read(frameID[:]); err != nil {
		t.Fatal(err)
	}

	plan, err := scratch.PlanNewFrame(scratch.PlanNewFrameParams{
		Payer:     wallet.PublicKey(),
		FrameID:   frameID,
		Authority: wallet.PublicKey(),
		TapeLen:   256,
		ProgramID: constants.LocalnetProgramID,
	})
	if err != nil {
		t.Fatal(err)
	}
	s := plan.Scratch

	if _, err := sendTx(ctx, t, client, wallet, "setup · create Frame (continuation)", plan.IxCreate); err != nil {
		t.Fatalf("create frame: %v", err)
	}

	payload, err := s.LetConstU64(42)
	if err != nil {
		t.Fatal(err)
	}
	letPayloadIx, err := s.IxLet(payload)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendTx(ctx, t, client, wallet, "go-sdk · reset → let const (session 1)", s.IxReset(), letPayloadIx); err != nil {
		t.Fatalf("session 1: %v", err)
	}

	snap, err := s.FetchDecodedFrame(ctx, client, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}
	if snap.Generation != 1 {
		t.Fatalf("generation after session 1 = %d, want 1", snap.Generation)
	}
	if snap.IndexCount != 1 {
		t.Fatalf("indexCount after session 1 = %d, want 1", snap.IndexCount)
	}

	cont := scratch.FromDecodedFrame(snap, plan.Frame, constants.LocalnetProgramID)
	gen, err := cont.LetFrameGeneration()
	if err != nil {
		t.Fatal(err)
	}
	letGenIx, err := cont.IxLet(gen)
	if err != nil {
		t.Fatal(err)
	}
	assertIx, err := cont.IxAssert(expr.Eq(expr.Ref(gen.Index), expr.U64(snap.Generation)))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendTx(ctx, t, client, wallet, "go-sdk · continue: let generation → assert eq", letGenIx, assertIx); err != nil {
		t.Fatalf("continuation tx: %v", err)
	}

	after, err := cont.FetchDecodedFrame(ctx, client, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}
	if after.Generation != 1 {
		t.Fatalf("generation unchanged = %d, want 1", after.Generation)
	}
	gotGen, err := after.ReadU64(gen)
	if err != nil {
		t.Fatal(err)
	}
	if gotGen != 1 {
		t.Fatalf("tape generation = %d, want 1", gotGen)
	}
	if after.IndexCount != 2 {
		t.Fatalf("indexCount after continuation = %d, want 2", after.IndexCount)
	}
}
