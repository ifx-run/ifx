package expr

import "testing"

type planned struct{ index uint8 }

func (p planned) BindingIndex() uint8 { return p.index }

func TestOperandAcceptsPlannedBinding(t *testing.T) {
	slot := planned{index: 3}
	got := Add(slot, U64(1)).(Binary)
	ref, ok := got.Lhs.(ValueRef)
	if !ok || ref.Index != 3 {
		t.Fatalf("lhs = %#v, want ValueRef{3}", got.Lhs)
	}
	if _, ok := got.Rhs.(ConstU64); !ok {
		t.Fatalf("rhs = %#v, want ConstU64", got.Rhs)
	}
	if Ref(slot).(ValueRef).Index != 3 {
		t.Fatal("Ref(planned) lost the index")
	}
	if Ref(uint8(3)).(ValueRef).Index != 3 {
		t.Fatal("Ref(uint8) lost the index")
	}
}
