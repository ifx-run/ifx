// Package constants holds on-chain limits and discriminators (programs/ifx/src/constants.rs).
package constants

import (
	"fmt"

	"github.com/gagliardetto/solana-go"
)

const (
	FrameSeed = "frame"

	MinTapeLen       = 1
	MaxFrameTapeLen  = 65535
	MaxBindingIndex  = 256
	AccountDiscFrame = 6

	IxDiscCreateFrame = 0
	IxDiscCloseFrame  = 1
	IxDiscResetFrame  = 2
	IxDiscLet         = 3
	IxDiscAssert      = 4
	IxDiscAssertMulti = 5
	IxDiscPatchedCpi  = 6
	IxDiscIfElse      = 7
)

var (
	LocalnetProgramID = solana.MustPublicKeyFromBase58("ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD")
	DevnetProgramID   = solana.MustPublicKeyFromBase58("ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc")
	MainnetProgramID  = solana.MustPublicKeyFromBase58("ifxmwWVVZDmXN2DUVf7wtJYCXTRY4QsL5rzmNkXzxbj")
	// DefaultProgramID is used when ProgramID is omitted (mainnet → testnet → devnet → localnet).
	DefaultProgramID = MainnetProgramID
)

// IndexCapForTapeLen returns min(256, tapeLen/2).
func IndexCapForTapeLen(tapeLen int) (int, error) {
	if tapeLen < MinTapeLen {
		return 0, fmt.Errorf("tapeLen must be >= %d", MinTapeLen)
	}
	optimistic := tapeLen / 2
	if optimistic >= MaxBindingIndex {
		return MaxBindingIndex, nil
	}
	return optimistic, nil
}
