// Package scratch provides FrameScratch and LetBuilder (off-chain tape planner).
package scratch

import (
	"fmt"

	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/binding"
	"github.com/ifx-run/ifx/go-sdk/codec"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/frame"
	"github.com/ifx-run/ifx/go-sdk/immortal"
	"github.com/ifx-run/ifx/go-sdk/ix"
	"github.com/ifx-run/ifx/go-sdk/patchedcpi"
	"github.com/ifx-run/ifx/go-sdk/typed"
)

// FrameScratch mirrors on-chain Frame session planning.
type FrameScratch struct {
	Frame     solana.PublicKey
	ProgramID solana.PublicKey
	TapeLen   *int
	IndexCap  *int
	Cursor    uint32
	NextIndex uint8
	indexTypes map[uint8]typed.IfxTy
}

// PlanNewFrameResult is returned by PlanNewFrame.
type PlanNewFrameResult struct {
	Scratch   *FrameScratch
	IxCreate  solana.Instruction
	Frame     solana.PublicKey
	FrameBump uint8
}

// NewFrameScratch creates a planner for an existing or future Frame PDA.
func NewFrameScratch(framePK solana.PublicKey, tapeLen *int, programID solana.PublicKey) *FrameScratch {
	if programID.IsZero() {
		programID = constants.DefaultProgramID
	}
	s := &FrameScratch{
		Frame:      framePK,
		ProgramID:  programID,
		TapeLen:    tapeLen,
		indexTypes: make(map[uint8]typed.IfxTy),
	}
	if tapeLen != nil {
		cap, _ := constants.IndexCapForTapeLen(*tapeLen)
		s.IndexCap = &cap
	}
	return s
}

// FromDecodedFrame builds a planner from a decoded account snapshot.
// Tests and local debugging only — not for production.
func FromDecodedFrame(decoded *frame.DecodedFrame, framePK solana.PublicKey, programID solana.PublicKey) *FrameScratch {
	tapeLen := len(decoded.Tape)
	s := NewFrameScratch(framePK, &tapeLen, programID)
	s.Cursor = decoded.Cursor
	s.NextIndex = uint8(decoded.IndexCount)
	return s
}

// PlanNewFrameParams configures ifx_create_frame + scratch.
type PlanNewFrameParams struct {
	Payer          solana.PublicKey
	FrameID        [32]byte
	CloseAuthority solana.PublicKey
	TapeLen        uint32
	ProgramID      solana.PublicKey
}

// PlanNewFrame returns scratch + create ix for a new Frame PDA.
func PlanNewFrame(p PlanNewFrameParams) (PlanNewFrameResult, error) {
	programID := p.ProgramID
	if programID.IsZero() {
		programID = constants.DefaultProgramID
	}
	framePK, bump, err := frame.FramePDA(programID, p.Payer, p.FrameID)
	if err != nil {
		return PlanNewFrameResult{}, err
	}
	tapeLen := int(p.TapeLen)
	scratch := NewFrameScratch(framePK, &tapeLen, programID)
	ixCreate, _, err := ix.BuildCreateFrame(ix.CreateFrameParams{
		Payer:          p.Payer,
		FrameID:        p.FrameID,
		CloseAuthority: p.CloseAuthority,
		TapeLen:        p.TapeLen,
		Options:        &ix.Options{ProgramID: programID},
	})
	if err != nil {
		return PlanNewFrameResult{}, err
	}
	return PlanNewFrameResult{
		Scratch:   scratch,
		IxCreate:  ixCreate,
		Frame:     framePK,
		FrameBump: bump,
	}, nil
}

// PlanPublicFrame uses immortal close authority (Frame PDA).
func PlanPublicFrame(p PlanNewFrameParams) (PlanNewFrameResult, error) {
	programID := p.ProgramID
	if programID.IsZero() {
		programID = constants.DefaultProgramID
	}
	p.CloseAuthority = immortal.CloseAuthority(p.Payer, p.FrameID, programID)
	return PlanNewFrame(p)
}

// LetBuilder starts a multi-binding ifx_let batch.
func (s *FrameScratch) LetBuilder() *LetBuilder {
	return &LetBuilder{
		scratch:    s,
		indexByKey: make(map[string]int),
	}
}

func (s *FrameScratch) opts(o *ix.Options) *ix.Options {
	if o == nil {
		return &ix.Options{ProgramID: s.ProgramID}
	}
	if o.ProgramID.IsZero() {
		o.ProgramID = s.ProgramID
	}
	return o
}

// IxReset returns ifx_reset_frame and clears local planner state.
func (s *FrameScratch) IxReset(o *ix.Options) solana.Instruction {
	s.Cursor = 0
	s.NextIndex = 0
	s.indexTypes = make(map[uint8]typed.IfxTy)
	return ix.BuildResetFrame(s.Frame, s.opts(o))
}

// IxLet emits ifx_let for one ScratchValue or a LetBuilder batch.
func (s *FrameScratch) IxLet(target interface{}, o *ix.Options) (solana.Instruction, error) {
	switch v := target.(type) {
	case *LetBuilder:
		fin := v.Finish()
		return ix.BuildLet(s.Frame, fin.Args, fin.RemainingPubkeys(), s.opts(o))
	case typed.ScratchValue:
		args := codec.LetArgs{Bindings: []binding.Node{v.Binding}}
		var rem []solana.PublicKey
		for _, m := range v.Remaining {
			rem = append(rem, solana.MustPublicKeyFromBase58(m.Pubkey))
		}
		return ix.BuildLet(s.Frame, args, rem, s.opts(o))
	default:
		return nil, fmt.Errorf("IxLet expects typed.ScratchValue or *LetBuilder")
	}
}

