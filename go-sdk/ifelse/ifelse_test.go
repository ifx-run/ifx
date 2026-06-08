package ifelse

import (
	"testing"

	"github.com/ifx-run/ifx/go-sdk/codec"
	"github.com/ifx-run/ifx/go-sdk/expr"
)

func TestIfElseArmDiscriminants(t *testing.T) {
	skipSkipArgs, err := Args(expr.Bool(true), Skip, Skip)
	if err != nil {
		t.Fatal(err)
	}
	skipSkip, err := codec.EncodeIfElseArgs(skipSkipArgs)
	if err != nil {
		t.Fatal(err)
	}
	if skipSkip[len(skipSkip)-2] != codec.IfElseArmTagSkip || skipSkip[len(skipSkip)-1] != codec.IfElseArmTagSkip {
		t.Fatalf("tail %x", skipSkip[len(skipSkip)-2:])
	}

	revertSkipArgs, err := Args(expr.Bool(false), Revert, Skip)
	if err != nil {
		t.Fatal(err)
	}
	revertSkip, err := codec.EncodeIfElseArgs(revertSkipArgs)
	if err != nil {
		t.Fatal(err)
	}
	if revertSkip[len(revertSkip)-2] != codec.IfElseArmTagRevert {
		t.Fatalf("then arm %d", revertSkip[len(revertSkip)-2])
	}
}

func TestIfElseArmMultiCpi(t *testing.T) {
	c := codec.Cpi{AccountsStart: 0, AccountsLen: 1, Data: []byte{1, 2, 3}, Patches: codec.PatchListStatic()}
	args, err := Args(expr.Bool(true), Cpis([]codec.Cpi{c, c}), Skip)
	if err != nil {
		t.Fatal(err)
	}
	out, err := codec.EncodeIfElseArgs(args)
	if err != nil {
		t.Fatal(err)
	}
	one, err := codec.EncodeIfElseArgs(mustArgs(expr.Bool(true), Cpi(c), Skip))
	if err != nil {
		t.Fatal(err)
	}
	if len(out) <= len(one) {
		t.Fatalf("multi cpi should be longer: %d vs %d", len(out), len(one))
	}
}

func mustArgs(cond interface{}, thenArm, elseArm Arm) codec.IfElseArgs {
	args, err := Args(cond, thenArm, elseArm)
	if err != nil {
		panic(err)
	}
	return args
}
