// Package wire implements little-endian helpers matching @ifx-run/sdk codec.ts.
package wire

import (
	"encoding/binary"
	"fmt"
	"math"
	"math/big"
)

func AppendU8(buf []byte, v uint8) []byte {
	return append(buf, v)
}

func AppendU16LE(buf []byte, v uint16) ([]byte, error) {
	if v > math.MaxUint16 {
		return nil, fmt.Errorf("u16 out of range: %d", v)
	}
	var b [2]byte
	binary.LittleEndian.PutUint16(b[:], v)
	return append(buf, b[:]...), nil
}

func AppendU32LE(buf []byte, v uint32) ([]byte, error) {
	var b [4]byte
	binary.LittleEndian.PutUint32(b[:], v)
	return append(buf, b[:]...), nil
}

func AppendU64LE(buf []byte, v uint64) []byte {
	var b [8]byte
	binary.LittleEndian.PutUint64(b[:], v)
	return append(buf, b[:]...)
}

func AppendI64LE(buf []byte, v int64) []byte {
	var b [8]byte
	binary.LittleEndian.PutUint64(b[:], uint64(v))
	return append(buf, b[:]...)
}

func AppendF32LE(buf []byte, v float32) []byte {
	var b [4]byte
	binary.LittleEndian.PutUint32(b[:], math.Float32bits(v))
	return append(buf, b[:]...)
}

func AppendF64LE(buf []byte, v float64) []byte {
	var b [8]byte
	binary.LittleEndian.PutUint64(b[:], math.Float64bits(v))
	return append(buf, b[:]...)
}

func AppendU128LE(buf []byte, n *big.Int) ([]byte, error) {
	if n.Sign() < 0 {
		return nil, fmt.Errorf("u128 must be non-negative")
	}
	b := u128BytesLE(n)
	return append(buf, b[:]...), nil
}

func AppendI128LE(buf []byte, n *big.Int) ([]byte, error) {
	b := i128BytesLE(n)
	return append(buf, b[:]...), nil
}

func u128BytesLE(n *big.Int) [16]byte {
	var out [16]byte
	if n.Sign() == 0 {
		return out
	}
	b := new(big.Int).Set(n).Bytes() // big-endian magnitude
	for i := 0; i < len(b) && i < 16; i++ {
		out[i] = b[len(b)-1-i]
	}
	return out
}

func i128BytesLE(n *big.Int) [16]byte {
	mod := new(big.Int).Lsh(big.NewInt(1), 128)
	v := new(big.Int).Mod(n, mod)
	if v.Sign() < 0 {
		v.Add(v, mod)
	}
	return u128BytesLE(v)
}

func AppendU8Len(buf []byte, n int) ([]byte, error) {
	if n < 0 || n > 0xff {
		return nil, fmt.Errorf("U8LenVec length out of u8 range: %d", n)
	}
	return append(buf, uint8(n)), nil
}

func AppendU16Len(buf []byte, n int) ([]byte, error) {
	if n < 0 || n > 0xffff {
		return nil, fmt.Errorf("U16LenVec length out of u16 range: %d", n)
	}
	var b [2]byte
	binary.LittleEndian.PutUint16(b[:], uint16(n))
	return append(buf, b[:]...), nil
}

func AppendU16LenBytes(buf, data []byte) ([]byte, error) {
	out, err := AppendU16Len(buf, len(data))
	if err != nil {
		return nil, err
	}
	return append(out, data...), nil
}

func AppendU8LenVec[T any](buf []byte, items []T, encode func(T) ([]byte, error)) ([]byte, error) {
	out, err := AppendU8Len(buf, len(items))
	if err != nil {
		return nil, err
	}
	for _, item := range items {
		part, err := encode(item)
		if err != nil {
			return nil, err
		}
		out = append(out, part...)
	}
	return out, nil
}

func AppendU16LenVec[T any](buf []byte, items []T, encode func(T) ([]byte, error)) ([]byte, error) {
	out, err := AppendU16Len(buf, len(items))
	if err != nil {
		return nil, err
	}
	for _, item := range items {
		part, err := encode(item)
		if err != nil {
			return nil, err
		}
		out = append(out, part...)
	}
	return out, nil
}
