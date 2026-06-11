package errors

import (
	"fmt"
	"strconv"
	"strings"
)

const CodeBase = 6000

// Code names match programs/ifx Anchor errors (6000 + enum index).
const (
	LetNotTopLevel              = 6000
	TapeOutOfBounds             = 6001
	UnauthorizedClose           = 6002
	InvalidAuthority            = 6003
	InvalidTapeLen              = 6004
	AssertFailed                = 6005
	IfElseRevert                = 6006
	InvalidAccountIndex         = 6007
	InvalidAccountRange         = 6008
	AccountDataTooShort         = 6009
	IntegerOverflow             = 6010
	IntegerUnderflow            = 6011
	DivisionByZero              = 6012
	UnsupportedBinaryOp         = 6013
	UnsupportedUnaryOp          = 6014
	FloatUnordered              = 6015
	LoadTypeMismatch            = 6016
	ExprTypeMismatch            = 6017
	InvalidExprOperand          = 6018
	PatchDataOutOfRange         = 6019
	InvalidValueTypeTag         = 6020
	InvalidValueIndex           = 6021
	IndexCapReached             = 6022
	AccountOwnerMismatch        = 6023
	AccountDataLenMismatch      = 6024
	SplTokenUnpackFailed        = 6025
	Token2022ExtensionNotPresent = 6026
	SplToken2022UnpackFailed     = 6027
	CastOverflow                 = 6028
	InvalidPatchedCpiPatches     = 6029
	InvalidStructuredCpiProgram  = 6030
	InvalidInstructionData       = 6031
	StakeUnpackFailed            = 6032
	StakeStateMismatch           = 6033
	ResetNotTopLevel             = 6034
	CloseNotTopLevel             = 6035
	CreateNotTopLevel            = 6036
	UnauthorizedFrameWrite       = 6037
	SplMintOptionEmpty           = 6038
	AssertFailedMulti            = 6039
)

var nameByCode = map[int]string{
	LetNotTopLevel:               "LetNotTopLevel",
	TapeOutOfBounds:              "TapeOutOfBounds",
	UnauthorizedClose:            "UnauthorizedClose",
	InvalidAuthority:             "InvalidAuthority",
	InvalidTapeLen:               "InvalidTapeLen",
	AssertFailed:                 "AssertFailed",
	IfElseRevert:                 "IfElseRevert",
	InvalidAccountIndex:          "InvalidAccountIndex",
	InvalidAccountRange:          "InvalidAccountRange",
	AccountDataTooShort:          "AccountDataTooShort",
	IntegerOverflow:              "IntegerOverflow",
	IntegerUnderflow:             "IntegerUnderflow",
	DivisionByZero:               "DivisionByZero",
	UnsupportedBinaryOp:          "UnsupportedBinaryOp",
	UnsupportedUnaryOp:           "UnsupportedUnaryOp",
	FloatUnordered:               "FloatUnordered",
	LoadTypeMismatch:             "LoadTypeMismatch",
	ExprTypeMismatch:             "ExprTypeMismatch",
	InvalidExprOperand:           "InvalidExprOperand",
	PatchDataOutOfRange:          "PatchDataOutOfRange",
	InvalidValueTypeTag:          "InvalidValueTypeTag",
	InvalidValueIndex:            "InvalidValueIndex",
	IndexCapReached:              "IndexCapReached",
	AccountOwnerMismatch:         "AccountOwnerMismatch",
	AccountDataLenMismatch:       "AccountDataLenMismatch",
	SplTokenUnpackFailed:         "SplTokenUnpackFailed",
	Token2022ExtensionNotPresent: "Token2022ExtensionNotPresent",
	SplToken2022UnpackFailed:     "SplToken2022UnpackFailed",
	CastOverflow:                 "CastOverflow",
	InvalidPatchedCpiPatches:     "InvalidPatchedCpiPatches",
	InvalidStructuredCpiProgram:  "InvalidStructuredCpiProgram",
	InvalidInstructionData:       "InvalidInstructionData",
	StakeUnpackFailed:            "StakeUnpackFailed",
	StakeStateMismatch:           "StakeStateMismatch",
	ResetNotTopLevel:             "ResetNotTopLevel",
	CloseNotTopLevel:             "CloseNotTopLevel",
	CreateNotTopLevel:            "CreateNotTopLevel",
	UnauthorizedFrameWrite:       "UnauthorizedFrameWrite",
	SplMintOptionEmpty:           "SplMintOptionEmpty",
	AssertFailedMulti:            "AssertFailedMulti",
}

// Name returns the Ifx error name for a numeric Anchor code, if known.
func Name(code int) (string, bool) {
	n, ok := nameByCode[code]
	return n, ok
}

// IsCode reports whether code is a known Ifx program error.
func IsCode(code int) bool {
	_, ok := nameByCode[code]
	return ok
}

// MessageIncludes matches simulation / logs: error name, decimal code, or hex.
func MessageIncludes(message, name string) bool {
	code, ok := codeByName(name)
	if !ok {
		return false
	}
	lower := strings.ToLower(message)
	hexFull := strconv.FormatInt(int64(code), 16)
	hexLow := strconv.FormatInt(int64(code&0xff), 16)
	return strings.Contains(message, name) ||
		strings.Contains(message, strconv.Itoa(code)) ||
		strings.Contains(lower, "0x"+hexFull) ||
		strings.Contains(lower, "0x"+hexLow)
}

func codeByName(name string) (int, bool) {
	for code, n := range nameByCode {
		if n == name {
			return code, true
		}
	}
	return 0, false
}

// Errorf helper for tests.
func FormatUnknown(code int) string {
	if n, ok := Name(code); ok {
		return fmt.Sprintf("%s (%d)", n, code)
	}
	return fmt.Sprintf("unknown Ifx error %d", code)
}
