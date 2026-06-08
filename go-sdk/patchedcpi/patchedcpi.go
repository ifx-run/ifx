// Package patchedcpi builds Cpi templates from solana instructions.
package patchedcpi

import (
	"fmt"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/ifx-run/ifx/go-sdk/codec"
	"github.com/ifx-run/ifx/go-sdk/patch"
	"github.com/ifx-run/ifx/go-sdk/typed"
)

// BuildResult is wire args + remaining accounts for patched/static CPI.
type BuildResult struct {
	Cpi       codec.Cpi
	StaticStep codec.Cpi
	Remaining []typed.AccountMeta
}

// Builder clones a template instruction for patching.
type Builder struct {
	programID solana.PublicKey
	ixKeys    []*solana.AccountMeta
	data      []byte
	patches   []codec.CpiPatch
}

// FromInstruction starts from any template ix (e.g. system transfer with lamports 0).
func FromInstruction(template solana.Instruction, patches ...codec.CpiPatch) *Builder {
	keys := template.Accounts()
	acc := make([]*solana.AccountMeta, len(keys))
	copy(acc, keys)
	data, err := template.Data()
	if err != nil {
		panic(err)
	}
	buf := make([]byte, len(data))
	copy(buf, data)
	return &Builder{
		programID: template.ProgramID(),
		ixKeys:    acc,
		data:      buf,
		patches:   patches,
	}
}

// Cpi is shorthand for FromInstruction.
func Cpi(template solana.Instruction, patches ...codec.CpiPatch) *Builder {
	return FromInstruction(template, patches...)
}

// Build finalizes wire structs. remaining may be nil to use [program, ...template keys].
func (b *Builder) Build(remaining []typed.AccountMeta) (BuildResult, error) {
	metas := remaining
	if metas == nil {
		metas = append([]typed.AccountMeta{{Pubkey: b.programID.String()}}, scratchFromIxKeys(b.ixKeys)...)
	}
	accountsStart := -1
	for i, m := range metas {
		if m.Pubkey == b.programID.String() {
			accountsStart = i
			break
		}
	}
	if accountsStart < 0 {
		return BuildResult{}, fmt.Errorf("remaining must include the CPI program id")
	}
	sliceLen := len(metas) - accountsStart
	if sliceLen < 1+len(b.ixKeys) {
		return BuildResult{}, fmt.Errorf("remaining slice too short")
	}
	for i, exp := range b.ixKeys {
		got := metas[accountsStart+1+i].Pubkey
		if got != exp.PublicKey.String() {
			return BuildResult{}, fmt.Errorf("account mismatch at %d", i)
		}
	}
	stepBase := codec.Cpi{
		AccountsStart: uint8(accountsStart),
		AccountsLen:   uint8(sliceLen),
		Data:          b.data,
	}
	return BuildResult{
		Cpi: codec.Cpi{
			AccountsStart: stepBase.AccountsStart,
			AccountsLen:   stepBase.AccountsLen,
			Data:          stepBase.Data,
			Patches:       codec.PatchListPatched(b.patches),
		},
		StaticStep: codec.Cpi{
			AccountsStart: stepBase.AccountsStart,
			AccountsLen:   stepBase.AccountsLen,
			Data:          stepBase.Data,
			Patches:       codec.PatchListStatic(),
		},
		Remaining: metas,
	}, nil
}

// StaticCpi builds a static if_else step (empty PatchList).
func StaticCpi(template solana.Instruction, remaining []typed.AccountMeta) (codec.Cpi, []typed.AccountMeta, error) {
	built, err := FromInstruction(template).Build(remaining)
	if err != nil {
		return codec.Cpi{}, nil, err
	}
	return built.StaticStep, built.Remaining, nil
}

// SystemTransferDataTemplate returns 12-byte system transfer data (disc 2 + u64 lamports).
func SystemTransferDataTemplate(lamports uint64) []byte {
	buf := make([]byte, 12)
	buf[0] = 2
	buf[1] = 0
	buf[2] = 0
	buf[3] = 0
	for i := 0; i < 8; i++ {
		buf[4+i] = byte(lamports >> (8 * i))
	}
	return buf
}

// SystemTransferTemplate is a transfer ix with lamports 0 for patching.
func SystemTransferTemplate(from, to solana.PublicKey) solana.Instruction {
	inst := system.NewTransferInstruction(0, from, to).Build()
	return inst
}

// Patch is re-exported helper.
var Patch = patch.CpiPatch

func scratchFromIxKeys(keys []*solana.AccountMeta) []typed.AccountMeta {
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
