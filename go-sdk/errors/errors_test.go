package errors

import "testing"

func TestErrorNameRoundTrip(t *testing.T) {
	name, ok := Name(IndexCapReached)
	if !ok || name != "IndexCapReached" {
		t.Fatalf("Name(6022) = %q ok=%v", name, ok)
	}
	name, ok = Name(CastOverflow)
	if !ok || name != "CastOverflow" {
		t.Fatalf("Name(6028) = %q ok=%v", name, ok)
	}
	if _, ok := Name(9999); ok {
		t.Fatal("expected unknown code")
	}
}

func TestMessageIncludes(t *testing.T) {
	if !MessageIncludes("Error Code: CastOverflow. Error Number: 6028", "CastOverflow") {
		t.Fatal("expected name match")
	}
	if !MessageIncludes("custom program error: 0x178c", "CastOverflow") {
		t.Fatal("expected hex match")
	}
	if MessageIncludes("random failure", "AssertFailed") {
		t.Fatal("unexpected match")
	}
}

func TestCodeBase(t *testing.T) {
	if CodeBase != 6000 {
		t.Fatalf("CodeBase = %d", CodeBase)
	}
	if len(nameByCode) != 40 {
		t.Fatalf("error count = %d, want 40", len(nameByCode))
	}
}
