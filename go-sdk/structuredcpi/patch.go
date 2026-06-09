// Package structuredcpi builds Structured CPI wire steps (Cpi tag 2).
package structuredcpi

import (
	"fmt"

	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/wire"
)

// FrameValue is a binding index on the frame tape.
type FrameValue struct {
	Index uint8
}

// PatchInput is wire tag + typed payload for structured CPI (mirrors TS StructuredCpiPatch).
type PatchInput struct {
	WireTag uint8
	Payload interface{}
}

// Patch is encoded structured patch bytes (low-level).
type Patch struct {
	WireTag uint8
	Payload []byte
}

const (
	amountDecimalsAmountOnly = iota
	amountDecimalsBoth
	amountDecimalsDecimalsOnly
)

const (
	pubkeyValueFromFrame = iota
	pubkeyValueLiteral
)

const (
	freezeAuthNone = iota
	freezeAuthSomeValue
	freezeAuthSomeLiteral
)

const (
	amountDecimalsFeeAmountOnly = iota
	amountDecimalsFeeDecimalsOnly
	amountDecimalsFeeFeeOnly
	amountDecimalsFeeAmountDecimals
	amountDecimalsFeeAmountFee
	amountDecimalsFeeDecimalsFee
	amountDecimalsFeeAllFromFrame
)

const (
	setTransferFeeBpsOnly = iota
	setTransferFeeMaxOnly
	setTransferFeeBoth
)

// AmountDecimalsFeePatch encodes Token-2022 TransferCheckedWithFee layouts.
type AmountDecimalsFeePatch struct {
	Tag       uint8
	Amount    FrameValue
	Decimals  FrameValue
	Fee       FrameValue
	AmountLit uint64
	DecLit    uint8
	FeeLit    uint64
}

// SetTransferFeePatch encodes Token-2022 SetTransferFee layouts.
type SetTransferFeePatch struct {
	Tag        uint8
	BasisPoints FrameValue
	MaximumFee  FrameValue
	BpsLit      uint16
	MaxFeeLit   uint64
}

// AmountDecimalsPatch encodes checked-token amount+decimals layouts.
type AmountDecimalsPatch struct {
	Tag      uint8
	Amount   FrameValue
	Decimals FrameValue
	AmountLit uint64
	DecLit    uint8
}

// PubkeyValue is a Frame or literal pubkey for InitializeMint patches.
type PubkeyValue struct {
	FromFrame *FrameValue
	Literal   *[32]byte
}

// FreezeAuthPatch is optional freeze authority on InitializeMint-family ixs.
type FreezeAuthPatch struct {
	None       bool
	FromFrame  *FrameValue
	Literal    *[32]byte
}

// InitializeMintPatch is the nested payload for InitializeMint* variants.
type InitializeMintPatch struct {
	Decimals      FrameValue
	MintAuthority PubkeyValue
	Freeze        FreezeAuthPatch
}

func writeValueIndex(buf []byte, v FrameValue) []byte {
	return append(buf, v.Index)
}

func writeSingleValue(v FrameValue) []byte {
	return []byte{0, v.Index}
}

func encodeAmountDecimalsFee(p AmountDecimalsFeePatch) ([]byte, error) {
	switch p.Tag {
	case amountDecimalsFeeAmountOnly:
		out := []byte{amountDecimalsFeeAmountOnly, p.Amount.Index, p.DecLit}
		return wire.AppendU64LE(out, p.FeeLit), nil
	case amountDecimalsFeeDecimalsOnly:
		out := wire.AppendU64LE([]byte{amountDecimalsFeeDecimalsOnly}, p.AmountLit)
		out = append(out, p.Decimals.Index)
		return wire.AppendU64LE(out, p.FeeLit), nil
	case amountDecimalsFeeFeeOnly:
		out := wire.AppendU64LE([]byte{amountDecimalsFeeFeeOnly}, p.AmountLit)
		out = append(out, p.DecLit)
		return append(out, p.Fee.Index), nil
	case amountDecimalsFeeAmountDecimals:
		out := []byte{amountDecimalsFeeAmountDecimals, p.Amount.Index, p.Decimals.Index}
		return wire.AppendU64LE(out, p.FeeLit), nil
	case amountDecimalsFeeAmountFee:
		out := []byte{amountDecimalsFeeAmountFee, p.Amount.Index, p.DecLit}
		return append(out, p.Fee.Index), nil
	case amountDecimalsFeeDecimalsFee:
		out := wire.AppendU64LE([]byte{amountDecimalsFeeDecimalsFee}, p.AmountLit)
		out = append(out, p.Decimals.Index)
		return append(out, p.Fee.Index), nil
	case amountDecimalsFeeAllFromFrame:
		return []byte{amountDecimalsFeeAllFromFrame, p.Amount.Index, p.Decimals.Index, p.Fee.Index}, nil
	default:
		return nil, fmt.Errorf("unknown AmountDecimalsFeePatch tag %d", p.Tag)
	}
}

