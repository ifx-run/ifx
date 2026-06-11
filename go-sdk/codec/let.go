package codec

import (
	"fmt"

	"github.com/ifx-run/ifx/go-sdk/binding"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/wire"
)

// LetArgs holds parallel bindings for one ifx_let.
type LetArgs struct {
	Bindings []binding.Node
}

// EncodeLetBinding serializes one LetBinding (wire tags 0..67).
func EncodeLetBinding(b binding.Node) ([]byte, error) {
	switch v := b.(type) {
	case binding.AccountDataSlice:
		buf := []byte{constants.LetTagAccountDataSlice}
		buf = append(buf, EncodeValueType(v.ValueTypeTag)...)
		buf = append(buf, v.AccountIndex)
		var err error
		buf, err = wire.AppendU32LE(buf, v.Offset)
		if err != nil {
			return nil, err
		}
		buf = append(buf, v.ExpectedProgramOwner)
		return buf, nil
	case binding.AccountIndex:
		return []byte{v.Tag, v.AccountIndex}, nil
	case binding.Eval:
		enc, err := EncodeExpr(v.Expr)
		if err != nil {
			return nil, err
		}
		return append([]byte{constants.LetTagEval}, enc...), nil
	case binding.RentMinimumBalance:
		buf := []byte{constants.LetTagSysvarRentMinimumBalance}
		return wire.AppendU32LE(buf, v.DataLen)
	case binding.ConstPubkey:
		buf := []byte{constants.LetTagConstPubkey}
		return append(buf, v.Bytes[:]...), nil
	case binding.Empty:
		return []byte{v.Tag}, nil
	default:
		return nil, fmt.Errorf("invalid LetBinding node %T", b)
	}
}

// EncodeLetArgs serializes LetArgs (U8LenVec<LetBinding>).
func EncodeLetArgs(args LetArgs) ([]byte, error) {
	return wire.AppendU8LenVec(nil, args.Bindings, func(b binding.Node) ([]byte, error) {
		return EncodeLetBinding(b)
	})
}
