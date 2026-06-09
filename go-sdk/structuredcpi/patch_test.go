package structuredcpi

import (
	"bytes"
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/constants"
)

func TestInitializeMint2PatchWire(t *testing.T) {
	var auth [32]byte
	auth[0] = 0xab
	patch := InitializeMintPatch{
		Decimals:      FrameValue{Index: 4},
		MintAuthority: PubkeyValue{Literal: &auth},
		Freeze:        FreezeAuthPatch{None: true},
	}
	body, err := EncodeInitializeMintPatch(patch)
	if err != nil {
		t.Fatal(err)
	}
	want := append([]byte{4, pubkeyValueLiteral}, auth[:]...)
	want = append(want, freezeAuthNone)
	if !bytes.Equal(body, want) {
		t.Fatalf("got %x want %x", body, want)
	}
	wire, err := EncodeStructuredCpiStep(
		constants.StructuredPatchTokenInitializeMint2,
		0, 2, patch,
	)
	if err != nil {
		t.Fatal(err)
	}
	if wire[0] != constants.CpiWireStructured || wire[1] != constants.StructuredPatchTokenInitializeMint2 {
		t.Fatalf("bad header %v", wire[:4])
	}
}

func TestTransferCheckedAmountOnlyWire(t *testing.T) {
	p := StructuredCpiPatch.TokenTransferChecked().AmountOnly(FrameValue{Index: 3}, 9)
	body, err := EncodePatchPayload(p.WireTag, p.Payload)
	if err != nil {
		t.Fatal(err)
	}
	want := []byte{amountDecimalsAmountOnly, 3, 9}
	if !bytes.Equal(body, want) {
		t.Fatalf("got %x want %x", body, want)
	}
}

func TestInferWireTagTransferChecked(t *testing.T) {
	data := []byte{12, 0, 0, 0, 0, 0, 0, 0, 0, 9}
	tag, ok := InferWireTag(
		solana.MustPublicKeyFromBase58("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
		data,
	)
	if !ok || tag != constants.StructuredPatchTokenTransferChecked {
		t.Fatalf("infer got %d ok=%v", tag, ok)
	}
}
