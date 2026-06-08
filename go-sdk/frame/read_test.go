package frame

import (
	"testing"

	"github.com/ifx-run/ifx/go-sdk/binding"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/typed"
)

func TestReadU64FromTape(t *testing.T) {
	dec := &DecodedFrame{
		Cursor:     9,
		IndexCount: 1,
		PayloadAt:  []uint16{1},
		Tape:       []byte{0x04, 0x2a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00},
	}
	sv := typed.ScratchValue{
		Binding: binding.EvalExpr(nil),
		Index:   0,
		Ty:      typed.TyU64,
	}
	got, err := dec.ReadU64(sv)
	if err != nil {
		t.Fatal(err)
	}
	if got != 42 {
		t.Fatalf("got %d", got)
	}
	_ = constants.ValueTypeU64
}
