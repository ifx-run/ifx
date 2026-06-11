package codec

import (
	"fmt"

	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/wire"
)

// AssertMultiArgs holds parallel conditions for one ifx_assert_multi.
type AssertMultiArgs struct {
	Conds []expr.Node
}

// EncodeAssertMultiArgs serializes AssertMultiArgs (U8LenVec<Expr>).
func EncodeAssertMultiArgs(args AssertMultiArgs) ([]byte, error) {
	if len(args.Conds) == 0 {
		return nil, fmt.Errorf("ifx_assert_multi requires at least one condition")
	}
	return wire.AppendU8LenVec(nil, args.Conds, func(c expr.Node) ([]byte, error) {
		return EncodeExpr(c)
	})
}
