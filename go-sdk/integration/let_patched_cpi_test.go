package integration

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"strings"
	"testing"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/ifx-run/ifx/go-sdk/codec"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/patchedcpi"
	"github.com/ifx-run/ifx/go-sdk/scratch"
	"github.com/ifx-run/ifx/go-sdk/typed"
)

var returnEchoProgramID = solana.MustPublicKeyFromBase58("DrC6aMeryjNBs2kmf7yE87MtWj8rwL1YEkWioK4xosJP")

func echoIx(data []byte) solana.Instruction {
	return solana.NewInstruction(returnEchoProgramID, nil, data)
}

func TestLetPatchedCpiLocalnet(t *testing.T) {
	ctx := context.Background()
	client := localRPC(t)
	wallet := loadWallet(t)
	if _, err := client.GetAccountInfo(ctx, returnEchoProgramID); err != nil {
		t.Skipf("return_echo not deployed: %v", err)
	}

	var frameID [32]byte
	if _, err := rand.Read(frameID[:]); err != nil {
		t.Fatal(err)
	}
	plan, err := scratch.PlanNewFrame(scratch.PlanNewFrameParams{
		Payer:     wallet.PublicKey(),
		FrameID:   frameID,
		Authority: wallet.PublicKey(),
		TapeLen:   512,
		ProgramID: constants.LocalnetProgramID,
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendTx(ctx, t, client, wallet, "setup · create Frame PDA (let patched cpi)", plan.IxCreate); err != nil {
		t.Fatal(err)
	}
	waitFrame(ctx, t, client, plan.Frame)

	s := plan.Scratch
	payload := make([]byte, 16)
	binary.LittleEndian.PutUint64(payload[0:8], 42)
	binary.LittleEndian.PutUint64(payload[8:16], 7)
	step, remaining, err := patchedcpi.StaticCpi(echoIx(payload), nil)
	if err != nil {
		t.Fatal(err)
	}
	reset := s.IxReset()
	ix, values, err := s.IxLetPatchedCpi(step, remaining, []codec.ReturnDataLet{
		{Ty: typed.TyU64, Offset: 0},
		{Ty: typed.TyU64, Offset: 8},
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendTx(ctx, t, client, wallet, "go-sdk · let_patched_cpi two u64", reset, ix); err != nil {
		t.Fatal(err)
	}
	dec, err := s.FetchDecodedFrame(ctx, client, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}
	got0, err := dec.ReadU64(values[0])
	if err != nil {
		t.Fatal(err)
	}
	got1, err := dec.ReadU64(values[1])
	if err != nil {
		t.Fatal(err)
	}
	if got0 != 42 || got1 != 7 {
		t.Fatalf("got %d %d", got0, got1)
	}

	shortStep, shortRem, err := patchedcpi.StaticCpi(echoIx([]byte{1}), nil)
	if err != nil {
		t.Fatal(err)
	}
	short := scratch.NewFrameScratch(s.Frame, s.TapeLen, s.ProgramID, s.Authority)
	shortReset := short.IxReset()
	shortIx, _, err := short.IxLetPatchedCpi(shortStep, shortRem, []codec.ReturnDataLet{{Ty: typed.TyU64, Offset: 0}})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendTx(ctx, t, client, wallet, "go-sdk · let_patched_cpi too short", shortReset, shortIx); err == nil || !errorHas(err, "ReturnDataTooShort", "6044", "0x179c") {
		t.Fatalf("too short: %v", err)
	}

	transfer, err := system.NewTransferInstruction(1, wallet.PublicKey(), wallet.PublicKey()).ValidateAndBuild()
	if err != nil {
		t.Fatal(err)
	}
	missStep, missRem, err := patchedcpi.StaticCpi(transfer, nil)
	if err != nil {
		t.Fatal(err)
	}
	miss := scratch.NewFrameScratch(s.Frame, s.TapeLen, s.ProgramID, s.Authority)
	missReset := miss.IxReset()
	missIx, _, err := miss.IxLetPatchedCpi(missStep, missRem, []codec.ReturnDataLet{{Ty: typed.TyU64, Offset: 0}})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendTx(ctx, t, client, wallet, "go-sdk · let_patched_cpi missing return data", missReset, missIx); err == nil || !errorHas(err, "ReturnDataMissing", "6042", "0x179a") {
		t.Fatalf("missing: %v", err)
	}
}

func waitFrame(ctx context.Context, t *testing.T, client *rpc.Client, frame solana.PublicKey) {
	t.Helper()
	deadline := time.Now().Add(40 * time.Second)
	for time.Now().Before(deadline) {
		acct, err := client.GetAccountInfoWithOpts(ctx, frame, &rpc.GetAccountInfoOpts{
			Commitment: rpc.CommitmentFinalized,
		})
		if err == nil && acct != nil && acct.Value != nil && len(acct.Value.Data.GetBinary()) > 0 {
			return
		}
		time.Sleep(200 * time.Millisecond)
	}
	t.Fatalf("frame %s not visible after create", frame)
}

func errorHas(err error, parts ...string) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	for _, p := range parts {
		if strings.Contains(msg, p) || strings.Contains(strings.ToLower(msg), strings.ToLower(p)) {
			return true
		}
	}
	return false
}
