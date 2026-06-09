// Package ix builds Solana instructions for Ifx (solana-go).
package ix

import (
	"fmt"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/ifx-run/ifx/go-sdk/codec"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/frame"
	"github.com/ifx-run/ifx/go-sdk/frameauthority"
)

// Options overrides the default Ifx program id.
type Options struct {
	ProgramID solana.PublicKey
}

func programID(opts *Options) solana.PublicKey {
	if opts != nil && !opts.ProgramID.IsZero() {
		return opts.ProgramID
	}
	return constants.DefaultProgramID
}

// CreateFrameParams builds ifx_create_frame.
type CreateFrameParams struct {
	Payer          solana.PublicKey
	FrameID        [32]byte
	Authority solana.PublicKey
	TapeLen        uint32
	Options        *Options
}

// BuildCreateFrame returns ifx_create_frame.
func BuildCreateFrame(p CreateFrameParams) (solana.Instruction, solana.PublicKey, error) {
	programID := programID(p.Options)
	framePK, _, err := frame.FramePDA(programID, p.Payer, p.FrameID)
	if err != nil {
		return nil, solana.PublicKey{}, err
	}
	args, err := frame.EncodeCreateFrameArgs(frame.CreateFrameArgs{
		FrameID:        p.FrameID,
		Authority: p.Authority,
		TapeLen:        p.TapeLen,
	})
	if err != nil {
		return nil, solana.PublicKey{}, err
	}
	data := append([]byte{constants.IxDiscCreateFrame}, args...)
	accounts := solana.AccountMetaSlice{
		solana.Meta(p.Payer).SIGNER().WRITE(),
		solana.Meta(framePK).WRITE(),
		solana.Meta(system.ProgramID),
	}
	return solana.NewInstruction(programID, accounts, data), framePK, nil
}

// BuildResetFrame returns ifx_reset_frame.
func BuildResetFrame(framePK, authority solana.PublicKey, opts *Options) solana.Instruction {
	programID := programID(opts)
	data := []byte{constants.IxDiscResetFrame}
	accounts := solana.AccountMetaSlice{solana.Meta(framePK).WRITE()}
	accounts = append(accounts, frameauthority.PrependWriteAuthorityRemaining(authority, nil)...)
	return solana.NewInstruction(programID, accounts, data)
}

// BuildLet returns ifx_let (top-level instruction only).
func BuildLet(framePK, authority solana.PublicKey, args codec.LetArgs, remaining solana.PublicKeySlice, opts *Options) (solana.Instruction, error) {
	programID := programID(opts)
	body, err := codec.EncodeLetArgs(args)
	if err != nil {
		return nil, err
	}
	data := append([]byte{constants.IxDiscLet}, body...)
	accounts := solana.AccountMetaSlice{solana.Meta(framePK).WRITE()}
	letRemaining := make(solana.AccountMetaSlice, len(remaining))
	for i, pk := range remaining {
		letRemaining[i] = solana.Meta(pk)
	}
	accounts = append(accounts, frameauthority.PrependWriteAuthorityRemaining(authority, letRemaining)...)
	return solana.NewInstruction(programID, accounts, data), nil
}

// BuildAssert returns ifx_assert (cond must evaluate to bool on-chain).
func BuildAssert(framePK solana.PublicKey, cond expr.Node, opts *Options) (solana.Instruction, error) {
	programID := programID(opts)
	enc, err := codec.EncodeExpr(cond)
	if err != nil {
		return nil, err
	}
	data := append([]byte{constants.IxDiscAssert}, enc...)
	accounts := solana.AccountMetaSlice{solana.Meta(framePK)}
	return solana.NewInstruction(programID, accounts, data), nil
}

// BuildCloseFrame returns ifx_close_frame.
func BuildCloseFrame(framePK, authority solana.PublicKey, opts *Options) solana.Instruction {
	programID := programID(opts)
	data := []byte{constants.IxDiscCloseFrame}
	accounts := solana.AccountMetaSlice{
		solana.Meta(authority).SIGNER().WRITE(),
		solana.Meta(framePK).WRITE(),
	}
	return solana.NewInstruction(programID, accounts, data)
}

// BuildCpi returns ifx_patched_cpi for raw-patched or structured CPI steps.
func BuildCpi(framePK solana.PublicKey, built codec.WireBuildResult, opts *Options) (solana.Instruction, error) {
	if err := codec.ValidateWireBuild(built); err != nil {
		return nil, err
	}
	body, err := codec.EncodeCpi(built.Step)
	if err != nil {
		return nil, err
	}
	programID := programID(opts)
	data := append([]byte{constants.IxDiscPatchedCpi}, body...)
	accounts := solana.AccountMetaSlice{solana.Meta(framePK)}
	for _, m := range built.Remaining {
		pub := solana.MustPublicKeyFromBase58(m.Pubkey)
		meta := solana.Meta(pub)
		if m.IsSigner {
			meta = meta.SIGNER()
		}
		if m.IsWritable {
			meta = meta.WRITE()
		}
		accounts = append(accounts, meta)
	}
	return solana.NewInstruction(programID, accounts, data), nil
}

// BuildIfElse returns ifx_if_else.
func BuildIfElse(framePK solana.PublicKey, args codec.IfElseArgs, remaining solana.AccountMetaSlice, opts *Options) (solana.Instruction, error) {
	body, err := codec.EncodeIfElseArgs(args)
	if err != nil {
		return nil, err
	}
	programID := programID(opts)
	data := append([]byte{constants.IxDiscIfElse}, body...)
	accounts := solana.AccountMetaSlice{solana.Meta(framePK)}
	accounts = append(accounts, remaining...)
	return solana.NewInstruction(programID, accounts, data), nil
}

// NormalizeRemaining converts pubkeys to readonly AccountMeta entries.
func NormalizeRemaining(keys solana.PublicKeySlice) (solana.AccountMetaSlice, error) {
	if len(keys) == 0 {
		return nil, nil
	}
	out := make(solana.AccountMetaSlice, len(keys))
	for i, pk := range keys {
		if pk.IsZero() {
			return nil, fmt.Errorf("remaining account %d is zero", i)
		}
		out[i] = solana.Meta(pk)
	}
	return out, nil
}
