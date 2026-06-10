package codec

import (
	"encoding/hex"
	"testing"

	"github.com/ifx-run/ifx/go-sdk/constants"
)

func systemTransferDataTemplate() []byte {
	return []byte{2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}
}

func TestEncodeCpiRawPatchedMatchesTS(t *testing.T) {
	c := Cpi{
		AccountsStart: 0,
		AccountsLen:   3,
		Data:          systemTransferDataTemplate(),
		Patches: PatchListPatched([]RawCpiPatch{{
			DataOffset:  4,
			SourceIndex: 1,
		}}),
	}
	got, err := EncodeCpi(c)
	if err != nil {
		t.Fatal(err)
	}
	want, _ := hex.DecodeString("0100030c000200000000000000000000000100040001")
	if hex.EncodeToString(got) != hex.EncodeToString(want) {
		t.Fatalf("encodeCpi\ngot  %x\nwant %x", got, want)
	}
	if got[0] != constants.CpiWireRawPatched {
		t.Fatalf("kind %d", got[0])
	}
}

func TestEncodeCpiStaticKindByte(t *testing.T) {
	c := Cpi{
		AccountsStart: 0,
		AccountsLen:   3,
		Data:          []byte{2, 0, 0, 0, 0xb8, 0x0b, 0, 0, 0, 0, 0, 0},
		Patches:       PatchListStatic(),
	}
	got, err := EncodeCpi(c)
	if err != nil {
		t.Fatal(err)
	}
	if got[0] != constants.CpiWireStatic {
		t.Fatalf("expected static kind 0, got %d", got[0])
	}
}

func TestEncodeCpiStructured(t *testing.T) {
	payload := []byte{7, 0, 3, 9}
	c := Cpi{
		AccountsStart:     1,
		AccountsLen:       4,
		StructuredPayload: payload,
	}
	got, err := EncodeCpi(c)
	if err != nil {
		t.Fatal(err)
	}
	want := []byte{constants.CpiWireStructured, 1, 4, 7, 0, 3, 9}
	if hex.EncodeToString(got) != hex.EncodeToString(want) {
		t.Fatalf("got %x want %x", got, want)
	}
}
