package codec

import (
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/ifx-run/ifx/go-sdk/binding"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
)

var exprVariantKeys = []string{
	"value", "constBool", "constU8", "constU16", "constU32", "constU64", "constU128",
	"constI8", "constI16", "constI32", "constI64", "constI128", "constF32", "constF64",
	"not", "neg", "isZero", "nonZero",
	"asU8", "asU16", "asU32", "asU64", "asU128", "asI8", "asI16", "asI32", "asI64", "asI128",
	"add", "sub", "mul", "div", "divFloor", "divCeil", "min", "max",
	"eq", "ne", "gt", "ge", "lt", "le", "saturatingSub", "and", "or",
	"bpsMulFloor", "bpsMulCeil", 	"mulDivFloor", "mulDivCeil", "clamp", "select", "constPubkey",
}

var letBindingKeys = []string{
	"accountDataSlice", "accountLamports", "eval",
	"sysvarClockSlot", "sysvarClockEpochStartTimestamp", "sysvarClockEpoch",
	"sysvarClockLeaderScheduleEpoch", "sysvarClockUnixTimestamp", "sysvarRentMinimumBalance",
	"splTokenAccountAmount", "splTokenAccountDelegatedAmount", "splTokenAccountState",
	"splMintSupply", "splMintDecimals",
	"splToken2022AccountAmount", "splToken2022AccountDelegatedAmount", "splToken2022AccountState",
	"splToken2022MintSupply", "splToken2022MintDecimals",
	"splToken2022AccountTransferFeeWithheld", "splToken2022MintTransferFeeBasisPoints",
	"splToken2022MintTransferFeeMaximum", "splToken2022MintWithheldAmount",
	"splToken2022MintDefaultAccountState", "accountDataLen",
	"accountKey", "constPubkey",
	"frameGeneration", "frameIndexCount",
	"accountIsSigner", "accountIsWritable",
	"stakeDelegationStake", "stakeDelegationActivationEpoch",
	"stakeDelegationDeactivationEpoch", "stakeLockupUnixTimestamp",
	"stakeLockupEpoch", 	"stakeAuthorizedStaker", "stakeAuthorizedWithdrawer",
	"stakeDelegationVoter",
	"splMintIsInitialized", "splMintMintAuthority", "splMintFreezeAuthority",
	"splToken2022MintIsInitialized", "splToken2022MintMintAuthority",
	"splToken2022MintFreezeAuthority",
	"accountProgramOwner", "accountExecutable", "accountRentEpoch",
	"splTokenAccountMint", "splTokenAccountOwner", "splTokenAccountDelegate",
	"splTokenAccountCloseAuthority", "splTokenAccountIsNative", "splTokenAccountOwnerIsDerived",
	"splToken2022AccountMint", "splToken2022AccountOwner", "splToken2022AccountDelegate",
	"splToken2022AccountCloseAuthority", "splToken2022AccountIsNative", "splToken2022AccountOwnerIsDerived",
	"stakeAccountState", "stakeLockupCustodian", "stakeRentExemptReserve",
	"stakeCreditsObserved", "stakeStakeFlags",
	"upgradeableProgramDataTag", "upgradeableProgramDataUpgradeAuthority",
	"upgradeableProgramProgramDataAddress",
}

type wireGolden struct {
	Expr       map[string]string `json:"expr"`
	LetBinding map[string]string `json:"letBinding"`
}

func loadGolden(t *testing.T) wireGolden {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	path := filepath.Join(filepath.Dir(file), "..", "testdata", "ts_wire_golden.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read golden: %v", err)
	}
	var g wireGolden
	if err := json.Unmarshal(raw, &g); err != nil {
		t.Fatalf("parse golden: %v", err)
	}
	return g
}

func TestExprVariantCount(t *testing.T) {
	if len(exprVariantKeys) != constants.ExprVariantCount {
		t.Fatalf("expr keys %d != %d", len(exprVariantKeys), constants.ExprVariantCount)
	}
}

func TestLetBindingVariantCount(t *testing.T) {
	if len(letBindingKeys) != constants.LetBindingVariantCount {
		t.Fatalf("let keys %d != %d", len(letBindingKeys), constants.LetBindingVariantCount)
	}
}

func TestEncodeExprMatchesTSGolden(t *testing.T) {
	g := loadGolden(t)
	for tag, key := range exprVariantKeys {
		wantHex, ok := g.Expr[key]
		if !ok {
			t.Fatalf("missing golden for expr %q", key)
		}
		want, err := hex.DecodeString(wantHex)
		if err != nil {
			t.Fatalf("decode golden %q: %v", key, err)
		}
		got, err := EncodeExpr(expr.Sample(tag))
		if err != nil {
			t.Fatalf("encode %q: %v", key, err)
		}
		if got[0] != byte(tag) {
			t.Fatalf("%q tag got %d want %d", key, got[0], tag)
		}
		if hex.EncodeToString(got) != wantHex {
			t.Fatalf("%q wire mismatch\ngot  %x\nwant %s", key, got, wantHex)
		}
		_ = want
	}
}

func TestEncodeLetBindingMatchesTSGolden(t *testing.T) {
	g := loadGolden(t)
	for tag, key := range letBindingKeys {
		wantHex, ok := g.LetBinding[key]
		if !ok {
			t.Fatalf("missing golden for let %q", key)
		}
		got, err := EncodeLetBinding(binding.Sample(tag))
		if err != nil {
			t.Fatalf("encode %q: %v", key, err)
		}
		if got[0] != byte(tag) {
			t.Fatalf("%q tag got %d want %d", key, got[0], tag)
		}
		if hex.EncodeToString(got) != wantHex {
			t.Fatalf("%q wire mismatch\ngot  %x\nwant %s", key, got, wantHex)
		}
	}
}

func TestBuildLetWireHead(t *testing.T) {
	args := LetArgs{Bindings: []binding.Node{binding.EvalExpr(expr.U64(1))}}
	body, err := EncodeLetArgs(args)
	if err != nil {
		t.Fatal(err)
	}
	if body[0] != 1 { // u8 len
		t.Fatalf("binding count byte %d", body[0])
	}
	if body[1] != constants.LetTagEval {
		t.Fatalf("eval tag %d", body[1])
	}
}
