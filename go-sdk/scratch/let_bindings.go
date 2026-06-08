package scratch

import (
	"github.com/ifx-run/ifx/go-sdk/binding"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/typed"
)

func (s *FrameScratch) letOneAccount(tag uint8, account interface{}) (typed.ScratchValue, error) {
	meta := toLetMeta(account)
	return s.plan(binding.AccountIndex{Tag: tag, AccountIndex: 0}, []typed.AccountMeta{meta})
}

func (s *FrameScratch) letToken2022(tag uint8, account interface{}) (typed.ScratchValue, error) {
	return s.letOneAccount(tag, account)
}

// SplTokenDelegatedAmount reads SPL token account delegated amount.
func (s *FrameScratch) SplTokenDelegatedAmount(account interface{}) (typed.ScratchValue, error) {
	return s.letOneAccount(constants.LetTagSplTokenAccountDelegatedAmount, account)
}

// SplTokenAccountState reads SPL token account state byte.
func (s *FrameScratch) SplTokenAccountState(account interface{}) (typed.ScratchValue, error) {
	return s.letOneAccount(constants.LetTagSplTokenAccountState, account)
}

// SplMintSupply reads SPL mint supply.
func (s *FrameScratch) SplMintSupply(account interface{}) (typed.ScratchValue, error) {
	return s.letOneAccount(constants.LetTagSplMintSupply, account)
}

func (s *FrameScratch) ClockEpochStartTimestamp() (typed.ScratchValue, error) {
	return s.plan(binding.SysvarClockEpochStartTimestamp(), nil)
}

func (s *FrameScratch) ClockEpoch() (typed.ScratchValue, error) {
	return s.plan(binding.SysvarClockEpoch(), nil)
}

func (s *FrameScratch) ClockLeaderScheduleEpoch() (typed.ScratchValue, error) {
	return s.plan(binding.SysvarClockLeaderScheduleEpoch(), nil)
}

func (s *FrameScratch) SplToken2022Amount(account interface{}) (typed.ScratchValue, error) {
	return s.letToken2022(constants.LetTagSplToken2022AccountAmount, account)
}

func (s *FrameScratch) SplToken2022DelegatedAmount(account interface{}) (typed.ScratchValue, error) {
	return s.letToken2022(constants.LetTagSplToken2022AccountDelegatedAmount, account)
}

func (s *FrameScratch) SplToken2022AccountState(account interface{}) (typed.ScratchValue, error) {
	return s.letToken2022(constants.LetTagSplToken2022AccountState, account)
}

func (s *FrameScratch) SplToken2022TransferFeeWithheld(account interface{}) (typed.ScratchValue, error) {
	return s.letToken2022(constants.LetTagSplToken2022AccountTransferFeeWithheld, account)
}

func (s *FrameScratch) SplToken2022MintSupply(account interface{}) (typed.ScratchValue, error) {
	return s.letToken2022(constants.LetTagSplToken2022MintSupply, account)
}

func (s *FrameScratch) SplToken2022MintDecimals(account interface{}) (typed.ScratchValue, error) {
	return s.letToken2022(constants.LetTagSplToken2022MintDecimals, account)
}

func (s *FrameScratch) SplToken2022MintTransferFeeBasisPoints(account interface{}) (typed.ScratchValue, error) {
	return s.letToken2022(constants.LetTagSplToken2022MintTransferFeeBasisPoints, account)
}

func (s *FrameScratch) SplToken2022MintTransferFeeMaximum(account interface{}) (typed.ScratchValue, error) {
	return s.letToken2022(constants.LetTagSplToken2022MintTransferFeeMaximum, account)
}

func (s *FrameScratch) SplToken2022MintWithheldAmount(account interface{}) (typed.ScratchValue, error) {
	return s.letToken2022(constants.LetTagSplToken2022MintWithheldAmount, account)
}

func (s *FrameScratch) SplToken2022MintDefaultAccountState(account interface{}) (typed.ScratchValue, error) {
	return s.letToken2022(constants.LetTagSplToken2022MintDefaultAccountState, account)
}
