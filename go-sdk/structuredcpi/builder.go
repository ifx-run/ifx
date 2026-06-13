package structuredcpi

import (
	"fmt"

	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/codec"
	"github.com/ifx-run/ifx/go-sdk/typed"
)

// Builder mirrors TS StructuredCpiBuilder.
type Builder struct {
	programID solana.PublicKey
	ixKeys    []*solana.AccountMeta
	wireTag   uint8
	payload   interface{}
}

// StructuredCpi starts a structured CPI builder from an official instruction (mirrors TS structuredCpi).
func StructuredCpi(template solana.Instruction, patch PatchInput) (*Builder, error) {
	return FromInstructionPatch(template, patch)
}

// FromInstructionPatch starts from an official ix with structured patch input.
func FromInstructionPatch(template solana.Instruction, patch PatchInput) (*Builder, error) {
	if patch.Payload == nil {
		switch patch.WireTag {
		case constants.StructuredPatchStakeDeactivate, constants.StructuredPatchStakeDelegateStake:
			// unit variants — no nested body
		default:
			return nil, fmt.Errorf("structured patch %d requires payload", patch.WireTag)
		}
	}
	return fromInstruction(template, patch.WireTag, patch.Payload, true)
}

// FromInstructionInfer starts from an official ix; infers wire tag from template data.
// Prefer FromInstructionPatch when using StructuredCpiPatch builders (tag 0 is valid).
func FromInstructionInfer(template solana.Instruction, payload interface{}) (*Builder, error) {
	return fromInstruction(template, 0, payload, false)
}

func fromInstruction(template solana.Instruction, wireTag uint8, payload interface{}, explicitTag bool) (*Builder, error) {
	data, err := template.Data()
	if err != nil {
		return nil, err
	}
	tag := wireTag
	if !explicitTag {
		inferred, ok := InferWireTag(template.ProgramID(), data)
		if !ok {
			return nil, fmt.Errorf("cannot infer structured patch tag for program %s", template.ProgramID())
		}
		tag = inferred
	}
	keys := template.Accounts()
	acc := make([]*solana.AccountMeta, len(keys))
	copy(acc, keys)
	return &Builder{
		programID: template.ProgramID(),
		ixKeys:    acc,
		wireTag:   tag,
		payload:   payload,
	}, nil
}

// Build resolves remaining accounts and encodes structured CPI wire.
func (b *Builder) Build(remaining []typed.AccountMeta) (codec.WireBuildResult, error) {
	metas := remaining
	if metas == nil {
		metas = append([]typed.AccountMeta{{Pubkey: b.programID.String()}}, ixKeysToMeta(b.ixKeys)...)
	}
	start := -1
	for i, m := range metas {
		if m.Pubkey == b.programID.String() {
			start = i
			break
		}
	}
	if start < 0 {
		return codec.WireBuildResult{}, fmt.Errorf("remaining must include CPI program id")
	}
	sliceLen := len(metas) - start
	if sliceLen < 1+len(b.ixKeys) {
		return codec.WireBuildResult{}, fmt.Errorf("remaining slice too short")
	}
	body, err := EncodeStructuredCpiPatch(b.wireTag, b.payload)
	if err != nil {
		return codec.WireBuildResult{}, err
	}
	step := codec.Cpi{
		AccountsStart:     uint8(start),
		AccountsLen:       uint8(sliceLen),
		StructuredPayload: body,
	}
	return codec.WireBuildResult{Step: step, Remaining: metas}, nil
}

func ixKeysToMeta(keys []*solana.AccountMeta) []typed.AccountMeta {
	out := make([]typed.AccountMeta, len(keys))
	for i, k := range keys {
		out[i] = typed.AccountMeta{
			Pubkey:     k.PublicKey.String(),
			IsSigner:   k.IsSigner,
			IsWritable: k.IsWritable,
		}
	}
	return out
}