// IxAssert returns ifx_assert.
func (s *FrameScratch) IxAssert(cond interface{}, o *ix.Options) (solana.Instruction, error) {
	c, err := ToCond(cond)
	if err != nil {
		return nil, err
	}
	return ix.BuildAssert(s.Frame, c, s.opts(o))
}

// IxCpi returns ifx_patched_cpi.
func (s *FrameScratch) IxCpi(built patchedcpi.BuildResult, o *ix.Options) (solana.Instruction, error) {
	return ix.BuildCpi(s.Frame, built, s.opts(o))
}

// IxIfElse returns ifx_if_else.
func (s *FrameScratch) IxIfElse(args codec.IfElseArgs, remaining []typed.AccountMeta, o *ix.Options) (solana.Instruction, error) {
	return ix.BuildIfElse(s.Frame, args, ToSolanaMetas(remaining), s.opts(o))
}

// IxCloseFrame returns ifx_close_frame.
func (s *FrameScratch) IxCloseFrame(authority solana.PublicKey, o *ix.Options) solana.Instruction {
	return ix.BuildCloseFrame(s.Frame, authority, s.opts(o))
}

// LetEval plans an Eval binding.
func (s *FrameScratch) LetEval(e expr.Node) (typed.ScratchValue, error) {
	return s.plan(binding.EvalExpr(e), nil)
}

func (s *FrameScratch) LetConstU64(n uint64) (typed.ScratchValue, error) {
	return s.LetEval(expr.U64(n))
}

func (s *FrameScratch) LetConstBool(v bool) (typed.ScratchValue, error) {
	return s.LetEval(expr.Bool(v))
}

func (s *FrameScratch) LetLamports(account interface{}) (typed.ScratchValue, error) {
	meta := toLetMeta(account)
	return s.plan(binding.AccountLamports(0), []typed.AccountMeta{meta})
}

func (s *FrameScratch) LetDataLen(account interface{}) (typed.ScratchValue, error) {
	meta := toLetMeta(account)
	return s.plan(binding.AccountDataLen(0), []typed.AccountMeta{meta})
}

func (s *FrameScratch) LetAccountDataSlice(account, expectedOwner interface{}, ty typed.IfxTy, offset uint32) (typed.ScratchValue, error) {
	tag, err := typed.ValueTypeTag(ty)
	if err != nil {
		return typed.ScratchValue{}, err
	}
	dataMeta := toLetMeta(account)
	ownerMeta := toLetMeta(expectedOwner)
	return s.plan(binding.AccountDataSlice{
		ValueTypeTag:         tag,
		AccountIndex:         0,
		Offset:               offset,
		ExpectedProgramOwner: 1,
	}, []typed.AccountMeta{dataMeta, ownerMeta})
}

func (s *FrameScratch) ClockSlot() (typed.ScratchValue, error) {
	return s.plan(binding.SysvarClockSlot(), nil)
}

func (s *FrameScratch) ClockUnixTimestamp() (typed.ScratchValue, error) {
	return s.plan(binding.SysvarClockUnixTimestamp(), nil)
}

func (s *FrameScratch) RentMinimumBalance(dataLen uint32) (typed.ScratchValue, error) {
	return s.plan(binding.SysvarRentMinimumBalance(dataLen), nil)
}

func (s *FrameScratch) SplTokenAmount(account interface{}) (typed.ScratchValue, error) {
	meta := toLetMeta(account)
	return s.plan(binding.SplTokenAccountAmount(0), []typed.AccountMeta{meta})
}

func (s *FrameScratch) SplMintDecimals(account interface{}) (typed.ScratchValue, error) {
	meta := toLetMeta(account)
	return s.plan(binding.SplMintDecimals(0), []typed.AccountMeta{meta})
}

// PlanAtRemainingIndex plans a binding with a fixed remaining account index (LetBuilder internal).
func (s *FrameScratch) PlanAtRemainingIndex(b binding.Node, accountIndex uint8) (typed.ScratchValue, error) {
	return s.plan(binding.RemapAccountIndex(b, accountIndex), nil)
}

func (s *FrameScratch) plan(b binding.Node, letRemaining []typed.AccountMeta) (typed.ScratchValue, error) {
	ty, err := typed.InferBindingTy(b, s.indexTypes)
	if err != nil {
		return typed.ScratchValue{}, err
	}
	tag, err := typed.ValueTypeTag(ty)
	if err != nil {
		return typed.ScratchValue{}, err
	}
	bindingIndex := s.NextIndex
	if s.IndexCap != nil && int(bindingIndex) >= *s.IndexCap {
		return typed.ScratchValue{}, fmt.Errorf("scratch binding index cap reached (%d >= %d)", bindingIndex, *s.IndexCap)
	}
	_, _, endCursor, err := frame.PlanRecordOffsets(s.Cursor, tag)
	if err != nil {
		return typed.ScratchValue{}, err
	}
	if s.TapeLen != nil && int(endCursor) > *s.TapeLen {
		recLen, _ := frame.RecordByteLength(tag)
		return typed.ScratchValue{}, fmt.Errorf("scratch would exceed tape (%d > %d); need +%d B per binding", endCursor, *s.TapeLen, recLen)
	}
	s.Cursor = endCursor
	s.NextIndex++
	s.indexTypes[bindingIndex] = ty
	return typed.ScratchValue{
		Binding:   b,
		Index:     bindingIndex,
		Ty:        ty,
		Remaining: letRemaining,
	}, nil
}

// ToLetArgs collects bindings from scratch values.
func ToLetArgs(values []typed.ScratchValue) codec.LetArgs {
	bindings := make([]binding.Node, len(values))
	for i, v := range values {
		bindings[i] = v.Binding
	}
	return codec.LetArgs{Bindings: bindings}
}
