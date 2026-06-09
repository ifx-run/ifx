package structuredcpi

import (
	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/typed"
)

// AsFrameValue converts a planned binding to wire Value index.
func AsFrameValue(v typed.ScratchValue) FrameValue {
	return FrameValue{Index: v.Index}
}

// AsFrameValueIndex accepts ScratchValue or raw index.
func AsFrameValueIndex(index uint8) FrameValue {
	return FrameValue{Index: index}
}

// StructuredCpiPatch builds structured patch payloads (mirrors TS structuredCpiPatch).
var StructuredCpiPatch = structuredCpiPatch{}

type structuredCpiPatch struct{}

func (structuredCpiPatch) SystemTransfer(lamports FrameValue) PatchInput {
	return PatchInput{WireTag: constants.StructuredPatchSystemTransfer, Payload: lamports}
}

func (structuredCpiPatch) SystemAllocate(space FrameValue) PatchInput {
	return PatchInput{WireTag: constants.StructuredPatchSystemAllocate, Payload: space}
}

type lamportsSpacePatch struct{}

var systemCreateAccount = lamportsSpacePatch{}

func (lamportsSpacePatch) LamportsOnly(lamports FrameValue, space uint64) PatchInput {
	return PatchInput{
		WireTag: constants.StructuredPatchSystemCreateAccount,
		Payload: LamportsSpacePatch{Tag: 0, Lamports: lamports, SpaceLit: space},
	}
}

func (lamportsSpacePatch) SpaceOnly(lamports uint64, space FrameValue) PatchInput {
	return PatchInput{
		WireTag: constants.StructuredPatchSystemCreateAccount,
		Payload: LamportsSpacePatch{Tag: 1, LamportsLit: lamports, Space: space},
	}
}

func (lamportsSpacePatch) Both(lamports, space FrameValue) PatchInput {
	return PatchInput{
		WireTag: constants.StructuredPatchSystemCreateAccount,
		Payload: LamportsSpacePatch{Tag: 2, Lamports: lamports, Space: space},
	}
}

func (structuredCpiPatch) SystemCreateAccount() lamportsSpacePatch {
	return systemCreateAccount
}

func singleAmountPatch(tag uint8, amount FrameValue) PatchInput {
	return PatchInput{WireTag: tag, Payload: amount}
}

func (structuredCpiPatch) TokenTransfer(amount FrameValue) PatchInput {
	return singleAmountPatch(constants.StructuredPatchTokenTransfer, amount)
}

func (structuredCpiPatch) TokenApprove(amount FrameValue) PatchInput {
	return singleAmountPatch(constants.StructuredPatchTokenApprove, amount)
}

func (structuredCpiPatch) TokenMintTo(amount FrameValue) PatchInput {
	return singleAmountPatch(constants.StructuredPatchTokenMintTo, amount)
}

func (structuredCpiPatch) TokenBurn(amount FrameValue) PatchInput {
	return singleAmountPatch(constants.StructuredPatchTokenBurn, amount)
}

func (structuredCpiPatch) TokenAmountToUiAmount(amount FrameValue) PatchInput {
	return singleAmountPatch(constants.StructuredPatchTokenAmountToUiAmount, amount)
}

func (structuredCpiPatch) TokenInitializeMultisig(m FrameValue) PatchInput {
	return singleAmountPatch(constants.StructuredPatchTokenInitializeMultisig, m)
}

func (structuredCpiPatch) Token2022Transfer(amount FrameValue) PatchInput {
	return singleAmountPatch(constants.StructuredPatchToken2022Transfer, amount)
}

func (structuredCpiPatch) Token2022Approve(amount FrameValue) PatchInput {
	return singleAmountPatch(constants.StructuredPatchToken2022Approve, amount)
}

func (structuredCpiPatch) Token2022MintTo(amount FrameValue) PatchInput {
	return singleAmountPatch(constants.StructuredPatchToken2022MintTo, amount)
}

func (structuredCpiPatch) Token2022Burn(amount FrameValue) PatchInput {
	return singleAmountPatch(constants.StructuredPatchToken2022Burn, amount)
}

func (structuredCpiPatch) Token2022AmountToUiAmount(amount FrameValue) PatchInput {
	return singleAmountPatch(constants.StructuredPatchToken2022AmountToUiAmount, amount)
}

func (structuredCpiPatch) Token2022InitializeMultisig(m FrameValue) PatchInput {
	return singleAmountPatch(constants.StructuredPatchToken2022InitializeMultisig, m)
}

type amountDecimalsBuilder struct {
	wireTag uint8
}

func amountDecimalsPatch(tag uint8, p AmountDecimalsPatch) PatchInput {
	return PatchInput{WireTag: tag, Payload: p}
}

func (a amountDecimalsBuilder) AmountOnly(amount FrameValue, decimals uint8) PatchInput {
	return amountDecimalsPatch(a.wireTag, AmountDecimalsPatch{
		Tag: amountDecimalsAmountOnly, Amount: amount, DecLit: decimals,
	})
}

