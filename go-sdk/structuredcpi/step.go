package structuredcpi

import "github.com/ifx-run/ifx/go-sdk/codec"

// StructuredCpiStep builds a structured CPI step with manual account slice (low-level; prefer Builder).
func StructuredCpiStep(accountsStart, accountsLen, wireTag uint8, payload interface{}) (codec.Cpi, error) {
	body, err := EncodeStructuredCpiPatch(wireTag, payload)
	if err != nil {
		return codec.Cpi{}, err
	}
	return codec.Cpi{
		AccountsStart:     accountsStart,
		AccountsLen:       accountsLen,
		StructuredPayload: body,
	}, nil
}
