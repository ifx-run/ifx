package typed

import (
	"fmt"

	"github.com/ifx-run/ifx/go-sdk/expr"
)

// ToCondExpr converts a bool ScratchValue or Expr node to wire Expr (assert / if_else).
func ToCondExpr(c interface{}) (expr.Node, error) {
	switch v := c.(type) {
	case ScratchValue:
		return expr.Ref(v.Index), nil
	case expr.Node:
		return v, nil
	default:
		return nil, fmt.Errorf("Cond must be typed.ScratchValue or expr.Node, got %T", c)
	}
}
