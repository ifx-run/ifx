package integration

import (
	"context"
	"crypto/rand"
	"strconv"
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/examples"
	"github.com/ifx-run/ifx/go-sdk/scratch"
)

const (
	poolTokenA = uint64(100_000_000)
	poolTokenB = uint64(50_000_000)
	userTokenA = uint64(10_000_000)
	amountIn   = uint64(1_000_000)
)

func TestPersonalAmmSwapLocalnet(t *testing.T) {
	ctx := context.Background()
	client := localRPC(t)
	wallet := loadWallet(t)
	payer := wallet.PublicKey()

	user := solana.NewWallet()
	pool := solana.NewWallet()
	if err := airdropLamports(ctx, t, client, user.PublicKey(), 1_000_000_000); err != nil {
		t.Fatal(err)
	}
	if err := airdropLamports(ctx, t, client, pool.PublicKey(), 1_000_000_000); err != nil {
		t.Fatal(err)
	}

	var frameID [32]byte
	if _, err := rand.Read(frameID[:]); err != nil {
		t.Fatal(err)
	}
	plan, err := scratch.PlanNewFrame(scratch.PlanNewFrameParams{
		Payer:     payer,
		FrameID:   frameID,
		Authority: payer,
		TapeLen:   512,
		ProgramID: constants.LocalnetProgramID,
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendTx(ctx, t, client, wallet, "setup · create Frame PDA (personal-amm)", plan.IxCreate); err != nil {
		t.Fatalf("create frame: %v", err)
	}

	_, mintA := createSplMint(ctx, t, client, wallet, payer, 6)
	_, mintB := createSplMint(ctx, t, client, wallet, payer, 6)

	userTokenAAta := createSplAta(ctx, t, client, wallet, user.PublicKey(), mintA)
	userTokenBAta := createSplAta(ctx, t, client, wallet, user.PublicKey(), mintB)
	poolTokenAAta := createSplAta(ctx, t, client, wallet, pool.PublicKey(), mintA)
	poolTokenBAta := createSplAta(ctx, t, client, wallet, pool.PublicKey(), mintB)

	mintSplTo(ctx, t, client, wallet, mintA, poolTokenAAta, payer, true, poolTokenA)
	mintSplTo(ctx, t, client, wallet, mintB, poolTokenBAta, payer, true, poolTokenB)
	mintSplTo(ctx, t, client, wallet, mintA, userTokenAAta, payer, true, userTokenA)

	expectedOut := examples.ComputeSwapOutput(poolTokenA, poolTokenB, amountIn, examples.PersonalAmmDefaultFeeBps)
	minOut := expectedOut
	if expectedOut > 0 {
		minOut = expectedOut - 1
	}

	s := plan.Scratch
	swapPlan, err := examples.PlanPersonalAmmSwapInstructions(s, examples.PersonalAmmAccounts{
		User:          user.PublicKey(),
		Pool:          pool.PublicKey(),
		UserTokenAAta: userTokenAAta,
		PoolTokenAAta: poolTokenAAta,
		UserTokenBAta: userTokenBAta,
		PoolTokenBAta: poolTokenBAta,
	}, examples.PersonalAmmSwapParams{
		AmountIn: amountIn,
		MinOut:   minOut,
	})
	if err != nil {
		t.Fatal(err)
	}

	if _, err := sendTxSigners(ctx, t, client, wallet,
		"go-sdk · personal-amm swap A→B",
		[]*solana.Wallet{wallet, pool, user},
		swapPlan.Instructions...,
	); err != nil {
		t.Fatalf("personal amm tx: %v", err)
	}

	bBal, err := client.GetTokenAccountBalance(ctx, userTokenBAta, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}
	if bBal.Value.Amount != strconv.FormatUint(expectedOut, 10) {
		t.Fatalf("user B balance = %s, want %d", bBal.Value.Amount, expectedOut)
	}
}
