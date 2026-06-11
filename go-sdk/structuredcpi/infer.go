package structuredcpi

import (
	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/ifx-run/ifx/go-sdk/constants"
)

// StakeProgramID is the native stake program.
var StakeProgramID = solana.MustPublicKeyFromBase58("Stake11111111111111111111111111111111111111")

// InferWireTag returns structured patch wire tag from an official instruction template.
func InferWireTag(programID solana.PublicKey, data []byte) (uint8, bool) {
	if len(data) == 0 {
		return 0, false
	}
	if programID.Equals(system.ProgramID) {
		if len(data) < 4 {
			return 0, false
		}
		disc := uint32(data[0]) | uint32(data[1])<<8 | uint32(data[2])<<16 | uint32(data[3])<<24
		switch disc {
		case 0:
			return constants.StructuredPatchSystemCreateAccount, true
		case 2:
			return constants.StructuredPatchSystemTransfer, true
		case 8:
			return constants.StructuredPatchSystemAllocate, true
		}
		return 0, false
	}
	if programID.Equals(StakeProgramID) {
		if len(data) < 4 {
			return 0, false
		}
		variant := uint32(data[0]) | uint32(data[1])<<8 | uint32(data[2])<<16 | uint32(data[3])<<24
		switch variant {
		case 2:
			return constants.StructuredPatchStakeDelegateStake, true
		case 3:
			return constants.StructuredPatchStakeSplit, true
		case 4:
			return constants.StructuredPatchStakeWithdraw, true
		case 5:
			return constants.StructuredPatchStakeDeactivate, true
		}
		return 0, false
	}

	tokenProg := token.ProgramID
	token2022 := solana.MustPublicKeyFromBase58("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb")
	if !programID.Equals(tokenProg) && !programID.Equals(token2022) {
		return 0, false
	}
	prefix2022 := programID.Equals(token2022)
	mapToken := func(classic, t2022 uint8) uint8 {
		if prefix2022 {
			return t2022
		}
		return classic
	}
	switch data[0] {
	case 0:
		return mapToken(constants.StructuredPatchTokenInitializeMint, constants.StructuredPatchToken2022InitializeMint), true
	case 2, 19:
		return mapToken(constants.StructuredPatchTokenInitializeMultisig, constants.StructuredPatchToken2022InitializeMultisig), true
	case 3:
		return mapToken(constants.StructuredPatchTokenTransfer, constants.StructuredPatchToken2022Transfer), true
	case 4:
		return mapToken(constants.StructuredPatchTokenApprove, constants.StructuredPatchToken2022Approve), true
	case 7:
		return mapToken(constants.StructuredPatchTokenMintTo, constants.StructuredPatchToken2022MintTo), true
	case 8:
		return mapToken(constants.StructuredPatchTokenBurn, constants.StructuredPatchToken2022Burn), true
	case 12:
		return mapToken(constants.StructuredPatchTokenTransferChecked, constants.StructuredPatchToken2022TransferChecked), true
	case 13:
		return mapToken(constants.StructuredPatchTokenApproveChecked, constants.StructuredPatchToken2022ApproveChecked), true
	case 14:
		return mapToken(constants.StructuredPatchTokenMintToChecked, constants.StructuredPatchToken2022MintToChecked), true
	case 15:
		return mapToken(constants.StructuredPatchTokenBurnChecked, constants.StructuredPatchToken2022BurnChecked), true
	case 20:
		return mapToken(constants.StructuredPatchTokenInitializeMint2, constants.StructuredPatchToken2022InitializeMint2), true
	case 23:
		return mapToken(constants.StructuredPatchTokenAmountToUiAmount, constants.StructuredPatchToken2022AmountToUiAmount), true
	case 26:
		if prefix2022 && len(data) >= 2 {
			switch data[1] {
			case 1:
				return constants.StructuredPatchToken2022TransferCheckedWithFee, true
			case 5:
				return constants.StructuredPatchToken2022SetTransferFee, true
			}
		}
	}
	return 0, false
}
