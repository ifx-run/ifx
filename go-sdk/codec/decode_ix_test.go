package codec

import "testing"

func TestDecodeIfxInstruction(t *testing.T) {
	dec, err := DecodeIfxInstruction([]byte{3, 1, 2})
	if err != nil {
		t.Fatal(err)
	}
	if dec.Name != IxNameLet {
		t.Fatalf("name %s", dec.Name)
	}
	if len(dec.Payload) != 2 {
		t.Fatalf("payload %d", len(dec.Payload))
	}
	if IfxIxHint([]byte{2}) != string(IxNameResetFrame) {
		t.Fatal("hint reset")
	}
	if IfxIxHint([]byte{99}) != "" {
		t.Fatal("unknown hint")
	}
}
