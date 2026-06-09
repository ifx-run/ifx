package scratch

import (
	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/binding"
	"github.com/ifx-run/ifx/go-sdk/codec"
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/typed"
)

// LetBuilder plans multi-binding ifx_let with deduped remaining accounts.
type LetBuilder struct {
	scratch      *FrameScratch
	accounts     []typed.AccountMeta
	indexByKey   map[string]int
	bindings     []typed.ScratchValue
}

// FinishResult holds let ix components.
type FinishResult struct {
	Args      codec.LetArgs
	Bindings  []typed.ScratchValue
	Remaining []typed.AccountMeta
	Scratch   *FrameScratch
}

func (b *LetBuilder) AccountIndex(account interface{}) int {
	meta := toLetMeta(account)
	if idx, ok := b.indexByKey[meta.Pubkey]; ok {
		b.accounts[idx] = mergeMeta(b.accounts[idx], meta)
		return idx
	}
	idx := len(b.accounts)
	b.indexByKey[meta.Pubkey] = idx
	b.accounts = append(b.accounts, meta)
	return idx
}

func (b *LetBuilder) push(sv typed.ScratchValue) typed.ScratchValue {
	b.bindings = append(b.bindings, sv)
	return sv
}

func (b *LetBuilder) LetEval(e expr.Node) (typed.ScratchValue, error) {
	sv, err := b.scratch.LetEval(e)
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

func (b *LetBuilder) LetConstU64(n uint64) (typed.ScratchValue, error) {
	sv, err := b.scratch.LetConstU64(n)
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

func (b *LetBuilder) Lamports(account interface{}) (typed.ScratchValue, error) {
	i := b.AccountIndex(account)
	sv, err := b.scratch.PlanAtRemainingIndex(binding.AccountLamports(0), uint8(i))
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

func (b *LetBuilder) DataLen(account interface{}) (typed.ScratchValue, error) {
	i := b.AccountIndex(account)
	sv, err := b.scratch.PlanAtRemainingIndex(binding.AccountDataLen(0), uint8(i))
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

func (b *LetBuilder) LetAccountKey(account interface{}) (typed.ScratchValue, error) {
	i := b.AccountIndex(account)
	sv, err := b.scratch.PlanAtRemainingIndex(binding.AccountKey(0), uint8(i))
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

func (b *LetBuilder) LetConstPubkey(bytes [32]byte) (typed.ScratchValue, error) {
	sv, err := b.scratch.LetConstPubkey(bytes)
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

func (b *LetBuilder) FrameGeneration() (typed.ScratchValue, error) {
	sv, err := b.scratch.LetFrameGeneration()
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

func (b *LetBuilder) FrameIndexCount() (typed.ScratchValue, error) {
	sv, err := b.scratch.LetFrameIndexCount()
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

func (b *LetBuilder) AccountDataSlice(account, expectedOwner interface{}, ty typed.IfxTy, offset uint32) (typed.ScratchValue, error) {
	dataIdx := b.AccountIndex(account)
	ownerIdx := b.AccountIndex(expectedOwner)
	tag, err := typed.ValueTypeTag(ty)
	if err != nil {
		return typed.ScratchValue{}, err
	}
	sv, err := b.scratch.plan(binding.AccountDataSlice{
		ValueTypeTag:         tag,
		AccountIndex:         uint8(dataIdx),
		Offset:               offset,
		ExpectedProgramOwner: uint8(ownerIdx),
	}, nil)
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

func (b *LetBuilder) SplTokenAmount(account interface{}) (typed.ScratchValue, error) {
	i := b.AccountIndex(account)
	sv, err := b.scratch.PlanAtRemainingIndex(binding.SplTokenAccountAmount(0), uint8(i))
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

func (b *LetBuilder) ClockSlot() (typed.ScratchValue, error) {
	sv, err := b.scratch.ClockSlot()
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

func (b *LetBuilder) RentMinimumBalance(dataLen uint32) (typed.ScratchValue, error) {
	sv, err := b.scratch.RentMinimumBalance(dataLen)
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

// Finish returns wire args and remaining accounts.
func (b *LetBuilder) Finish() FinishResult {
	return FinishResult{
		Args:      ToLetArgs(b.bindings),
		Bindings:  append([]typed.ScratchValue(nil), b.bindings...),
		Remaining: append([]typed.AccountMeta(nil), b.accounts...),
		Scratch:   b.scratch,
	}
}

// RemainingPubkeys converts remaining to solana public keys for ix.BuildLet.
func (r FinishResult) RemainingPubkeys() []solana.PublicKey {
	out := make([]solana.PublicKey, len(r.Remaining))
	for i, m := range r.Remaining {
		out[i] = solana.MustPublicKeyFromBase58(m.Pubkey)
	}
	return out
}

// BuildIx returns ifx_let for this batch.
func (b *LetBuilder) BuildIx() (solana.Instruction, error) {
	return b.scratch.IxLet(b)
}
