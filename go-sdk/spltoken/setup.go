package spltoken

import (
	"encoding/binary"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/programs/token"
)

const (
	// SPL Token-2022 extension / instruction tags (matches @solana/spl-token).
	tokenIxTransferFeeExtension         = 26
	transferFeeIxInitializeConfig       = 0
	transferFeeIxTransferCheckedWithFee = 1

	// MintLenWithTransferFeeConfig is mint account size with TransferFeeConfig extension
	// (matches @solana/spl-token getMintLen([TransferFeeConfig])).
	MintLenWithTransferFeeConfig = 278
	// TransferFeeBasisPointsDefault matches dust_destroy_token2022.ts (100 bps).
	TransferFeeBasisPointsDefault = 100
	// TransferFeeMaximumFeeDefault matches dust_destroy_token2022.ts.
	TransferFeeMaximumFeeDefault = 1_000_000
)

// FindAssociatedToken2022Address derives the ATA for Token-2022 mints.
func FindAssociatedToken2022Address(wallet, mint solana.PublicKey) (solana.PublicKey, uint8, error) {
	return solana.FindProgramAddress(
		[][]byte{wallet.Bytes(), Token2022ProgramID.Bytes(), mint.Bytes()},
		solana.SPLAssociatedTokenAccountProgramID,
	)
}

// CreateAssociatedTokenAccount2022 derives the ATA and build instruction.
func CreateAssociatedTokenAccount2022(payer, wallet, mint solana.PublicKey) (solana.PublicKey, solana.Instruction, error) {
	ata, _, err := FindAssociatedToken2022Address(wallet, mint)
	if err != nil {
		return solana.PublicKey{}, nil, err
	}
	return ata, CreateAssociatedTokenAccount2022Instruction(payer, wallet, mint, ata), nil
}

// CreateAssociatedTokenAccount2022Instruction creates a Token-2022 ATA.
func CreateAssociatedTokenAccount2022Instruction(payer, wallet, mint, ata solana.PublicKey) solana.Instruction {
	accounts := solana.AccountMetaSlice{
		solana.Meta(payer).SIGNER().WRITE(),
		solana.Meta(ata).WRITE(),
		solana.Meta(wallet),
		solana.Meta(mint),
		solana.Meta(system.ProgramID),
		solana.Meta(Token2022ProgramID),
	}
	return solana.NewInstruction(solana.SPLAssociatedTokenAccountProgramID, accounts, []byte{})
}

// InitializeTransferFeeConfigInstruction initializes mint TransferFee extension.
func InitializeTransferFeeConfigInstruction(
	mint, configAuthority, withdrawAuthority solana.PublicKey,
	basisPoints uint16,
	maximumFee uint64,
) solana.Instruction {
	data := make([]byte, 0, 78)
	data = append(data, tokenIxTransferFeeExtension, transferFeeIxInitializeConfig)
	data = appendPubkeyOption(data, configAuthority)
	data = appendPubkeyOption(data, withdrawAuthority)
	var bps [2]byte
	binary.LittleEndian.PutUint16(bps[:], basisPoints)
	data = append(data, bps[:]...)
	var maxFee [8]byte
	binary.LittleEndian.PutUint64(maxFee[:], maximumFee)
	data = append(data, maxFee[:]...)
	return solana.NewInstruction(Token2022ProgramID, solana.AccountMetaSlice{
		solana.Meta(mint).WRITE(),
	}, data)
}

func appendPubkeyOption(buf []byte, key solana.PublicKey) []byte {
	if key.IsZero() {
		return append(buf, 0)
	}
	buf = append(buf, 1)
	return append(buf, key.Bytes()...)
}

// InitializeMint2Instruction builds Token-2022 InitializeMint2.
func InitializeMint2Instruction(mint, mintAuthority solana.PublicKey, decimals uint8) (solana.Instruction, error) {
	inst, err := token.NewInitializeMint2InstructionBuilder().
		SetDecimals(decimals).
		SetMintAuthority(mintAuthority).
		SetMintAccount(mint).
		ValidateAndBuild()
	if err != nil {
		return nil, err
	}
	return wrapToken2022Instruction(inst)
}

// MintToInstruction builds Token-2022 MintTo.
func MintToInstruction(mint, destination, authority solana.PublicKey, authoritySigner bool, amount uint64) (solana.Instruction, error) {
	b := token.NewMintToInstructionBuilder().
		SetAmount(amount).
		SetMintAccount(mint).
		SetDestinationAccount(destination).
		SetAuthorityAccount(authority)
	if authoritySigner {
		b.GetAuthorityAccount().SIGNER()
	}
	inst, err := b.ValidateAndBuild()
	if err != nil {
		return nil, err
	}
	return wrapToken2022Instruction(inst)
}

// TransferCheckedWithFeeInstruction moves tokens and withholds fee on destination.
func TransferCheckedWithFeeInstruction(
	source, mint, destination, owner solana.PublicKey,
	ownerSigner bool,
	amount, fee uint64,
	decimals uint8,
) solana.Instruction {
	data := make([]byte, 19)
	data[0] = tokenIxTransferFeeExtension
	data[1] = transferFeeIxTransferCheckedWithFee
	binary.LittleEndian.PutUint64(data[2:], amount)
	data[10] = decimals
	binary.LittleEndian.PutUint64(data[11:], fee)
	ownerMeta := solana.Meta(owner)
	if ownerSigner {
		ownerMeta = ownerMeta.SIGNER()
	}
	return solana.NewInstruction(Token2022ProgramID, solana.AccountMetaSlice{
		solana.Meta(source).WRITE(),
		solana.Meta(mint),
		solana.Meta(destination).WRITE(),
		ownerMeta,
	}, data)
}

// CalculateTransferFee returns fee for pre-fee amount (100 bps, capped).
func CalculateTransferFee(preFeeAmount uint64) uint64 {
	fee := preFeeAmount * TransferFeeBasisPointsDefault / 10_000
	if fee > TransferFeeMaximumFeeDefault {
		return TransferFeeMaximumFeeDefault
	}
	return fee
}

func wrapToken2022Instruction(inst *token.Instruction) (solana.Instruction, error) {
	data, err := inst.Data()
	if err != nil {
		return nil, err
	}
	return solana.NewInstruction(Token2022ProgramID, inst.Accounts(), data), nil
}