func encodeSetTransferFee(p SetTransferFeePatch) ([]byte, error) {
	switch p.Tag {
	case setTransferFeeBpsOnly:
		out := []byte{setTransferFeeBpsOnly, p.BasisPoints.Index}
		return wire.AppendU64LE(out, p.MaxFeeLit), nil
	case setTransferFeeMaxOnly:
		out, err := wire.AppendU16LE([]byte{setTransferFeeMaxOnly}, p.BpsLit)
		if err != nil {
			return nil, err
		}
		return append(out, p.MaximumFee.Index), nil
	case setTransferFeeBoth:
		return []byte{setTransferFeeBoth, p.BasisPoints.Index, p.MaximumFee.Index}, nil
	default:
		return nil, fmt.Errorf("unknown SetTransferFeePatch tag %d", p.Tag)
	}
}

func encodeAmountDecimals(p AmountDecimalsPatch) ([]byte, error) {
	switch p.Tag {
	case amountDecimalsAmountOnly:
		return []byte{amountDecimalsAmountOnly, p.Amount.Index, p.DecLit}, nil
	case amountDecimalsBoth:
		return []byte{amountDecimalsBoth, p.Amount.Index, p.Decimals.Index}, nil
	case amountDecimalsDecimalsOnly:
		out := []byte{amountDecimalsDecimalsOnly}
		out = wire.AppendU64LE(out, p.AmountLit)
		out = append(out, p.Decimals.Index)
		return out, nil
	default:
		return nil, fmt.Errorf("unknown AmountDecimalsPatch tag %d", p.Tag)
	}
}

func encodePubkeyValue(slot PubkeyValue) ([]byte, error) {
	if slot.FromFrame != nil {
		return []byte{pubkeyValueFromFrame, slot.FromFrame.Index}, nil
	}
	if slot.Literal != nil {
		out := []byte{pubkeyValueLiteral}
		return append(out, slot.Literal[:]...), nil
	}
	return nil, fmt.Errorf("PubkeyValue requires FromFrame or Literal")
}

func encodeFreezeAuth(f FreezeAuthPatch) ([]byte, error) {
	if f.None {
		return []byte{freezeAuthNone}, nil
	}
	if f.FromFrame != nil {
		return []byte{freezeAuthSomeValue, f.FromFrame.Index}, nil
	}
	if f.Literal != nil {
		out := []byte{freezeAuthSomeLiteral}
		return append(out, f.Literal[:]...), nil
	}
	return nil, fmt.Errorf("FreezeAuthPatch requires None, FromFrame, or Literal")
}

// EncodeInitializeMintPatch serializes InitializeMint-family nested payload.
func EncodeInitializeMintPatch(p InitializeMintPatch) ([]byte, error) {
	out := writeValueIndex(nil, p.Decimals)
	auth, err := encodePubkeyValue(p.MintAuthority)
	if err != nil {
		return nil, err
	}
	out = append(out, auth...)
	freeze, err := encodeFreezeAuth(p.Freeze)
	if err != nil {
		return nil, err
	}
	return append(out, freeze...), nil
}

// EncodeAmountDecimalsPatch serializes AmountDecimalsPatch.
func EncodeAmountDecimalsPatch(p AmountDecimalsPatch) ([]byte, error) {
	return encodeAmountDecimals(p)
}

// EncodeSingleValuePayload is the common `[0][index]` slot layout.
func EncodeSingleValuePayload(v FrameValue) []byte {
	return writeSingleValue(v)
}