func (a amountDecimalsBuilder) Both(amount, decimals FrameValue) PatchInput {
	return amountDecimalsPatch(a.wireTag, AmountDecimalsPatch{
		Tag: amountDecimalsBoth, Amount: amount, Decimals: decimals,
	})
}

func (a amountDecimalsBuilder) DecimalsOnly(amount uint64, decimals FrameValue) PatchInput {
	return amountDecimalsPatch(a.wireTag, AmountDecimalsPatch{
		Tag: amountDecimalsDecimalsOnly, AmountLit: amount, Decimals: decimals,
	})
}

func (structuredCpiPatch) TokenTransferChecked() amountDecimalsBuilder {
	return amountDecimalsBuilder{wireTag: constants.StructuredPatchTokenTransferChecked}
}

func (structuredCpiPatch) TokenApproveChecked() amountDecimalsBuilder {
	return amountDecimalsBuilder{wireTag: constants.StructuredPatchTokenApproveChecked}
}

func (structuredCpiPatch) TokenMintToChecked() amountDecimalsBuilder {
	return amountDecimalsBuilder{wireTag: constants.StructuredPatchTokenMintToChecked}
}

func (structuredCpiPatch) TokenBurnChecked() amountDecimalsBuilder {
	return amountDecimalsBuilder{wireTag: constants.StructuredPatchTokenBurnChecked}
}

func (structuredCpiPatch) Token2022TransferChecked() amountDecimalsBuilder {
	return amountDecimalsBuilder{wireTag: constants.StructuredPatchToken2022TransferChecked}
}

func (structuredCpiPatch) Token2022ApproveChecked() amountDecimalsBuilder {
	return amountDecimalsBuilder{wireTag: constants.StructuredPatchToken2022ApproveChecked}
}

func (structuredCpiPatch) Token2022MintToChecked() amountDecimalsBuilder {
	return amountDecimalsBuilder{wireTag: constants.StructuredPatchToken2022MintToChecked}
}

func (structuredCpiPatch) Token2022BurnChecked() amountDecimalsBuilder {
	return amountDecimalsBuilder{wireTag: constants.StructuredPatchToken2022BurnChecked}
}

type amountDecimalsFeeBuilder struct{}

var token2022TransferCheckedWithFee = amountDecimalsFeeBuilder{}

func (amountDecimalsFeeBuilder) AmountOnly(amount FrameValue, decimals uint8, fee uint64) PatchInput {
	return PatchInput{
		WireTag: constants.StructuredPatchToken2022TransferCheckedWithFee,
		Payload: AmountDecimalsFeePatch{
			Tag: amountDecimalsFeeAmountOnly, Amount: amount, DecLit: decimals, FeeLit: fee,
		},
	}
}

func (amountDecimalsFeeBuilder) DecimalsOnly(amount uint64, decimals FrameValue, fee uint64) PatchInput {
	return PatchInput{
		WireTag: constants.StructuredPatchToken2022TransferCheckedWithFee,
		Payload: AmountDecimalsFeePatch{
			Tag: amountDecimalsFeeDecimalsOnly, AmountLit: amount, Decimals: decimals, FeeLit: fee,
		},
	}
}

func (amountDecimalsFeeBuilder) FeeOnly(amount uint64, decimals uint8, fee FrameValue) PatchInput {
	return PatchInput{
		WireTag: constants.StructuredPatchToken2022TransferCheckedWithFee,
		Payload: AmountDecimalsFeePatch{
			Tag: amountDecimalsFeeFeeOnly, AmountLit: amount, DecLit: decimals, Fee: fee,
		},
	}
}

func (amountDecimalsFeeBuilder) AmountDecimals(amount, decimals FrameValue, fee uint64) PatchInput {
	return PatchInput{
		WireTag: constants.StructuredPatchToken2022TransferCheckedWithFee,
		Payload: AmountDecimalsFeePatch{
			Tag: amountDecimalsFeeAmountDecimals, Amount: amount, Decimals: decimals, FeeLit: fee,
		},
	}
}

func (amountDecimalsFeeBuilder) AmountFee(amount FrameValue, decimals uint8, fee FrameValue) PatchInput {
	return PatchInput{
		WireTag: constants.StructuredPatchToken2022TransferCheckedWithFee,
		Payload: AmountDecimalsFeePatch{
			Tag: amountDecimalsFeeAmountFee, Amount: amount, DecLit: decimals, Fee: fee,
		},
	}
}

func (amountDecimalsFeeBuilder) DecimalsFee(amount uint64, decimals, fee FrameValue) PatchInput {
	return PatchInput{
		WireTag: constants.StructuredPatchToken2022TransferCheckedWithFee,
		Payload: AmountDecimalsFeePatch{
			Tag: amountDecimalsFeeDecimalsFee, AmountLit: amount, Decimals: decimals, Fee: fee,
		},
	}
}

func (amountDecimalsFeeBuilder) AllFromFrame(amount, decimals, fee FrameValue) PatchInput {
	return PatchInput{
		WireTag: constants.StructuredPatchToken2022TransferCheckedWithFee,
		Payload: AmountDecimalsFeePatch{
			Tag: amountDecimalsFeeAllFromFrame, Amount: amount, Decimals: decimals, Fee: fee,
		},
	}
}

