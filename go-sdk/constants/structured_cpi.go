package constants

// Structured CPI patch wire tags 0..28 (matches on-chain StructuredCpiPatch::wire_tag).
const (
	// System Program
	StructuredPatchSystemTransfer = iota // (0) Transfer — dynamic lamports
	StructuredPatchSystemCreateAccount   // (1) CreateAccount — LamportsSpacePatch
	StructuredPatchSystemAllocate        // (2) Allocate — dynamic space

	// SPL Token (legacy)
	StructuredPatchTokenTransfer              // (3) Transfer — dynamic amount
	StructuredPatchTokenApprove               // (4) Approve — dynamic amount
	StructuredPatchTokenMintTo                // (5) MintTo — dynamic amount
	StructuredPatchTokenBurn                  // (6) Burn — dynamic amount
	StructuredPatchTokenTransferChecked       // (7) TransferChecked — AmountDecimalsPatch
	StructuredPatchTokenApproveChecked        // (8) ApproveChecked — AmountDecimalsPatch
	StructuredPatchTokenMintToChecked         // (9) MintToChecked — AmountDecimalsPatch
	StructuredPatchTokenBurnChecked           // (10) BurnChecked — AmountDecimalsPatch
	StructuredPatchTokenAmountToUiAmount      // (11) AmountToUiAmount — dynamic amount
	StructuredPatchTokenInitializeMint        // (12) InitializeMint — InitializeMintPatch
	StructuredPatchTokenInitializeMint2       // (13) InitializeMint2 — InitializeMintPatch
	StructuredPatchTokenInitializeMultisig    // (14) InitializeMultisig — dynamic m

	// SPL Token-2022
	StructuredPatchToken2022Transfer                  // (15) Transfer — dynamic amount
	StructuredPatchToken2022Approve                   // (16) Approve — dynamic amount
	StructuredPatchToken2022MintTo                    // (17) MintTo — dynamic amount
	StructuredPatchToken2022Burn                      // (18) Burn — dynamic amount
	StructuredPatchToken2022TransferChecked           // (19) TransferChecked — AmountDecimalsPatch
	StructuredPatchToken2022ApproveChecked            // (20) ApproveChecked — AmountDecimalsPatch
	StructuredPatchToken2022MintToChecked             // (21) MintToChecked — AmountDecimalsPatch
	StructuredPatchToken2022BurnChecked               // (22) BurnChecked — AmountDecimalsPatch
	StructuredPatchToken2022AmountToUiAmount          // (23) AmountToUiAmount — dynamic amount
	StructuredPatchToken2022InitializeMint            // (24) InitializeMint — InitializeMintPatch
	StructuredPatchToken2022InitializeMint2           // (25) InitializeMint2 — InitializeMintPatch
	StructuredPatchToken2022InitializeMultisig        // (26) InitializeMultisig — dynamic m
	StructuredPatchToken2022TransferCheckedWithFee    // (27) TransferCheckedWithFee — AmountDecimalsFeePatch
	StructuredPatchToken2022SetTransferFee            // (28) SetTransferFee — SetTransferFeePatch

	// Stake Program
	StructuredPatchStakeWithdraw      // (29) Withdraw — dynamic lamports
	StructuredPatchStakeSplit           // (30) Split — dynamic lamports
	StructuredPatchStakeDeactivate      // (31) Deactivate — unit
	StructuredPatchStakeDelegateStake   // (32) DelegateStake — unit
	StructuredPatchTokenUnwrapLamports  // (33) UnwrapLamports — UnwrapLamportsPatch
)

// StructuredCpiPatchCount is the number of StructuredCpiPatch wire variants.
const StructuredCpiPatchCount = 34

// Cpi wire step kind (matches on-chain Cpi tag).
const (
	CpiWireStatic = iota
	CpiWireRawPatched
	CpiWireStructured
)
