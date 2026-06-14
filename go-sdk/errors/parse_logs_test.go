package errors

import "testing"

func TestParseIfxLogs(t *testing.T) {
	logs := []string{
		"Program log: AnchorError occurred. Error Code: AssertFailed. Error Number: 6005.",
		"Transaction simulation failed: Error processing Instruction #3",
	}
	parsed := ParseIfxLogs(logs)
	if parsed[0].Kind != "ifx_error" || parsed[0].ErrorName != "AssertFailed" {
		t.Fatalf("first: %+v", parsed[0])
	}
	if parsed[1].Kind != "instruction_failed" || parsed[1].InstructionIndex == nil || *parsed[1].InstructionIndex != 3 {
		t.Fatalf("second: %+v", parsed[1])
	}
	first := FirstIfxErrorInLogs(logs)
	if first == nil || first.ErrorName != "AssertFailed" {
		t.Fatal("first error")
	}
}
