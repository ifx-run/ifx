package codec

import (
	"fmt"

	"github.com/ifx-run/ifx/go-sdk/constants"
)

// IfxIxName is the on-chain instruction name for a 1-byte discriminator.
type IfxIxName string

const (
	IxNameCreateFrame  IfxIxName = "ifx_create_frame"
	IxNameCloseFrame   IfxIxName = "ifx_close_frame"
	IxNameResetFrame   IfxIxName = "ifx_reset_frame"
	IxNameLet          IfxIxName = "ifx_let"
	IxNameAssert       IfxIxName = "ifx_assert"
	IxNameAssertMulti  IfxIxName = "ifx_assert_multi"
	IxNamePatchedCpi   IfxIxName = "ifx_patched_cpi"
	IxNameIfElse       IfxIxName = "ifx_if_else"
)

var discToName = map[uint8]IfxIxName{
	constants.IxDiscCreateFrame:  IxNameCreateFrame,
	constants.IxDiscCloseFrame:   IxNameCloseFrame,
	constants.IxDiscResetFrame:   IxNameResetFrame,
	constants.IxDiscLet:          IxNameLet,
	constants.IxDiscAssert:       IxNameAssert,
	constants.IxDiscAssertMulti:  IxNameAssertMulti,
	constants.IxDiscPatchedCpi:   IxNamePatchedCpi,
	constants.IxDiscIfElse:       IxNameIfElse,
}

// DecodedIfxInstruction is the result of DecodeIfxInstruction.
type DecodedIfxInstruction struct {
	Name          IfxIxName
	Discriminator uint8
	Data          []byte
	Payload       []byte
}

// DecodeIfxInstruction reads the 1-byte Ifx discriminator (inspection / debugging only).
func DecodeIfxInstruction(data []byte) (DecodedIfxInstruction, error) {
	if len(data) < 1 {
		return DecodedIfxInstruction{}, fmt.Errorf("ifx instruction data is empty")
	}
	disc := data[0]
	name, ok := discToName[disc]
	if !ok {
		return DecodedIfxInstruction{}, fmt.Errorf("unknown Ifx instruction discriminator: %d", disc)
	}
	return DecodedIfxInstruction{
		Name:          name,
		Discriminator: disc,
		Data:          data,
		Payload:       data[1:],
	}, nil
}

// IfxIxHint returns the instruction name or empty string when unknown.
func IfxIxHint(data []byte) string {
	dec, err := DecodeIfxInstruction(data)
	if err != nil {
		return ""
	}
	return string(dec.Name)
}
