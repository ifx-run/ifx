package structuredcpi

import (
	"testing"

	"github.com/ifx-run/ifx/go-sdk/codec"
	"github.com/ifx-run/ifx/go-sdk/constants"
)

// structuredPatchWireKeys mirrors TS STRUCTURED_CPI_PATCH_WIRE keys (34 variants).
var structuredPatchWireKeys = []struct {
	name string
	fn   func() PatchInput
}{
	{"systemTransfer", func() PatchInput {
		return StructuredCpiPatch.SystemTransfer(FrameValue{Index: 0})
	}},
	{"systemCreateAccount", func() PatchInput {
		return StructuredCpiPatch.SystemCreateAccount().LamportsOnly(FrameValue{Index: 0}, 165)
	}},
	{"systemAllocate", func() PatchInput {
		return StructuredCpiPatch.SystemAllocate(FrameValue{Index: 0})
	}},
	{"tokenTransfer", func() PatchInput {
		return StructuredCpiPatch.TokenTransfer(FrameValue{Index: 0})
	}},
	{"tokenApprove", func() PatchInput {
		return StructuredCpiPatch.TokenApprove(FrameValue{Index: 0})
	}},
	{"tokenMintTo", func() PatchInput {
		return StructuredCpiPatch.TokenMintTo(FrameValue{Index: 0})
	}},
	{"tokenBurn", func() PatchInput {
		return StructuredCpiPatch.TokenBurn(FrameValue{Index: 0})
	}},
	{"tokenTransferChecked", func() PatchInput {
		return StructuredCpiPatch.TokenTransferChecked().AmountOnly(FrameValue{Index: 0}, 9)
	}},
	{"tokenApproveChecked", func() PatchInput {
		return StructuredCpiPatch.TokenApproveChecked().AmountOnly(FrameValue{Index: 0}, 9)
	}},
	{"tokenMintToChecked", func() PatchInput {
		return StructuredCpiPatch.TokenMintToChecked().AmountOnly(FrameValue{Index: 0}, 9)
	}},
	{"tokenBurnChecked", func() PatchInput {
		return StructuredCpiPatch.TokenBurnChecked().AmountOnly(FrameValue{Index: 0}, 9)
	}},
	{"tokenAmountToUiAmount", func() PatchInput {
		return StructuredCpiPatch.TokenAmountToUiAmount(FrameValue{Index: 0})
	}},
	{"tokenInitializeMint", func() PatchInput {
		return StructuredCpiPatch.TokenInitializeMint(InitializeMintArgs{
			Decimals: FrameValue{Index: 0}, MintAuthority: FrameValue{Index: 1}, Freeze: FreezeNone(),
		})
	}},
	{"tokenInitializeMint2", func() PatchInput {
		return StructuredCpiPatch.TokenInitializeMint2(InitializeMintArgs{
			Decimals: FrameValue{Index: 0}, MintAuthority: FrameValue{Index: 1}, Freeze: FreezeNone(),
		})
	}},
	{"tokenInitializeMultisig", func() PatchInput {
		return StructuredCpiPatch.TokenInitializeMultisig(FrameValue{Index: 0})
	}},
	{"token2022Transfer", func() PatchInput {
		return StructuredCpiPatch.Token2022Transfer(FrameValue{Index: 0})
	}},
	{"token2022Approve", func() PatchInput {
		return StructuredCpiPatch.Token2022Approve(FrameValue{Index: 0})
	}},
	{"token2022MintTo", func() PatchInput {
		return StructuredCpiPatch.Token2022MintTo(FrameValue{Index: 0})
	}},
	{"token2022Burn", func() PatchInput {
		return StructuredCpiPatch.Token2022Burn(FrameValue{Index: 0})
	}},
	{"token2022TransferChecked", func() PatchInput {
		return StructuredCpiPatch.Token2022TransferChecked().AmountOnly(FrameValue{Index: 0}, 9)
	}},
	{"token2022ApproveChecked", func() PatchInput {
		return StructuredCpiPatch.Token2022ApproveChecked().AmountOnly(FrameValue{Index: 0}, 9)
	}},
	{"token2022MintToChecked", func() PatchInput {
		return StructuredCpiPatch.Token2022MintToChecked().AmountOnly(FrameValue{Index: 0}, 9)
	}},
	{"token2022BurnChecked", func() PatchInput {
		return StructuredCpiPatch.Token2022BurnChecked().AmountOnly(FrameValue{Index: 0}, 9)
	}},
	{"token2022AmountToUiAmount", func() PatchInput {
		return StructuredCpiPatch.Token2022AmountToUiAmount(FrameValue{Index: 0})
	}},
	{"token2022InitializeMint", func() PatchInput {
		return StructuredCpiPatch.Token2022InitializeMint(InitializeMintArgs{
			Decimals: FrameValue{Index: 0}, MintAuthority: FrameValue{Index: 1}, Freeze: FreezeNone(),
		})
	}},
	{"token2022InitializeMint2", func() PatchInput {
		return StructuredCpiPatch.Token2022InitializeMint2(InitializeMintArgs{
			Decimals: FrameValue{Index: 0}, MintAuthority: FrameValue{Index: 1}, Freeze: FreezeNone(),
		})
	}},
	{"token2022InitializeMultisig", func() PatchInput {
		return StructuredCpiPatch.Token2022InitializeMultisig(FrameValue{Index: 0})
	}},
	{"token2022TransferCheckedWithFee", func() PatchInput {
		return StructuredCpiPatch.Token2022TransferCheckedWithFee().AmountOnly(FrameValue{Index: 0}, 9, 1)
	}},
	{"token2022SetTransferFee", func() PatchInput {
		return StructuredCpiPatch.Token2022SetTransferFee().BpsOnly(FrameValue{Index: 0}, 1000)
	}},
	{"stakeWithdraw", func() PatchInput {
		return StructuredCpiPatch.StakeWithdraw(FrameValue{Index: 0})
	}},
	{"stakeSplit", func() PatchInput {
		return StructuredCpiPatch.StakeSplit(FrameValue{Index: 0})
	}},
	{"stakeDeactivate", func() PatchInput {
		return StructuredCpiPatch.StakeDeactivate()
	}},
	{"stakeDelegateStake", func() PatchInput {
		return StructuredCpiPatch.StakeDelegateStake()
	}},
	{"tokenUnwrapLamports", func() PatchInput {
		return StructuredCpiPatch.TokenUnwrapLamportsAmount(FrameValue{Index: 0})
	}},
}