func (structuredCpiPatch) Token2022TransferCheckedWithFee() amountDecimalsFeeBuilder {
	return token2022TransferCheckedWithFee
}

type setTransferFeeBuilder struct{}

var token2022SetTransferFee = setTransferFeeBuilder{}

func (setTransferFeeBuilder) BpsOnly(basisPoints FrameValue, maximumFee uint64) PatchInput {
	return PatchInput{
		WireTag: constants.StructuredPatchToken2022SetTransferFee,
		Payload: SetTransferFeePatch{
			Tag: setTransferFeeBpsOnly, BasisPoints: basisPoints, MaxFeeLit: maximumFee,
		},
	}
}

func (setTransferFeeBuilder) MaxOnly(basisPoints uint16, maximumFee FrameValue) PatchInput {
	return PatchInput{
		WireTag: constants.StructuredPatchToken2022SetTransferFee,
		Payload: SetTransferFeePatch{
			Tag: setTransferFeeMaxOnly, BpsLit: basisPoints, MaximumFee: maximumFee,
		},
	}
}

func (setTransferFeeBuilder) Both(basisPoints, maximumFee FrameValue) PatchInput {
	return PatchInput{
		WireTag: constants.StructuredPatchToken2022SetTransferFee,
		Payload: SetTransferFeePatch{
			Tag: setTransferFeeBoth, BasisPoints: basisPoints, MaximumFee: maximumFee,
		},
	}
}

func (structuredCpiPatch) Token2022SetTransferFee() setTransferFeeBuilder {
	return token2022SetTransferFee
}

// InitializeMintArgs configures InitializeMint-family patches.
type InitializeMintArgs struct {
	Decimals      FrameValue
	MintAuthority interface{} // FrameValue or [32]byte or solana.PublicKey
	Freeze        FreezeAuthPatch
}

func buildInitializeMintPatch(args InitializeMintArgs) InitializeMintPatch {
	auth := pubkeyValueFromInput(args.MintAuthority)
	freeze := args.Freeze
	if !freeze.None && freeze.FromFrame == nil && freeze.Literal == nil {
		freeze.None = true
	}
	return InitializeMintPatch{
		Decimals:      args.Decimals,
		MintAuthority: auth,
		Freeze:        freeze,
	}
}

func pubkeyValueFromInput(v interface{}) PubkeyValue {
	switch x := v.(type) {
	case PubkeyValue:
		return x
	case FrameValue:
		return PubkeyValue{FromFrame: &x}
	case typed.ScratchValue:
		fv := AsFrameValue(x)
		return PubkeyValue{FromFrame: &fv}
	case [32]byte:
		b := x
		return PubkeyValue{Literal: &b}
	case solana.PublicKey:
		var b [32]byte
		copy(b[:], x.Bytes())
		return PubkeyValue{Literal: &b}
	default:
		panic("mintAuthority must be FrameValue, ScratchValue, solana.PublicKey, or [32]byte")
	}
}

func initializeMintPatch(wireTag uint8, args InitializeMintArgs) PatchInput {
	return PatchInput{WireTag: wireTag, Payload: buildInitializeMintPatch(args)}
}

func (structuredCpiPatch) TokenInitializeMint(args InitializeMintArgs) PatchInput {
	return initializeMintPatch(constants.StructuredPatchTokenInitializeMint, args)
}

func (structuredCpiPatch) TokenInitializeMint2(args InitializeMintArgs) PatchInput {
	return initializeMintPatch(constants.StructuredPatchTokenInitializeMint2, args)
}

func (structuredCpiPatch) Token2022InitializeMint(args InitializeMintArgs) PatchInput {
	return initializeMintPatch(constants.StructuredPatchToken2022InitializeMint, args)
}

func (structuredCpiPatch) Token2022InitializeMint2(args InitializeMintArgs) PatchInput {
	return initializeMintPatch(constants.StructuredPatchToken2022InitializeMint2, args)
}

// FreezeNone is no freeze authority on InitializeMint-family ixs.
func FreezeNone() FreezeAuthPatch {
	return FreezeAuthPatch{None: true}
}

// TransferCheckedAmountOnly is a deprecated alias — use StructuredCpiPatch.TokenTransferChecked().AmountOnly.
func TransferCheckedAmountOnly(amount FrameValue, decimals uint8) PatchInput {
	return StructuredCpiPatch.TokenTransferChecked().AmountOnly(amount, decimals)
}

// InitializeMint2Patch is a deprecated alias — use StructuredCpiPatch.TokenInitializeMint2.
func InitializeMint2Patch(decimals FrameValue, mintAuthority PubkeyValue, freeze FreezeAuthPatch) PatchInput {
	return StructuredCpiPatch.TokenInitializeMint2(InitializeMintArgs{
		Decimals:      decimals,
		MintAuthority: mintAuthority,
		Freeze:        freeze,
	})
}