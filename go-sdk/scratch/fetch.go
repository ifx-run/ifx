package scratch

import (
	"context"
	"fmt"

	"github.com/gagliardetto/solana-go/rpc"
	"github.com/ifx-run/ifx/go-sdk/frame"
)

// FetchDecodedFrame loads and decodes the on-chain Frame account.
// For integration tests and local debugging only — not for production.
func (s *FrameScratch) FetchDecodedFrame(ctx context.Context, client *rpc.Client, commitment rpc.CommitmentType) (*frame.DecodedFrame, error) {
	if commitment == "" {
		commitment = rpc.CommitmentConfirmed
	}
	acct, err := client.GetAccountInfoWithOpts(ctx, s.Frame, &rpc.GetAccountInfoOpts{
		Commitment: commitment,
	})
	if err != nil {
		return nil, err
	}
	if acct == nil || acct.Value == nil {
		return nil, fmt.Errorf("frame account %s not found", s.Frame)
	}
	dec, err := frame.DecodeFrameAccount(acct.Value.Data.GetBinary())
	if err != nil {
		return nil, err
	}
	return dec, nil
}

// RefreshFromChain syncs planner cursor/indexCount from a chain snapshot.
// Tests and local debugging only — not for production.
func (s *FrameScratch) RefreshFromChain(ctx context.Context, client *rpc.Client, commitment rpc.CommitmentType) (*frame.DecodedFrame, error) {
	dec, err := s.FetchDecodedFrame(ctx, client, commitment)
	if err != nil {
		return nil, err
	}
	s.Cursor = dec.Cursor
	s.NextIndex = uint8(dec.IndexCount)
	return dec, nil
}