func TestStructuredCpiPatchCoversAllWireTags(t *testing.T) {
	if len(structuredPatchWireKeys) != constants.StructuredCpiPatchCount {
		t.Fatalf("builder keys %d != %d", len(structuredPatchWireKeys), constants.StructuredCpiPatchCount)
	}
	for _, tc := range structuredPatchWireKeys {
		p := tc.fn()
		full, err := EncodeStructuredCpiPatch(p.WireTag, p.Payload)
		if err != nil {
			t.Fatalf("%s tag %d EncodeStructuredCpiPatch: %v", tc.name, p.WireTag, err)
		}
		if len(full) == 0 {
			t.Fatalf("%s tag %d: empty encoded patch", tc.name, p.WireTag)
		}
		if full[0] != p.WireTag {
			t.Fatalf("%s tag %d: encoded patch starts with %d, want top-level variant %d (got %x)",
				tc.name, p.WireTag, full[0], p.WireTag, full)
		}
		step, err := StructuredCpiStep(1, 4, p.WireTag, p.Payload)
		if err != nil {
			t.Fatalf("%s StructuredCpiStep: %v", tc.name, err)
		}
		if len(step.StructuredPayload) == 0 || step.StructuredPayload[0] != p.WireTag {
			t.Fatalf("%s: step payload %x missing variant %d", tc.name, step.StructuredPayload, p.WireTag)
		}
		wire, err := codec.EncodeCpi(step)
		if err != nil {
			t.Fatalf("%s EncodeCpi: %v", tc.name, err)
		}
		if wire[0] != constants.CpiWireStructured || wire[3] != p.WireTag {
			t.Fatalf("%s EncodeCpi wire %x header/tag mismatch", tc.name, wire)
		}
	}
}

func TestEncodeStructuredCpiPatchSystemTransferTagZero(t *testing.T) {
	// Mirrors TS: encodeStructuredCpiPatch(systemTransfer) must not drop variant byte 0.
	for _, idx := range []uint8{0, 5} {
		full, err := EncodeStructuredCpiPatch(
			constants.StructuredPatchSystemTransfer,
			FrameValue{Index: idx},
		)
		if err != nil {
			t.Fatal(err)
		}
		want := []byte{0, idx}
		if len(full) != 2 || full[0] != 0 || full[1] != idx {
			t.Fatalf("index %d: got %x want %x", idx, full, want)
		}
	}
}

func TestCpiRequiresPatchApplyStructured(t *testing.T) {
	p := StructuredCpiPatch.TokenTransferChecked().AmountOnly(FrameValue{Index: 3}, 9)
	body, err := EncodePatchPayload(p.WireTag, p.Payload)
	if err != nil {
		t.Fatal(err)
	}
	step, err := StructuredCpiStep(1, 4, p.WireTag, p.Payload)
	if err != nil {
		t.Fatal(err)
	}
	if step.StructuredPayload == nil {
		t.Fatal("expected structured payload")
	}
	if len(body) != 3 {
		t.Fatalf("payload len %d", len(body))
	}
}
