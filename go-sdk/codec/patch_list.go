package codec

import "github.com/ifx-run/ifx/go-sdk/wire"

// PatchList is U16LenVec<RawCpiPatch> on wire (u16 LE count + entries). Empty = static step.
type PatchList []RawCpiPatch

func PatchListStatic() PatchList {
	return nil
}

func PatchListPatched(patches []RawCpiPatch) PatchList {
	return patches
}

func (p PatchList) HasPatches() bool {
	return len(p) > 0
}

func EncodePatchList(p PatchList) ([]byte, error) {
	out, err := wire.AppendU16LE(nil, uint16(len(p)))
	if err != nil {
		return nil, err
	}
	for i := range p {
		body, err := EncodeRawCpiPatch(p[i])
		if err != nil {
			return nil, err
		}
		out = append(out, body...)
	}
	return out, nil
}
