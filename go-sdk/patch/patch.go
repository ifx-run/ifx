// Package patch builds CpiPatch values for patched CPI.
package patch

import (
	"github.com/ifx-run/ifx/go-sdk/codec"
	"github.com/ifx-run/ifx/go-sdk/typed"
)

// CpiPatch overwrites template CPI data from a frame binding index.
func CpiPatch(dataOffset uint16, at typed.ScratchValue) codec.CpiPatch {
	return codec.CpiPatch{
		DataOffset:  dataOffset,
		SourceIndex: at.Index,
	}
}
