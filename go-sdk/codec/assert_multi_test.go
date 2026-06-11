package codec_test

import (
	"testing"

	"github.com/ifx-run/ifx/go-sdk/codec"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
)

func TestEncodeAssertMultiArgs(t *testing.T) {
	body, err := codec.EncodeAssertMultiArgs(codec.AssertMultiArgs{
		Conds: []expr.Node{
			expr.Eq(expr.Ref(0), expr.U64(1)),
			expr.Eq(expr.Ref(1), expr.U64(2)),
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if body[0] != 2 {
		t.Fatalf("len prefix: got %d want 2", body[0])
	}
}

func TestEncodeAssertMultiArgsEmpty(t *testing.T) {
	_, err := codec.EncodeAssertMultiArgs(codec.AssertMultiArgs{})
	if err == nil {
		t.Fatal("expected error for empty conds")
	}
}

func TestIxDiscAssertMulti(t *testing.T) {
	if constants.IxDiscAssertMulti != 5 {
		t.Fatalf("IxDiscAssertMulti = %d want 5", constants.IxDiscAssertMulti)
	}
	if constants.IxDiscPatchedCpi != 6 {
		t.Fatalf("IxDiscPatchedCpi = %d want 6", constants.IxDiscPatchedCpi)
	}
	if constants.IxDiscIfElse != 7 {
		t.Fatalf("IxDiscIfElse = %d want 7", constants.IxDiscIfElse)
	}
}
