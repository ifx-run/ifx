package scratch

import (
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/typed"
)

// ToCond converts bool ScratchValue or Expr node to wire Expr.
func ToCond(c interface{}) (expr.Node, error) {
	return typed.ToCondExpr(c)
}
