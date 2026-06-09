package codec

import (
	"fmt"

	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/wire"
)

// RawCpiPatch overwrites Cpi.data before invoke.
type RawCpiPatch struct {
	DataOffset  uint16
	SourceIndex uint8
}

// Cpi is one ifx CPI step (Static | RawPatched | Structured).
type Cpi struct {
	AccountsStart uint8
	AccountsLen   uint8
	Data          []byte
	Patches       PatchList
	// Structured-only (Kind == CpiWireStructured). Payload is patch body after wire tag.
	StructuredTag     uint8
	StructuredPayload []byte
}

// CpiKind returns the wire kind for a CPI step.
func CpiKind(c Cpi) uint8 {
	if c.StructuredPayload != nil {
		return constants.CpiWireStructured
	}
	if c.Patches.HasPatches() {
		return constants.CpiWireRawPatched
	}
	return constants.CpiWireStatic
}

// EncodeCpi serializes one CPI step (matches on-chain Cpi::serialize_wire / TS encodeCpi).
func EncodeCpi(c Cpi) ([]byte, error) {
	kind := CpiKind(c)
	switch kind {
	case constants.CpiWireStatic:
		buf := []byte{constants.CpiWireStatic, c.AccountsStart, c.AccountsLen}
		return wire.AppendU16LenBytes(buf, c.Data)
	case constants.CpiWireRawPatched:
		buf := []byte{constants.CpiWireRawPatched, c.AccountsStart, c.AccountsLen}
		var err error
		buf, err = wire.AppendU16LenBytes(buf, c.Data)
		if err != nil {
			return nil, err
		}
		patchBody, err := EncodePatchList(c.Patches)
		if err != nil {
			return nil, err
		}
		return append(buf, patchBody...), nil
	case constants.CpiWireStructured:
		if c.StructuredPayload == nil {
			return nil, fmt.Errorf("structured CPI requires StructuredPayload")
		}
		return append(
			[]byte{constants.CpiWireStructured, c.StructuredTag, c.AccountsStart, c.AccountsLen},
			c.StructuredPayload...,
		), nil
	default:
		return nil, fmt.Errorf("invalid CPI kind %d", kind)
	}
}

// IfElseArmKind selects ifx_if_else branch behavior (logical; wire uses step count tag).
type IfElseArmKind uint8

const (
	IfElseSkip IfElseArmKind = iota
	IfElseCpi
	IfElseRevert
)

// IfElseArm is one side of ifx_if_else.
type IfElseArm struct {
	Kind  IfElseArmKind
	Steps []Cpi
}

// IfElseArgs is the ifx_if_else instruction payload (after discriminator).
type IfElseArgs struct {
	Cond    expr.Node
	ThenArm IfElseArm
	ElseArm IfElseArm
}

func EncodeRawCpiPatch(p RawCpiPatch) ([]byte, error) {
	buf, err := wire.AppendU16LE(nil, p.DataOffset)
	if err != nil {
		return nil, err
	}
	buf = append(buf, p.SourceIndex)
	return buf, nil
}

func encodeIfElseArm(arm IfElseArm) ([]byte, error) {
	switch arm.Kind {
	case IfElseSkip:
		return []byte{IfElseArmTagSkip}, nil
	case IfElseRevert:
		return []byte{IfElseArmTagRevert}, nil
	case IfElseCpi:
		n := len(arm.Steps)
		if n == 0 || n > IfElseArmMaxSteps {
			return nil, errIfElseArmStepCount
		}
		out := []byte{uint8(n)}
		for i := range arm.Steps {
			body, err := EncodeCpi(arm.Steps[i])
			if err != nil {
				return nil, err
			}
			out = append(out, body...)
		}
		return out, nil
	default:
		return nil, errUnknownIfElseArm
	}
}

func EncodeIfElseArgs(args IfElseArgs) ([]byte, error) {
	cond, err := EncodeExpr(args.Cond)
	if err != nil {
		return nil, err
	}
	thenBody, err := encodeIfElseArm(args.ThenArm)
	if err != nil {
		return nil, err
	}
	elseBody, err := encodeIfElseArm(args.ElseArm)
	if err != nil {
		return nil, err
	}
	out := append(cond, thenBody...)
	out = append(out, elseBody...)
	return out, nil
}
