package integration

import (
	"context"
	"crypto/rand"
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/examples"
	"github.com/ifx-run/ifx/go-sdk/scratch"
	"github.com/ifx-run/ifx/go-sdk/spltoken"
)

const (
	dustBalanceRaw          = 500
	withheldSeedTransferRaw = 200
	dustFixtureDecimals     = 6
)

type dustDestroySetup struct {
	Plan  scratch.PlanNewFrameResult
	Owner *solana.Wallet
	Accts examples.DustDestroyAccounts
}

func setupDustDestroyFixture(
	ctx context.Context,
	t *testing.T,
	client *rpc.Client,
	payer *solana.Wallet,
) dustDestroySetup {
	t.Helper()

	owner := solana.NewWallet()
	rentDestination := solana.NewWallet()
	if err := airdropLamports(ctx, t, client, owner.PublicKey(), 1_000_000_000); err != nil {
		t.Fatalf("airdrop owner: %v", err)
	}
	if err := airdropLamports(ctx, t, client, rentDestination.PublicKey(), 100_000_000); err != nil {
		t.Fatalf("airdrop rent destination: %v", err)
	}

	mintKp := solana.NewWallet()
	mint := mintKp.PublicKey()
	rent, err := client.GetMinimumBalanceForRentExemption(ctx, spltoken.MintLenWithTransferFeeConfig, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}

	initFee := spltoken.InitializeTransferFeeConfigInstruction(
		mint, payer.PublicKey(), payer.PublicKey(),
		spltoken.TransferFeeBasisPointsDefault,
		spltoken.TransferFeeMaximumFeeDefault,
	)
	initMint, err := spltoken.InitializeMint2Instruction(mint, payer.PublicKey(), dustFixtureDecimals)
	if err != nil {
		t.Fatal(err)
	}
	createMintIx := system.NewCreateAccountInstruction(
		rent,
		spltoken.MintLenWithTransferFeeConfig,
		spltoken.Token2022ProgramID,
		payer.PublicKey(),
		mint,
	).Build()
	if _, err := sendTxSigners(ctx, t, client, payer, "setup · Token-2022 transfer-fee mint",
		[]*solana.Wallet{payer, mintKp},
		createMintIx, initFee, initMint,
	); err != nil {
		t.Fatalf("create transfer-fee mint: %v", err)
	}

	ownerATA, createOwnerATA, err := spltoken.CreateAssociatedTokenAccount2022(
		payer.PublicKey(), owner.PublicKey(), mint,
	)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendTx(ctx, t, client, payer, "setup · dust owner ATA", createOwnerATA); err != nil {
		t.Fatalf("create owner ATA: %v", err)
	}
	mintDust, err := spltoken.MintToInstruction(mint, ownerATA, payer.PublicKey(), true, dustBalanceRaw)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendTx(ctx, t, client, payer, "setup · mint dust balance", mintDust); err != nil {
		t.Fatalf("mint dust: %v", err)
	}

	seedWithheldOnATA(ctx, t, client, payer, mint, ownerATA)

	var frameID [32]byte
	if _, err := rand.Read(frameID[:]); err != nil {
		t.Fatal(err)
	}
	plan, err := scratch.PlanNewFrame(scratch.PlanNewFrameParams{
		Payer:     payer.PublicKey(),
		FrameID:   frameID,
		Authority: payer.PublicKey(),
		TapeLen:   512,
		ProgramID: constants.LocalnetProgramID,
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendTx(ctx, t, client, payer, "setup · create Frame PDA (dust)", plan.IxCreate); err != nil {
		t.Fatalf("create frame: %v", err)
	}

	return dustDestroySetup{
		Plan:  plan,
		Owner: owner,
		Accts: examples.DustDestroyAccounts{
			Mint:            mint,
			TokenAccount:    ownerATA,
			Owner:           owner.PublicKey(),
			OwnerSigner:     true,
			RentDestination: rentDestination.PublicKey(),
		},
	}
}

func seedWithheldOnATA(
	ctx context.Context,
	t *testing.T,
	client *rpc.Client,
	payer *solana.Wallet,
	mint, destination solana.PublicKey,
) {
	t.Helper()

	preFee := uint64(withheldSeedTransferRaw)
	fee := spltoken.CalculateTransferFee(preFee)

	source, createSrc, err := spltoken.CreateAssociatedTokenAccount2022(
		payer.PublicKey(), payer.PublicKey(), mint,
	)
	if err != nil {
		t.Fatal(err)
	}
	sourceInfo, err := client.GetAccountInfo(ctx, source)
	if err != nil || sourceInfo == nil || sourceInfo.Value == nil {
		if _, err := sendTx(ctx, t, client, payer, "setup · payer source ATA", createSrc); err != nil {
			t.Fatalf("create source ATA: %v", err)
		}
	}

	fundAmount := preFee + fee + 10_000
	mintFund, err := spltoken.MintToInstruction(mint, source, payer.PublicKey(), true, fundAmount)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendTx(ctx, t, client, payer, "setup · fund source ATA", mintFund); err != nil {
		t.Fatalf("fund source: %v", err)
	}

	xfer := spltoken.TransferCheckedWithFeeInstruction(
		source, mint, destination, payer.PublicKey(), true,
		preFee, fee, dustFixtureDecimals,
	)
	if _, err := sendTx(ctx, t, client, payer, "setup · seed withheld on dust ATA", xfer); err != nil {
		t.Fatalf("transfer with fee: %v", err)
	}
}
