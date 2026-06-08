package codec

import (
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/wire"
)

// CpiPatch overwrites Cpi.data before invoke.
type CpiPatch struct {
	DataOffset  uint16
	SourceIndex uint8
}

// Cpi is template CPI + PatchList (empty patches = static step).
type Cpi struct {
	AccountsStart uint8
	AccountsLen   uint8
	Data          []byte
	Patches       PatchList
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

func EncodeCpiPatch(p CpiPatch) ([]byte, error) {
	buf, err := wire.AppendU16LE(nil, p.DataOffset)
	if err != nil {
		return nil, err
	}
	buf = append(buf, p.SourceIndex)
	return buf, nil
}

func EncodeCpi(c Cpi) ([]byte, error) {
	buf := []byte{c.AccountsStart, c.AccountsLen}
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
