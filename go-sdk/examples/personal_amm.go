package examples

import (
	"fmt"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/scratch"
	"github.com/ifx-run/ifx/go-sdk/structuredcpi"
	"github.com/ifx-run/ifx/go-sdk/typed"
)

// BpsDenom is the basis-point denominator (1 bp = 0.01%).
const BpsDenom uint64 = 10_000

// PersonalAmmDefaultFeeBps is the default output-side fee (30 bps = 0.3%).
const PersonalAmmDefaultFeeBps uint64 = 30

// PersonalAmmAccounts wire accounts for wallet-pool constant-product swap.
type PersonalAmmAccounts struct {
	User           solana.PublicKey
	Pool           solana.PublicKey
	UserTokenAAta  solana.PublicKey
	PoolTokenAAta  solana.PublicKey
	UserTokenBAta  solana.PublicKey
	PoolTokenBAta  solana.PublicKey
	TokenProgram   solana.PublicKey // zero → standard SPL Token program
}

// PersonalAmmSwapParams swap quote parameters.
type PersonalAmmSwapParams struct {
	AmountIn uint64
	MinOut   uint64
	FeeBps   *uint64 // nil → PersonalAmmDefaultFeeBps
}

// PersonalAmmBindings on-chain binding handles from the planner.
type PersonalAmmBindings struct {
	ReserveTokenA typed.ScratchValue
	ReserveTokenB typed.ScratchValue
	AmountIn      typed.ScratchValue
	AmountOut     typed.ScratchValue
	MinOut        typed.ScratchValue
}

// PersonalAmmSwapPlan planner output.
type PersonalAmmSwapPlan struct {
	Bindings     PersonalAmmBindings
	Instructions []solana.Instruction
}

// ComputeSwapOutput mirrors sdk/examples/personal-amm-swap.ts computeSwapOutput.
func ComputeSwapOutput(reserveTokenA, reserveTokenB, amountIn uint64, feeBps uint64) uint64 {
	if amountIn == 0 {
		return 0
	}
	denom := reserveTokenA + amountIn
	if denom == 0 {
		return 0
	}
	gross := reserveTokenB * amountIn / denom
	if feeBps == 0 {
		return gross
	}
	if feeBps >= BpsDenom {
		return 0
	}
	return gross * (BpsDenom - feeBps) / BpsDenom
}

func resolveFeeBps(feeBps *uint64) (uint64, error) {
	bps := PersonalAmmDefaultFeeBps
	if feeBps != nil {
		bps = *feeBps
	}
	if bps > BpsDenom {
		return 0, fmt.Errorf("feeBps must be in [0, %d], got %d", BpsDenom, bps)
	}
	return bps, nil
}

// PlanPersonalAmmSwapInstructions mirrors sdk/examples/personal-amm-swap.ts.
func PlanPersonalAmmSwapInstructions(
	s *scratch.FrameScratch,
	accounts PersonalAmmAccounts,
	params PersonalAmmSwapParams,
) (PersonalAmmSwapPlan, error) {
	feeBps, err := resolveFeeBps(params.FeeBps)
	if err != nil {
		return PersonalAmmSwapPlan{}, err
	}
	tokenProgram := accounts.TokenProgram
	if tokenProgram.IsZero() {
		tokenProgram = token.ProgramID
	}

	out := []solana.Instruction{s.IxReset()}

	b := s.LetBuilder()
	reserveTokenA, err := b.SplTokenAmount(accounts.PoolTokenAAta)
	if err != nil {
		return PersonalAmmSwapPlan{}, err
	}
	reserveTokenB, err := b.SplTokenAmount(accounts.PoolTokenBAta)
	if err != nil {
		return PersonalAmmSwapPlan{}, err
	}
	amountIn, err := b.LetConstU64(params.AmountIn)
	if err != nil {
		return PersonalAmmSwapPlan{}, err
	}
	xPlusDx, err := b.LetEval(expr.Add(
		expr.Ref(reserveTokenA.Index),
		expr.Ref(amountIn.Index),
	))
	if err != nil {
		return PersonalAmmSwapPlan{}, err
	}
	amountOutGross, err := b.LetEval(expr.MulDivFloor(
		expr.AsU128(expr.Ref(reserveTokenB.Index)),
		expr.AsU128(expr.Ref(amountIn.Index)),
		expr.AsU128(expr.Ref(xPlusDx.Index)),
	))
	if err != nil {
		return PersonalAmmSwapPlan{}, err
	}
	amountOutGrossU64, err := b.LetEval(expr.AsU64(expr.Ref(amountOutGross.Index)))
	if err != nil {
		return PersonalAmmSwapPlan{}, err
	}
	var amountOut typed.ScratchValue
	if feeBps == 0 {
		amountOut = amountOutGrossU64
	} else {
		amountOut, err = b.LetEval(expr.BpsMulFloor(
			expr.Ref(amountOutGrossU64.Index),
			expr.U16(uint16(BpsDenom-feeBps)),
		))
		if err != nil {
			return PersonalAmmSwapPlan{}, err
		}
	}
	minOut, err := b.LetConstU64(params.MinOut)
	if err != nil {
		return PersonalAmmSwapPlan{}, err
	}
	letIx, err := b.BuildIx()
	if err != nil {
		return PersonalAmmSwapPlan{}, err
	}
	out = append(out, letIx)

	assertIx, err := s.IxAssert(expr.Ge(
		expr.Ref(amountOut.Index),
		expr.Ref(minOut.Index),
	))
	if err != nil {
		return PersonalAmmSwapPlan{}, err
	}
	out = append(out, assertIx)

	debit, err := token.NewTransferInstruction(
		params.AmountIn,
		accounts.UserTokenAAta,
		accounts.PoolTokenAAta,
		accounts.User,
		[]solana.PublicKey{},
	).ValidateAndBuild()
	if err != nil {
		return PersonalAmmSwapPlan{}, err
	}
	out = append(out, debit)

	creditTpl, err := token.NewTransferInstruction(
		0,
		accounts.PoolTokenBAta,
		accounts.UserTokenBAta,
		accounts.Pool,
		[]solana.PublicKey{},
	).ValidateAndBuild()
	if err != nil {
		return PersonalAmmSwapPlan{}, err
	}
	creditBuilt, err := structuredcpi.StructuredCpi(
		creditTpl,
		structuredcpi.StructuredCpiPatch.TokenTransfer(structuredcpi.AsFrameValue(amountOut)),
	)
	if err != nil {
		return PersonalAmmSwapPlan{}, err
	}
	credit, err := creditBuilt.Build(nil)
	if err != nil {
		return PersonalAmmSwapPlan{}, err
	}
	creditIx, err := s.IxCpi(credit)
	if err != nil {
		return PersonalAmmSwapPlan{}, err
	}
	out = append(out, creditIx)

	return PersonalAmmSwapPlan{
		Bindings: PersonalAmmBindings{
			ReserveTokenA: reserveTokenA,
			ReserveTokenB: reserveTokenB,
			AmountIn:      amountIn,
			AmountOut:     amountOut,
			MinOut:        minOut,
		},
		Instructions: out,
	}, nil
}
