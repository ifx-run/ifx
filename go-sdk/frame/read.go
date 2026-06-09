package frame

import (
	"encoding/binary"
	"fmt"
	"math"

	"github.com/ifx-run/ifx/go-sdk/typed"
)

func payloadOffsetForIndex(dec *DecodedFrame, bindingIndex uint8) (uint16, error) {
	if int(bindingIndex) >= int(dec.IndexCount) {
		return 0, fmt.Errorf("binding index %d out of range (indexCount=%d)", bindingIndex, dec.IndexCount)
	}
	if int(bindingIndex) >= len(dec.PayloadAt) {
		return 0, fmt.Errorf("binding index %d out of range (payloadAt len %d)", bindingIndex, len(dec.PayloadAt))
	}
	return dec.PayloadAt[bindingIndex], nil
}

func readPayload(tape []byte, payloadOffset uint16, ty typed.IfxTy) ([]byte, error) {
	tag, err := typed.ValueTypeTag(ty)
	if err != nil {
		return nil, err
	}
	size, err := ValueTypeSize(tag)
	if err != nil {
		return nil, err
	}
	end := int(payloadOffset) + size
	if end > len(tape) {
		return nil, fmt.Errorf("read past frame tape (%d > %d) at byte %d", end, len(tape), payloadOffset)
	}
	out := make([]byte, size)
	copy(out, tape[payloadOffset:uint32(end)])
	return out, nil
}

func tyForValue(sv typed.ScratchValue) (typed.IfxTy, error) {
	if sv.Ty != "" {
		return sv.Ty, nil
	}
	return typed.InferBindingTy(sv.Binding, nil)
}

// ReadValue reads a bound value from this snapshot via binding index.
func (dec *DecodedFrame) ReadValue(sv typed.ScratchValue) (interface{}, error) {
	ty, err := tyForValue(sv)
	if err != nil {
		return nil, err
	}
	off, err := payloadOffsetForIndex(dec, sv.Index)
	if err != nil {
		return nil, err
	}
	bytes, err := readPayload(dec.Tape, off, ty)
	if err != nil {
		return nil, err
	}
	return decodePayloadBytes(bytes, ty)
}

func decodePayloadBytes(bytes []byte, ty typed.IfxTy) (interface{}, error) {
	switch ty {
	case typed.TyBool:
		return bytes[0] != 0, nil
	case typed.TyU8:
		return bytes[0], nil
	case typed.TyU16:
		return binary.LittleEndian.Uint16(bytes), nil
	case typed.TyU32:
		return binary.LittleEndian.Uint32(bytes), nil
	case typed.TyU64:
		return binary.LittleEndian.Uint64(bytes), nil
	case typed.TyU128:
		lo := binary.LittleEndian.Uint64(bytes[:8])
		hi := binary.LittleEndian.Uint64(bytes[8:])
		return hi<<64 | lo, nil
	case typed.TyI8:
		return int8(bytes[0]), nil
	case typed.TyI16:
		return int16(binary.LittleEndian.Uint16(bytes)), nil
	case typed.TyI32:
		return int32(binary.LittleEndian.Uint32(bytes)), nil
	case typed.TyI64:
		return int64(binary.LittleEndian.Uint64(bytes)), nil
	case typed.TyI128:
		return decodeI128(bytes)
	case typed.TyF32:
		return math.Float32frombits(binary.LittleEndian.Uint32(bytes)), nil
	case typed.TyF64:
		return math.Float64frombits(binary.LittleEndian.Uint64(bytes)), nil
	case typed.TyPubkey:
		if len(bytes) != 32 {
			return nil, fmt.Errorf("pubkey requires 32 bytes")
		}
		var pk [32]byte
		copy(pk[:], bytes)
		return pk, nil
	default:
		return nil, fmt.Errorf("unsupported read type %q", ty)
	}
}

func decodeI128(bytes []byte) (int64, error) {
	if len(bytes) != 16 {
		return 0, fmt.Errorf("i128 requires 16 bytes")
	}
	hi := binary.LittleEndian.Uint64(bytes[8:])
	if hi != 0 {
		return 0, fmt.Errorf("i128 values beyond int64 are not supported in ReadI128")
	}
	return int64(binary.LittleEndian.Uint64(bytes[:8])), nil
}

func (dec *DecodedFrame) ReadBool(sv typed.ScratchValue) (bool, error) {
	v, err := dec.ReadValue(sv)
	if err != nil {
		return false, err
	}
	b, ok := v.(bool)
	if !ok {
		return false, fmt.Errorf("expected bool, got %T", v)
	}
	return b, nil
}

func (dec *DecodedFrame) ReadU8(sv typed.ScratchValue) (uint8, error) {
	v, err := dec.ReadValue(sv)
	if err != nil {
		return 0, err
	}
	switch n := v.(type) {
	case uint8:
		return n, nil
	default:
		return 0, fmt.Errorf("expected u8, got %T", v)
	}
}

func (dec *DecodedFrame) ReadU16(sv typed.ScratchValue) (uint16, error) {
	v, err := dec.ReadValue(sv)
	if err != nil {
		return 0, err
	}
	n, ok := v.(uint16)
	if !ok {
		return 0, fmt.Errorf("expected u16, got %T", v)
	}
	return n, nil
}

func (dec *DecodedFrame) ReadU32(sv typed.ScratchValue) (uint32, error) {
	v, err := dec.ReadValue(sv)
	if err != nil {
		return 0, err
	}
	n, ok := v.(uint32)
	if !ok {
		return 0, fmt.Errorf("expected u32, got %T", v)
	}
	return n, nil
}

func (dec *DecodedFrame) ReadU64(sv typed.ScratchValue) (uint64, error) {
	v, err := dec.ReadValue(sv)
	if err != nil {
		return 0, err
	}
	switch n := v.(type) {
	case uint64:
		return n, nil
	default:
		return 0, fmt.Errorf("expected u64, got %T", v)
	}
}

func (dec *DecodedFrame) ReadI64(sv typed.ScratchValue) (int64, error) {
	v, err := dec.ReadValue(sv)
	if err != nil {
		return 0, err
	}
	n, ok := v.(int64)
	if !ok {
		return 0, fmt.Errorf("expected i64, got %T", v)
	}
	return n, nil
}

func (dec *DecodedFrame) ReadPubkey(sv typed.ScratchValue) ([32]byte, error) {
	v, err := dec.ReadValue(sv)
	if err != nil {
		return [32]byte{}, err
	}
	pk, ok := v.([32]byte)
	if !ok {
		return [32]byte{}, fmt.Errorf("expected pubkey, got %T", v)
	}
	return pk, nil
}
