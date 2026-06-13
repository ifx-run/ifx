// Package examples provides reusable Ifx business transaction planners.
package examples

import (
	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/scratch"
	"github.com/ifx-run/ifx/go-sdk/structuredcpi"
)

// TwoHopTokenSwapAccounts wire accounts for A→USDC→B same-tx orchestration.
type TwoHopTokenSwapAccounts struct {
	// UserUsdcAta is the intermediate mint ATA (e.g. USDC); must exist before this tx.
	UserUsdcAta solana.PublicKey
}

// TwoHopTokenSwapInstructions hop templates for two-hop swap.
type TwoHopTokenSwapInstructions struct {
	Hop1         solana.Instruction
	Hop2Template solana.Instruction
	Hop2Deliver  *solana.Instruction // optional deliver leg after patched hop2
}

// PlanTwoHopTokenSwapInstructions returns reset → hop1 → let USDC → patched hop2 [→ deliver].
// Mirrors sdk/examples/two-hop-token-swap.ts.
func PlanTwoHopTokenSwapInstructions(
	s *scratch.FrameScratch,
	accounts TwoHopTokenSwapAccounts,
	hops TwoHopTokenSwapInstructions,
) ([]solana.Instruction, error) {
	out := []solana.Instruction{s.IxReset(), hops.Hop1}

	b := s.LetBuilder()
	usdcOut, err := b.SplTokenAmount(accounts.UserUsdcAta)
	if err != nil {
		return nil, err
	}
	letIx, err := b.BuildIx()
	if err != nil {
		return nil, err
	}
	out = append(out, letIx)

	hop2Built, err := structuredcpi.StructuredCpi(
		hops.Hop2Template,
		structuredcpi.StructuredCpiPatch.TokenTransfer(structuredcpi.AsFrameValue(usdcOut)),
	)
	if err != nil {
		return nil, err
	}
	hop2, err := hop2Built.Build(nil)
	if err != nil {
		return nil, err
	}
	cpiIx, err := s.IxCpi(hop2)
	if err != nil {
		return nil, err
	}
	out = append(out, cpiIx)

	if hops.Hop2Deliver != nil {
		out = append(out, *hops.Hop2Deliver)
	}
	return out, nil
}
