// Package spltoken builds SPL Token / Token-2022 instructions with explicit program ids.
package spltoken

import (
	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/system"
)

// Token2022ProgramID is the SPL Token-2022 program.
var Token2022ProgramID = solana.MustPublicKeyFromBase58("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb")

const (
	ixBurnChecked                         = 15
	ixCloseAccount                        = 9
	ixTransferFeeExtension                = 26 // TokenInstruction.TransferFeeExtension
	ixHarvestWithheldTokensToMintTransfer = 4  // TransferFeeInstruction.HarvestWithheldTokensToMint
)

// BurnCheckedInstruction builds Token-2022 BurnChecked (amount/decimals patched by Ifx).
func BurnCheckedInstruction(source, mint, owner solana.PublicKey, ownerSigner bool) solana.Instruction {
	data := []byte{ixBurnChecked, 0, 0, 0, 0, 0, 0, 0, 0, 0}
	ownerMeta := solana.Meta(owner)
	if ownerSigner {
		ownerMeta = ownerMeta.SIGNER()
	}
	accounts := solana.AccountMetaSlice{
		solana.Meta(source).WRITE(),
		solana.Meta(mint).WRITE(),
		ownerMeta,
	}
	return solana.NewInstruction(Token2022ProgramID, accounts, data)
}

// CloseAccountInstruction closes a Token-2022 account.
func CloseAccountInstruction(account, destination, owner solana.PublicKey, ownerSigner bool) solana.Instruction {
	data := []byte{ixCloseAccount}
	ownerMeta := solana.Meta(owner)
	if ownerSigner {
		ownerMeta = ownerMeta.SIGNER()
	}
	accounts := solana.AccountMetaSlice{
		solana.Meta(account).WRITE(),
		solana.Meta(destination).WRITE(),
		ownerMeta,
	}
	return solana.NewInstruction(Token2022ProgramID, accounts, data)
}

// HarvestWithheldTokensToMintInstruction harvests transfer-fee withheld tokens.
func HarvestWithheldTokensToMintInstruction(mint solana.PublicKey, sources ...solana.PublicKey) solana.Instruction {
	data := []byte{ixTransferFeeExtension, ixHarvestWithheldTokensToMintTransfer}
	accounts := solana.AccountMetaSlice{solana.Meta(mint).WRITE()}
	for _, src := range sources {
		accounts = append(accounts, solana.Meta(src).WRITE())
	}
	return solana.NewInstruction(Token2022ProgramID, accounts, data)
}

// SystemProgramID re-exports system program for remaining metas.
var SystemProgramID = system.ProgramID
