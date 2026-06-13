package examples

import (
	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/scratch"
	"github.com/ifx-run/ifx/go-sdk/structuredcpi"
)

// SponsoredBuyAccounts wire accounts for sponsored swap settlement.
type SponsoredBuyAccounts struct {
	Sponsor solana.PublicKey
	User    solana.PublicKey
	Pool    solana.PublicKey
	UserATA solana.PublicKey
}

// SponsoredBuyParams planner parameters.
type SponsoredBuyParams struct {
	TxSigFee uint64
}

// PlanSponsoredBuyInstructions mirrors tests/sponsored_buy.ts and rust-sdk planners/sponsored_buy.rs.
func PlanSponsoredBuyInstructions(
	s *scratch.FrameScratch,
	accts SponsoredBuyAccounts,
	params SponsoredBuyParams,
	mockSwapLamports uint64,
	idempotentATACreate solana.Instruction,
) ([]solana.Instruction, error) {
	txSigFee := params.TxSigFee
	out := []solana.Instruction{s.IxReset()}

	letBaseline := s.LetBuilder()
	userLamportsBaseline, err := letBaseline.Lamports(accts.User)
	if err != nil {
		return nil, err
	}
	ataLamportsBaseline, err := letBaseline.Lamports(accts.UserATA)
	if err != nil {
		return nil, err
	}
	baselineIx, err := letBaseline.BuildIx()
	if err != nil {
		return nil, err
	}
	out = append(out, baselineIx)

	out = append(out, idempotentATACreate)

	letAta := s.LetBuilder()
	ataLamportsAfterCreate, err := letAta.Lamports(accts.UserATA)
	if err != nil {
		return nil, err
	}
	ataCost, err := letAta.LetEval(expr.Sub(
		expr.Ref(ataLamportsAfterCreate.Index),
		expr.Ref(ataLamportsBaseline.Index),
	))
	if err != nil {
		return nil, err
	}
	ataIx, err := letAta.BuildIx()
	if err != nil {
		return nil, err
	}
	out = append(out, ataIx)

	out = append(out, system.NewTransferInstruction(mockSwapLamports, accts.Pool, accts.User).Build())

	letPostSwap := s.LetBuilder()
	userLamportsAfterSwap, err := letPostSwap.Lamports(accts.User)
	if err != nil {
		return nil, err
	}
	settle, err := letPostSwap.LetEval(expr.Add(
		expr.Ref(ataCost.Index),
		expr.U64(txSigFee),
	))
	if err != nil {
		return nil, err
	}
	buyLamports, err := letPostSwap.LetEval(expr.Sub(
		expr.Sub(
			expr.Ref(userLamportsAfterSwap.Index),
			expr.Ref(userLamportsBaseline.Index),
		),
		expr.Ref(settle.Index),
	))
	if err != nil {
		return nil, err
	}
	postSwapIx, err := letPostSwap.BuildIx()
	if err != nil {
		return nil, err
	}
	out = append(out, postSwapIx)

	assertIx, err := s.IxAssert(expr.Ge(
		expr.Sub(
			expr.Ref(userLamportsAfterSwap.Index),
			expr.Ref(userLamportsBaseline.Index),
		),
		expr.Add(expr.Ref(ataCost.Index), expr.U64(txSigFee)),
	))
	if err != nil {
		return nil, err
	}
	out = append(out, assertIx)

	settleBuilt, err := structuredcpi.StructuredCpi(
		system.NewTransferInstruction(0, accts.User, accts.Sponsor).Build(),
		structuredcpi.StructuredCpiPatch.SystemTransfer(structuredcpi.AsFrameValue(settle)),
	)
	if err != nil {
		return nil, err
	}
	settleXfer, err := settleBuilt.Build(nil)
	if err != nil {
		return nil, err
	}
	settleCpi, err := s.IxCpi(settleXfer)
	if err != nil {
		return nil, err
	}
	out = append(out, settleCpi)

	buyBuilt, err := structuredcpi.StructuredCpi(
		system.NewTransferInstruction(0, accts.User, accts.Pool).Build(),
		structuredcpi.StructuredCpiPatch.SystemTransfer(structuredcpi.AsFrameValue(buyLamports)),
	)
	if err != nil {
		return nil, err
	}
	buyXfer, err := buyBuilt.Build(nil)
	if err != nil {
		return nil, err
	}
	buyCpi, err := s.IxCpi(buyXfer)
	if err != nil {
		return nil, err
	}
	out = append(out, buyCpi)

	return out, nil
}
