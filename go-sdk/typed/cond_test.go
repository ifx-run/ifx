package typed

import (
	"testing"

	"github.com/ifx-run/ifx/go-sdk/expr"
)

func TestToCondExprScratchValue(t *testing.T) {
	sv := ScratchValue{Index: 2, Ty: TyBool}
	n, err := ToCondExpr(sv)
	if err != nil {
		t.Fatal(err)
	}
	ref, ok := n.(expr.ValueRef)
	if !ok || ref.Index != 2 {
		t.Fatalf("got %#v", n)
	}
}

func TestToCondExprNode(t *testing.T) {
	n, err := ToCondExpr(expr.Bool(true))
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := n.(expr.ConstBool); !ok {
		t.Fatalf("got %T", n)
	}
}
