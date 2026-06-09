package structuredcpi

import (
	"fmt"

	"github.com/gagliardetto/solana-go"
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
	tag := patch.WireTag
	if tag == 0 && patch.Payload == nil {
		return nil, fmt.Errorf("structured patch requires WireTag")
	}
	return FromInstruction(template, tag, patch.Payload)
}

// FromInstruction starts from an official ix; wireTag inferred when zero.
func FromInstruction(template solana.Instruction, wireTag uint8, payload interface{}) (*Builder, error) {
	data, err := template.Data()
	if err != nil {
		return nil, err
	}
	tag := wireTag
	if tag == 0 {
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
	body, err := EncodePatchPayload(b.wireTag, b.payload)
	if err != nil {
		return codec.WireBuildResult{}, err
	}
	step := codec.Cpi{
		AccountsStart:     uint8(start),
		AccountsLen:       uint8(sliceLen),
		StructuredTag:     b.wireTag,
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
