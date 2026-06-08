package scratch

import (
	"github.com/ifx-run/ifx/go-sdk/binding"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/typed"
)

func (b *LetBuilder) planAt(tag uint8, account interface{}) (typed.ScratchValue, error) {
	i := b.AccountIndex(account)
	sv, err := b.scratch.PlanAtRemainingIndex(binding.AccountIndex{Tag: tag, AccountIndex: 0}, uint8(i))
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

func (b *LetBuilder) LetConstBool(v bool) (typed.ScratchValue, error) {
	return b.LetEval(expr.Bool(v))
}

func (b *LetBuilder) ClockEpochStartTimestamp() (typed.ScratchValue, error) {
	sv, err := b.scratch.ClockEpochStartTimestamp()
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

func (b *LetBuilder) ClockEpoch() (typed.ScratchValue, error) {
	sv, err := b.scratch.ClockEpoch()
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

func (b *LetBuilder) ClockLeaderScheduleEpoch() (typed.ScratchValue, error) {
	sv, err := b.scratch.ClockLeaderScheduleEpoch()
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

func (b *LetBuilder) ClockUnixTimestamp() (typed.ScratchValue, error) {
	sv, err := b.scratch.ClockUnixTimestamp()
	if err != nil {
		return typed.ScratchValue{}, err
	}
	return b.push(sv), nil
}

func (b *LetBuilder) SplTokenDelegatedAmount(account interface{}) (typed.ScratchValue, error) {
	return b.planAt(constants.LetTagSplTokenAccountDelegatedAmount, account)
}

func (b *LetBuilder) SplTokenAccountState(account interface{}) (typed.ScratchValue, error) {
	return b.planAt(constants.LetTagSplTokenAccountState, account)
}

func (b *LetBuilder) SplMintSupply(account interface{}) (typed.ScratchValue, error) {
	return b.planAt(constants.LetTagSplMintSupply, account)
}

func (b *LetBuilder) SplMintDecimals(account interface{}) (typed.ScratchValue, error) {
	return b.planAt(constants.LetTagSplMintDecimals, account)
}

func (b *LetBuilder) SplToken2022Amount(account interface{}) (typed.ScratchValue, error) {
	return b.planAt(constants.LetTagSplToken2022AccountAmount, account)
}

func (b *LetBuilder) SplToken2022DelegatedAmount(account interface{}) (typed.ScratchValue, error) {
	return b.planAt(constants.LetTagSplToken2022AccountDelegatedAmount, account)
}

func (b *LetBuilder) SplToken2022AccountState(account interface{}) (typed.ScratchValue, error) {
	return b.planAt(constants.LetTagSplToken2022AccountState, account)
}

func (b *LetBuilder) SplToken2022TransferFeeWithheld(account interface{}) (typed.ScratchValue, error) {
	return b.planAt(constants.LetTagSplToken2022AccountTransferFeeWithheld, account)
}

func (b *LetBuilder) SplToken2022MintSupply(account interface{}) (typed.ScratchValue, error) {
	return b.planAt(constants.LetTagSplToken2022MintSupply, account)
}

func (b *LetBuilder) SplToken2022MintDecimals(account interface{}) (typed.ScratchValue, error) {
	return b.planAt(constants.LetTagSplToken2022MintDecimals, account)
}

func (b *LetBuilder) SplToken2022MintTransferFeeBasisPoints(account interface{}) (typed.ScratchValue, error) {
	return b.planAt(constants.LetTagSplToken2022MintTransferFeeBasisPoints, account)
}

func (b *LetBuilder) SplToken2022MintTransferFeeMaximum(account interface{}) (typed.ScratchValue, error) {
	return b.planAt(constants.LetTagSplToken2022MintTransferFeeMaximum, account)
}

func (b *LetBuilder) SplToken2022MintWithheldAmount(account interface{}) (typed.ScratchValue, error) {
	return b.planAt(constants.LetTagSplToken2022MintWithheldAmount, account)
}

func (b *LetBuilder) SplToken2022MintDefaultAccountState(account interface{}) (typed.ScratchValue, error) {
	return b.planAt(constants.LetTagSplToken2022MintDefaultAccountState, account)
}
