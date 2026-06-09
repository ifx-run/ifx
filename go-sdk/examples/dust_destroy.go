// Package examples provides reusable Ifx business transaction planners.
package examples

import (
	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/ifelse"
	"github.com/ifx-run/ifx/go-sdk/patch"
	"github.com/ifx-run/ifx/go-sdk/patchedcpi"
	"github.com/ifx-run/ifx/go-sdk/scratch"
	"github.com/ifx-run/ifx/go-sdk/spltoken"
)

// DustThresholdRaw is the raw balance cutoff (NOT UI amount).
const DustThresholdRaw uint64 = 1000

// DustDestroyAccounts wire accounts for Token-2022 dust destroy.
type DustDestroyAccounts struct {
	Mint            solana.PublicKey
	TokenAccount    solana.PublicKey
	Owner           solana.PublicKey
	OwnerSigner     bool
	RentDestination solana.PublicKey
}

// PlanDustDestroyInstructions returns reset + let + three if_else steps (mirrors planDustDestroyTx).
func PlanDustDestroyInstructions(s *scratch.FrameScratch, accts DustDestroyAccounts) ([]solana.Instruction, error) {
	mint := accts.Mint
	tokenAccount := accts.TokenAccount
	owner := accts.Owner
	rentDestination := accts.RentDestination

	out := []solana.Instruction{s.IxReset()}

	b := s.LetBuilder()
	amount, err := b.SplToken2022Amount(tokenAccount)
	if err != nil {
		return nil, err
	}
	withheld, err := b.SplToken2022TransferFeeWithheld(tokenAccount)
	if err != nil {
		return nil, err
	}
	decimals, err := b.SplToken2022MintDecimals(mint)
	if err != nil {
		return nil, err
	}
	letIx, err := b.BuildIx()
	if err != nil {
		return nil, err
	}
	out = append(out, letIx)

	dust := expr.Lt(expr.Ref(amount.Index), expr.U64(DustThresholdRaw))

	burnTpl := spltoken.BurnCheckedInstruction(tokenAccount, mint, owner, accts.OwnerSigner)
	burn, err := patchedcpi.RawCpi(
		burnTpl,
		patch.RawCpiPatch(1, amount),
		patch.RawCpiPatch(9, decimals),
	).Build(nil)
	if err != nil {
		return nil, err
	}
	burnArgs, err := ifelse.Args(
		expr.And(dust, expr.NonZero(expr.Ref(amount.Index))),
		ifelse.Cpi(burn.Cpi),
		ifelse.Skip,
	)
	if err != nil {
		return nil, err
	}
	burnIfElse, err := s.IxIfElse(burnArgs, burn.Remaining)
	if err != nil {
		return nil, err
	}
	out = append(out, burnIfElse)

	harvestTpl := spltoken.HarvestWithheldTokensToMintInstruction(mint, tokenAccount)
	harvestCpi, harvestRem, err := patchedcpi.StaticCpi(harvestTpl, nil)
	if err != nil {
		return nil, err
	}
	harvestArgs, err := ifelse.Args(
		expr.And(dust, expr.NonZero(expr.Ref(withheld.Index))),
		ifelse.Cpi(harvestCpi),
		ifelse.Skip,
	)
	if err != nil {
		return nil, err
	}
	harvestIfElse, err := s.IxIfElse(harvestArgs, harvestRem)
	if err != nil {
		return nil, err
	}
	out = append(out, harvestIfElse)

	closeTpl := spltoken.CloseAccountInstruction(tokenAccount, rentDestination, owner, accts.OwnerSigner)
	closeCpi, closeRem, err := patchedcpi.StaticCpi(closeTpl, nil)
	if err != nil {
		return nil, err
	}
	closeArgs, err := ifelse.Args(dust, ifelse.Cpi(closeCpi), ifelse.Skip)
	if err != nil {
		return nil, err
	}
	closeIfElse, err := s.IxIfElse(closeArgs, closeRem)
	if err != nil {
		return nil, err
	}
	out = append(out, closeIfElse)

	return out, nil
}
