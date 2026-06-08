// Package ifelse builds ifx_if_else arms and args.
package ifelse

import (
	"github.com/ifx-run/ifx/go-sdk/codec"
	"github.com/ifx-run/ifx/go-sdk/typed"
)

// Arm is one branch of ifx_if_else.
type Arm = codec.IfElseArm

var (
	Skip   = codec.IfElseArm{Kind: codec.IfElseSkip}
	Revert = codec.IfElseArm{Kind: codec.IfElseRevert}
)

func Cpi(step codec.Cpi) Arm {
	return codec.IfElseArm{Kind: codec.IfElseCpi, Steps: []codec.Cpi{step}}
}

func Cpis(steps []codec.Cpi) Arm {
	return codec.IfElseArm{Kind: codec.IfElseCpi, Steps: steps}
}

// Args builds IfElseArgs with condition (ScratchValue or expr.Node).
func Args(cond interface{}, thenArm, elseArm Arm) (codec.IfElseArgs, error) {
	c, err := typed.ToCondExpr(cond)
	if err != nil {
		return codec.IfElseArgs{}, err
	}
	if elseArm.Kind == 0 && len(elseArm.Steps) == 0 {
		elseArm = Skip
	}
	return codec.IfElseArgs{Cond: c, ThenArm: thenArm, ElseArm: elseArm}, nil
}
