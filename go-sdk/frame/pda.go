package frame

import (
	"fmt"

	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/constants"
)

// FramePDA derives the Frame account address: seeds = ["frame", payer, frame_id].
func FramePDA(programID, payer solana.PublicKey, frameID [32]byte) (solana.PublicKey, uint8, error) {
	if programID.IsZero() {
		programID = constants.DefaultProgramID
	}
	addr, bump, err := solana.FindProgramAddress(
		[][]byte{
			[]byte(constants.FrameSeed),
			payer.Bytes(),
			frameID[:],
		},
		programID,
	)
	return addr, bump, err
}

// CreateFrameArgs is the Borsh payload after IX discriminator for ifx_create_frame.
type CreateFrameArgs struct {
	FrameID        [32]byte
	CloseAuthority solana.PublicKey
	TapeLen        uint32
}

// EncodeCreateFrameArgs serializes create_frame instruction data (without discriminator).
func EncodeCreateFrameArgs(args CreateFrameArgs) ([]byte, error) {
	if args.TapeLen < constants.MinTapeLen || args.TapeLen > constants.MaxFrameTapeLen {
		return nil, fmt.Errorf("tapeLen must be in [%d, %d]", constants.MinTapeLen, constants.MaxFrameTapeLen)
	}
	out := make([]byte, 0, 32+32+4)
	out = append(out, args.FrameID[:]...)
	out = append(out, args.CloseAuthority.Bytes()...)
	var tail [4]byte
	tail[0] = byte(args.TapeLen)
	tail[1] = byte(args.TapeLen >> 8)
	tail[2] = byte(args.TapeLen >> 16)
	tail[3] = byte(args.TapeLen >> 24)
	out = append(out, tail[:]...)
	return out, nil
}
