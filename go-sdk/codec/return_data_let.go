package codec

import (
	"fmt"

	"github.com/ifx-run/ifx/go-sdk/frame"
	"github.com/ifx-run/ifx/go-sdk/typed"
	"github.com/ifx-run/ifx/go-sdk/wire"
)

// Solana set_return_data ceiling. A let past this cannot succeed.
const SolanaMaxReturnData = 1024

// ReturnDataLet is one fixed-width slice of CPI return data.
type ReturnDataLet struct {
	Ty     typed.IfxTy
	Offset uint16
}

// EncodeReturnDataLets serializes the u8 count plus {ValueType, u16 offset} entries.
func EncodeReturnDataLets(lets []ReturnDataLet) ([]byte, error) {
	if len(lets) == 0 || len(lets) > 255 {
		return nil, fmt.Errorf("ifx_let_patched_cpi requires 1..=255 return-data lets (got %d)", len(lets))
	}
	buf := []byte{uint8(len(lets))}
	for _, item := range lets {
		tag, err := typed.ValueTypeTag(item.Ty)
		if err != nil {
			return nil, err
		}
		width, err := frame.ValueTypeSize(tag)
		if err != nil {
			return nil, err
		}
		if int(item.Offset)+width > SolanaMaxReturnData {
			return nil, fmt.Errorf("return-data let offset %d + %d exceeds %d", item.Offset, width, SolanaMaxReturnData)
		}
		buf = append(buf, tag)
		buf, err = wire.AppendU16LE(buf, item.Offset)
		if err != nil {
			return nil, err
		}
	}
	return buf, nil
}