// EncodePatchPayload encodes nested payload for a structured patch wire tag.
func EncodePatchPayload(wireTag uint8, payload interface{}) ([]byte, error) {
	switch wireTag {
	case constants.StructuredPatchSystemCreateAccount:
		p, ok := payload.(LamportsSpacePatch)
		if !ok {
			return nil, fmt.Errorf("patch tag %d expects LamportsSpacePatch", wireTag)
		}
		return EncodeLamportsSpacePatch(p)
	case constants.StructuredPatchSystemTransfer,
		constants.StructuredPatchSystemAllocate,
		constants.StructuredPatchTokenTransfer,
		constants.StructuredPatchTokenApprove,
		constants.StructuredPatchTokenMintTo,
		constants.StructuredPatchTokenBurn,
		constants.StructuredPatchTokenAmountToUiAmount,
		constants.StructuredPatchTokenInitializeMultisig,
		constants.StructuredPatchToken2022Transfer,
		constants.StructuredPatchToken2022Approve,
		constants.StructuredPatchToken2022MintTo,
		constants.StructuredPatchToken2022Burn,
		constants.StructuredPatchToken2022AmountToUiAmount,
		constants.StructuredPatchToken2022InitializeMultisig:
		v, ok := payload.(FrameValue)
		if !ok {
			return nil, fmt.Errorf("patch tag %d expects FrameValue", wireTag)
		}
		return EncodeSingleValuePayload(v), nil
	case constants.StructuredPatchTokenTransferChecked,
		constants.StructuredPatchTokenApproveChecked,
		constants.StructuredPatchTokenMintToChecked,
		constants.StructuredPatchTokenBurnChecked,
		constants.StructuredPatchToken2022TransferChecked,
		constants.StructuredPatchToken2022ApproveChecked,
		constants.StructuredPatchToken2022MintToChecked,
		constants.StructuredPatchToken2022BurnChecked:
		p, ok := payload.(AmountDecimalsPatch)
		if !ok {
			return nil, fmt.Errorf("patch tag %d expects AmountDecimalsPatch", wireTag)
		}
		return encodeAmountDecimals(p)
	case constants.StructuredPatchTokenInitializeMint,
		constants.StructuredPatchTokenInitializeMint2,
		constants.StructuredPatchToken2022InitializeMint,
		constants.StructuredPatchToken2022InitializeMint2:
		p, ok := payload.(InitializeMintPatch)
		if !ok {
			return nil, fmt.Errorf("patch tag %d expects InitializeMintPatch", wireTag)
		}
		return EncodeInitializeMintPatch(p)
	case constants.StructuredPatchToken2022TransferCheckedWithFee:
		p, ok := payload.(AmountDecimalsFeePatch)
		if !ok {
			return nil, fmt.Errorf("patch tag %d expects AmountDecimalsFeePatch", wireTag)
		}
		return encodeAmountDecimalsFee(p)
	case constants.StructuredPatchToken2022SetTransferFee:
		p, ok := payload.(SetTransferFeePatch)
		if !ok {
			return nil, fmt.Errorf("patch tag %d expects SetTransferFeePatch", wireTag)
		}
		return encodeSetTransferFee(p)
	default:
		return nil, fmt.Errorf("unsupported structured patch wire tag %d", wireTag)
	}
}

// EncodeStructuredCpiStep writes `[2][patch_tag][accounts_start][accounts_len][payload…]`.
func EncodeStructuredCpiStep(wireTag uint8, accountsStart, accountsLen uint8, payload interface{}) ([]byte, error) {
	body, err := EncodePatchPayload(wireTag, payload)
	if err != nil {
		return nil, err
	}
	out := []byte{constants.CpiWireStructured, wireTag, accountsStart, accountsLen}
	return append(out, body...), nil
}

// LamportsSpacePatch for system create_account (subset used in tests).
type LamportsSpacePatch struct {
	Tag        uint8
	Lamports   FrameValue
	Space      FrameValue
	LamportsLit uint64
	SpaceLit    uint64
}

func EncodeLamportsSpacePatch(p LamportsSpacePatch) ([]byte, error) {
	switch p.Tag {
	case 0:
		out := []byte{0, p.Lamports.Index}
		return wire.AppendU64LE(out, p.SpaceLit), nil
	case 1:
		out := wire.AppendU64LE([]byte{1}, p.LamportsLit)
		return append(out, p.Space.Index), nil
	case 2:
		return []byte{2, p.Lamports.Index, p.Space.Index}, nil
	default:
		return nil, fmt.Errorf("unknown LamportsSpacePatch tag %d", p.Tag)
	}
}
