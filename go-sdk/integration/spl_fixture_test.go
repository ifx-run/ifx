package integration

import (
	"context"
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"
)

func findSplAta(owner, mint solana.PublicKey) (solana.PublicKey, uint8, error) {
	return solana.FindProgramAddress(
		[][]byte{
			owner.Bytes(),
			token.ProgramID.Bytes(),
			mint.Bytes(),
		},
		solana.SPLAssociatedTokenAccountProgramID,
	)
}

func createSplAtaIx(payer, owner, mint, ata solana.PublicKey) solana.Instruction {
	accounts := solana.AccountMetaSlice{
		solana.Meta(payer).SIGNER().WRITE(),
		solana.Meta(ata).WRITE(),
		solana.Meta(owner),
		solana.Meta(mint),
		solana.Meta(system.ProgramID),
		solana.Meta(token.ProgramID),
	}
	return solana.NewInstruction(solana.SPLAssociatedTokenAccountProgramID, accounts, []byte{})
}

func createSplMint(
	ctx context.Context,
	t *testing.T,
	client *rpc.Client,
	payer *solana.Wallet,
	mintAuthority solana.PublicKey,
	decimals uint8,
) (*solana.Wallet, solana.PublicKey) {
	t.Helper()
	mintKp := solana.NewWallet()
	mint := mintKp.PublicKey()
	rent, err := client.GetMinimumBalanceForRentExemption(ctx, splMintSize, rpc.CommitmentConfirmed)
	if err != nil {
		t.Fatal(err)
	}
	create := system.NewCreateAccountInstruction(rent, splMintSize, token.ProgramID, payer.PublicKey(), mint).Build()
	init, err := token.NewInitializeMint2InstructionBuilder().
		SetDecimals(decimals).
		SetMintAuthority(mintAuthority).
		SetMintAccount(mint).
		ValidateAndBuild()
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendTxSigners(ctx, t, client, payer, "setup · create SPL mint",
		[]*solana.Wallet{payer, mintKp}, create, init); err != nil {
		t.Fatalf("create mint: %v", err)
	}
	return mintKp, mint
}

func createSplAta(
	ctx context.Context,
	t *testing.T,
	client *rpc.Client,
	payer *solana.Wallet,
	owner, mint solana.PublicKey,
) solana.PublicKey {
	t.Helper()
	ata, _, err := findSplAta(owner, mint)
	if err != nil {
		t.Fatal(err)
	}
	ix := createSplAtaIx(payer.PublicKey(), owner, mint, ata)
	if _, err := sendTx(ctx, t, client, payer, "setup · create SPL ATA", ix); err != nil {
		t.Fatalf("create ata: %v", err)
	}
	return ata
}

func mintSplTo(
	ctx context.Context,
	t *testing.T,
	client *rpc.Client,
	payer *solana.Wallet,
	mint, dest, authority solana.PublicKey,
	authoritySigner bool,
	amount uint64,
) {
	t.Helper()
	b := token.NewMintToInstructionBuilder().
		SetAmount(amount).
		SetMintAccount(mint).
		SetDestinationAccount(dest).
		SetAuthorityAccount(authority)
	if authoritySigner {
		b.GetAuthorityAccount().SIGNER()
	}
	ix, err := b.ValidateAndBuild()
	if err != nil {
		t.Fatal(err)
	}
	signers := []*solana.Wallet{payer}
	if authoritySigner && authority == payer.PublicKey() {
		// payer already in signers
	} else if authoritySigner {
		// caller must pass authority wallet in sendTxSigners — use payer as authority in tests
	}
	if _, err := sendTxSigners(ctx, t, client, payer, "setup · mint_to", signers, ix); err != nil {
		t.Fatalf("mint_to: %v", err)
	}
}

func splTransferIx(
	source, dest, owner solana.PublicKey,
	amount uint64,
) (solana.Instruction, error) {
	return token.NewTransferInstruction(amount, source, dest, owner, []solana.PublicKey{}).ValidateAndBuild()
}
