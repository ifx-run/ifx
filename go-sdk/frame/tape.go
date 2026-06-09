package frame

import (
	"fmt"

	"github.com/ifx-run/ifx/go-sdk/constants"
)
// ValueTypeSize returns payload byte width for a ValueType wire tag.
func ValueTypeSize(tag uint8) (int, error) {
	switch tag {
	case constants.ValueTypeBool, constants.ValueTypeU8, constants.ValueTypeI8:
		return 1, nil
	case constants.ValueTypeU16, constants.ValueTypeI16:
		return 2, nil
	case constants.ValueTypeU32, constants.ValueTypeI32, constants.ValueTypeF32:
		return 4, nil
	case constants.ValueTypeU64, constants.ValueTypeI64, constants.ValueTypeF64:
		return 8, nil
	case constants.ValueTypeU128, constants.ValueTypeI128:
		return 16, nil
	case constants.ValueTypePubkey:
		return 32, nil
	default:
		return 0, fmt.Errorf("unknown ValueType tag %d", tag)
	}
}

// PlanRecordOffsets returns tyOffset, payloadOffset, and endCursor for the next tape append.
// Packed layout: [ty:1][payload:size] with no padding (matches on-chain plan_record_offsets).
func PlanRecordOffsets(cursor uint32, valueTypeTag uint8) (tyOffset, payloadOffset, endCursor uint32, err error) {
	size, err := ValueTypeSize(valueTypeTag)
	if err != nil {
		return 0, 0, 0, err
	}
	tyOffset = cursor
	payloadOffset = cursor + 1
	endCursor = payloadOffset + uint32(size)
	if endCursor > constants.MaxFrameTapeLen {
		return 0, 0, 0, fmt.Errorf("binding does not fit in frame tape (max %d bytes)", constants.MaxFrameTapeLen)
	}
	return tyOffset, payloadOffset, endCursor, nil
}

// RecordByteLength returns bytes for one binding record [ty:1][payload].
func RecordByteLength(valueTypeTag uint8) (int, error) {
	size, err := ValueTypeSize(valueTypeTag)
	if err != nil {
		return 0, err
	}
	return 1 + size, nil
}
