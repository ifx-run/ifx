package integration

import (
	"context"
	"crypto/rand"
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/scratch"
	"github.com/ifx-run/ifx/go-sdk/structuredcpi"
)

const splMintSize = 82

// TestStructuredCpiInitializeMint2Localnet mirrors tests/ifx_structured_cpi_initialize_mint.ts.
func TestStructuredCpiInitializeMint2Localnet(t *testing.T) {
	ctx := context.Background()
	client := localRPC(t)
	wallet := loadWallet(t)
	payer := wallet.PublicKey()

	var frameID [32]byte
	if _, err := rand.Read(frameID[:]); err != nil {
		t.Fatal(err)
	}
	frameID[0] = 12 // stable prefix for logs; rest random avoids PDA collisions

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
	s := plan.Scratch

	if _, err := sendTx(ctx, t, client, wallet, "setup · create Frame PDA (structured CPI mint)", plan.IxCreate); err != nil {
		t.Fatalf("create frame: %v", err)
	}

	mintKp := solana.NewWallet()
	mint := mintKp.PublicKey()

	rent, err := client.GetMinimumBalanceForRentExemption(ctx, splMintSize, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}

	decimalsValue, err := s.LetEval(expr.U8(6))
	if err != nil {
		t.Fatal(err)
	}
	mintAuthorityValue, err := s.LetAccountKey(payer)
	if err != nil {
		t.Fatal(err)
	}

	initTemplate := token.NewInitializeMint2InstructionBuilder().
		SetMintAccount(mint).
		SetDecimals(0).
		SetMintAuthority(payer).
		SetFreezeAuthority(solana.PublicKey{}).
		Build()

	built, err := structuredcpi.StructuredCpi(initTemplate, structuredcpi.StructuredCpiPatch.TokenInitializeMint2(structuredcpi.InitializeMintArgs{
		Decimals:      structuredcpi.AsFrameValue(decimalsValue),
		MintAuthority: mintAuthorityValue,
		Freeze:        structuredcpi.FreezeNone(),
	}))
	if err != nil {
		t.Fatal(err)
	}
	cpiBuilt, err := built.Build(nil)
	if err != nil {
		t.Fatal(err)
	}
	cpiIx, err := s.IxCpi(cpiBuilt)
	if err != nil {
		t.Fatal(err)
	}

	letDecimalsIx, err := s.IxLet(decimalsValue)
	if err != nil {
		t.Fatal(err)
	}
	letAuthIx, err := s.IxLet(mintAuthorityValue)
	if err != nil {
		t.Fatal(err)
	}

	createMintIx := system.NewCreateAccountInstruction(
		rent,
		splMintSize,
		token.ProgramID,
		payer,
		mint,
	).Build()

	if _, err := sendTxSigners(
		ctx, t, client, wallet,
		"structured CPI · InitializeMint2 (Frame pubkey + u8)",
		[]*solana.Wallet{wallet, mintKp},
		s.IxReset(),
		letDecimalsIx,
		letAuthIx,
		createMintIx,
		cpiIx,
	); err != nil {
		t.Fatalf("business tx: %v", err)
	}

	mintInfo, err := client.GetAccountInfo(ctx, mint)
	if err != nil || mintInfo.Value == nil {
		t.Fatalf("mint account: %v", err)
	}
	if mintInfo.Value.Owner != token.ProgramID {
		t.Fatalf("mint owner %s", mintInfo.Value.Owner)
	}
	if len(mintInfo.Value.Data.GetBinary()) < 45 {
		t.Fatalf("mint data too short")
	}
	data := mintInfo.Value.Data.GetBinary()
	if data[44] != 6 {
		t.Fatalf("decimals = %d, want 6", data[44])
	}
}
