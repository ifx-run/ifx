package frame

import (
	"encoding/binary"
	"fmt"

	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/constants"
)

const (
	offAuthority    = 1
	offCursor       = 33
	offIndexCount   = 37
	offIndexCap     = 39
	offGeneration   = 41
	offPayloadAtLen = 49
	offPayloadAt    = 53
)

// DecodedFrame is a snapshot of on-chain Frame account data.
type DecodedFrame struct {
	Authority  solana.PublicKey
	Cursor     uint32
	IndexCount uint16
	IndexCap   uint16
	Generation uint64
	PayloadAt  []uint16
	Tape       []byte
}

// DecodeFrameAccount parses Frame account bytes (including 1-byte discriminator).
// For integration tests and local debugging only — not for production.
func DecodeFrameAccount(data []byte) (*DecodedFrame, error) {
	if len(data) < offPayloadAt+4+4 {
		return nil, fmt.Errorf("frame account data too short")
	}
	if data[0] != constants.AccountDiscFrame {
		return nil, fmt.Errorf("invalid Frame account discriminator")
	}
	authority := solana.PublicKeyFromBytes(data[offAuthority : offAuthority+32])
	cursor := binary.LittleEndian.Uint32(data[offCursor:])
	indexCount := binary.LittleEndian.Uint16(data[offIndexCount:])
	indexCap := binary.LittleEndian.Uint16(data[offIndexCap:])
	generation := binary.LittleEndian.Uint64(data[offGeneration:])
	payloadAtLen := binary.LittleEndian.Uint32(data[offPayloadAtLen:])
	payloadAt := make([]uint16, payloadAtLen)
	o := offPayloadAt
	for i := uint32(0); i < payloadAtLen; i++ {
		if o+2 > len(data) {
			return nil, fmt.Errorf("truncated payload_at")
		}
		payloadAt[i] = binary.LittleEndian.Uint16(data[o:])
		o += 2
	}
	if uint32(indexCap) != payloadAtLen {
		return nil, fmt.Errorf("payload_at length mismatch: %d vs indexCap %d", payloadAtLen, indexCap)
	}
	if o+4 > len(data) {
		return nil, fmt.Errorf("truncated tape length")
	}
	tapeLen := binary.LittleEndian.Uint32(data[o:])
	o += 4
	if o+int(tapeLen) != len(data) {
		return nil, fmt.Errorf("tape length mismatch")
	}
	tape := make([]byte, tapeLen)
	copy(tape, data[o:o+int(tapeLen)])
	return &DecodedFrame{
		Authority:  authority,
		Cursor:     cursor,
		IndexCount: indexCount,
		IndexCap:   indexCap,
		Generation: generation,
		PayloadAt:  payloadAt,
		Tape:       tape,
	}, nil
}
