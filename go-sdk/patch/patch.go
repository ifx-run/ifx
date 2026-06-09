// Package patch builds RawCpiPatch values for patched CPI.
package patch

import (
	"github.com/ifx-run/ifx/go-sdk/codec"
	"github.com/ifx-run/ifx/go-sdk/typed"
)

// RawCpiPatch overwrites template CPI data from a frame binding index.
func RawCpiPatch(dataOffset uint16, at typed.ScratchValue) codec.RawCpiPatch {
	return codec.RawCpiPatch{
		DataOffset:  dataOffset,
		SourceIndex: at.Index,
	}
}
