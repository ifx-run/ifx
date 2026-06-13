package integration

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/examples"
	"github.com/ifx-run/ifx/go-sdk/scratch"
)

const (
	txSigFee           = uint64(5_000 * 3)
	mockSwapLamports   = uint64(3_000_000)
	lamportsPerSol     = uint64(1_000_000_000)
)

func TestSponsoredBuyLocalnet(t *testing.T) {
	ctx := context.Background()
	client := localRPC(t)
	sponsor := loadWallet(t)

	user := solana.NewWallet()
	pool := solana.NewWallet()
	if err := airdropLamports(ctx, t, client, user.PublicKey(), lamportsPerSol); err != nil {
		t.Fatal(err)
	}
	if err := airdropLamports(ctx, t, client, pool.PublicKey(), lamportsPerSol); err != nil {
		t.Fatal(err)
	}

	var frameID [32]byte
	if _, err := rand.Read(frameID[:]); err != nil {
		t.Fatal(err)
	}
	plan, err := scratch.PlanNewFrame(scratch.PlanNewFrameParams{
		Payer:     sponsor.PublicKey(),
		FrameID:   frameID,
		Authority: sponsor.PublicKey(),
		TapeLen:   512,
		ProgramID: constants.LocalnetProgramID,
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendTx(ctx, t, client, sponsor, "setup · create Frame PDA (sponsored-buy)", plan.IxCreate); err != nil {
		t.Fatalf("create frame: %v", err)
	}

	_, mint := createSplMint(ctx, t, client, sponsor, sponsor.PublicKey(), 6)
	userATA, _, err := solana.FindProgramAddress(
		[][]byte{user.PublicKey().Bytes(), token.ProgramID.Bytes(), mint.Bytes()},
		solana.SPLAssociatedTokenAccountProgramID,
	)
	if err != nil {
		t.Fatal(err)
	}
	idempotentATA := createSplAtaIx(sponsor.PublicKey(), user.PublicKey(), mint, userATA)

	s := plan.Scratch
	ixs, err := examples.PlanSponsoredBuyInstructions(s, examples.SponsoredBuyAccounts{
		Sponsor: sponsor.PublicKey(),
		User:    user.PublicKey(),
		Pool:    pool.PublicKey(),
		UserATA: userATA,
	}, examples.SponsoredBuyParams{TxSigFee: txSigFee}, mockSwapLamports, idempotentATA)
	if err != nil {
		t.Fatal(err)
	}

	sig, err := sendTxSigners(ctx, t, client, sponsor,
		"go-sdk · sponsored buy · settle + patched transfers",
		[]*solana.Wallet{sponsor, pool, user},
		ixs...,
	)
	if err != nil {
		t.Fatalf("orchestration tx: %v", err)
	}

	ataInfo, err := client.GetAccountInfo(ctx, userATA)
	if err != nil || ataInfo.Value == nil {
		t.Fatal("user ATA should exist")
	}
	ataRent := ataInfo.Value.Lamports
	buyExpected := mockSwapLamports - ataRent - txSigFee

	sponsorNet, txFee, err := accountLamportDeltaInTx(ctx, client, sig, sponsor.PublicKey())
	if err != nil {
		t.Fatal(err)
	}
	feeShortfall := int64(0)
	if txFee > txSigFee {
		feeShortfall = int64(txFee - txSigFee)
	}
	if sponsorNet < -(feeShortfall+2000) || sponsorNet > 2000 {
		t.Fatalf("sponsor net %d tx_fee %d budget %d", sponsorNet, txFee, txSigFee)
	}

	userNet, _, err := accountLamportDeltaInTx(ctx, client, sig, user.PublicKey())
	if err != nil {
		t.Fatal(err)
	}
	if userNet < -50_000 || userNet > 50_000 {
		t.Fatalf("user wallet net %d, want ~0", userNet)
	}

	poolNet, _, err := accountLamportDeltaInTx(ctx, client, sig, pool.PublicKey())
	if err != nil {
		t.Fatal(err)
	}
	poolOut := uint64(-poolNet)
	swapMinusBuy := mockSwapLamports - buyExpected
	if poolOut < swapMinusBuy-100_000 || poolOut > swapMinusBuy+100_000 {
		t.Fatalf("pool net outflow %d, expected ~%d", poolOut, swapMinusBuy)
	}

	dec, err := s.FetchDecodedFrame(ctx, client, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}
	if dec.Cursor == 0 {
		t.Fatal("expected bindings on tape")
	}
	if dec.IndexCount < 5 {
		t.Fatalf("indexCount = %d, want >= 5", dec.IndexCount)
	}
}

func accountLamportDeltaInTx(
	ctx context.Context,
	client *rpc.Client,
	sig solana.Signature,
	account solana.PublicKey,
) (net int64, fee uint64, err error) {
	tx, err := client.GetTransaction(ctx, sig, &rpc.GetTransactionOpts{
		MaxSupportedTransactionVersion: &[]uint64{0}[0],
	})
	if err != nil {
		return 0, 0, err
	}
	if tx == nil || tx.Meta == nil || tx.Transaction == nil {
		return 0, 0, errors.New("missing transaction meta")
	}
	parsedTx, err := tx.Transaction.GetTransaction()
	if err != nil {
		return 0, 0, err
	}
	if parsedTx == nil {
		return 0, 0, errors.New("parsed transaction is nil")
	}
	keys := parsedTx.Message.AccountKeys
	idx := -1
	for i, k := range keys {
		if k.Equals(account) {
			idx = i
			break
		}
	}
	if idx < 0 {
		return 0, 0, fmt.Errorf("account %s not in tx keys", account)
	}
	pre := tx.Meta.PreBalances[idx]
	post := tx.Meta.PostBalances[idx]
	return int64(post) - int64(pre), tx.Meta.Fee, nil
}
