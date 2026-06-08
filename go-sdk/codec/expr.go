package codec

import (
	"fmt"

	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/wire"
)

// EncodeExpr serializes an Expr tree (flat Borsh tags 0..42).
func EncodeExpr(n expr.Node) ([]byte, error) {
	switch v := n.(type) {
	case expr.ValueRef:
		return append([]byte{constants.ExprTagValue}, v.Index), nil
	case expr.ConstBool:
		if v {
			return []byte{constants.ExprTagConstBool, 1}, nil
		}
		return []byte{constants.ExprTagConstBool, 0}, nil
	case expr.ConstU8:
		return []byte{constants.ExprTagConstU8, uint8(v)}, nil
	case expr.ConstU16:
		return wire.AppendU16LE([]byte{constants.ExprTagConstU16}, uint16(v))
	case expr.ConstU32:
		return wire.AppendU32LE([]byte{constants.ExprTagConstU32}, uint32(v))
	case expr.ConstU64:
		return wire.AppendU64LE([]byte{constants.ExprTagConstU64}, uint64(v)), nil
	case expr.ConstU128:
		out, err := wire.AppendU128LE([]byte{constants.ExprTagConstU128}, v.V)
		return out, err
	case expr.ConstI8:
		return []byte{constants.ExprTagConstI8, byte(int8(v))}, nil
	case expr.ConstI16:
		buf := []byte{constants.ExprTagConstI16}
		var b [2]byte
		// little-endian i16
		u := uint16(int16(v))
		b[0] = byte(u)
		b[1] = byte(u >> 8)
		return append(buf, b[:]...), nil
	case expr.ConstI32:
		buf := []byte{constants.ExprTagConstI32}
		u := uint32(int32(v))
		return wire.AppendU32LE(buf, u)
	case expr.ConstI64:
		return wire.AppendI64LE([]byte{constants.ExprTagConstI64}, int64(v)), nil
	case expr.ConstI128:
		return wire.AppendI128LE([]byte{constants.ExprTagConstI128}, v.V)
	case expr.ConstF32:
		return wire.AppendF32LE([]byte{constants.ExprTagConstF32}, float32(v)), nil
	case expr.ConstF64:
		return wire.AppendF64LE([]byte{constants.ExprTagConstF64}, float64(v)), nil
	case expr.Unary:
		return encodeUnary(v.Tag, v.Operand)
	case expr.Binary:
		return encodeBinary(v.Tag, v.Lhs, v.Rhs)
	case expr.Ternary:
		return encodeTernary(v.Tag, v.A, v.B, v.C)
	default:
		return nil, fmt.Errorf("invalid Expr node %T", n)
	}
}

func encodeUnary(tag uint8, operand expr.Node) ([]byte, error) {
	op, err := EncodeExpr(operand)
	if err != nil {
		return nil, err
	}
	return append([]byte{tag}, op...), nil
}

func encodeBinary(tag uint8, lhs, rhs expr.Node) ([]byte, error) {
	l, err := EncodeExpr(lhs)
	if err != nil {
		return nil, err
	}
	r, err := EncodeExpr(rhs)
	if err != nil {
		return nil, err
	}
	out := append([]byte{tag}, l...)
	out = append(out, r...)
	return out, nil
}

func encodeTernary(tag uint8, a, b, c expr.Node) ([]byte, error) {
	aa, err := EncodeExpr(a)
	if err != nil {
		return nil, err
	}
	bb, err := EncodeExpr(b)
	if err != nil {
		return nil, err
	}
	cc, err := EncodeExpr(c)
	if err != nil {
		return nil, err
	}
	out := append([]byte{tag}, aa...)
	out = append(out, bb...)
	out = append(out, cc...)
	return out, nil
}

// EncodeValue writes binding index only (Value.index u8).
func EncodeValue(index uint8) []byte {
	return []byte{index}
}

// EncodeValueType writes the 1-byte ValueType tag for AccountDataSlice.ty.
func EncodeValueType(tag uint8) []byte {
	return []byte{tag}
}
