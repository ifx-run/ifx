package codec

import (
	"fmt"

	"github.com/ifx-run/ifx/go-sdk/typed"
)

// WireBuildResult is the unified output of raw/structured CPI builders (mirrors TS CpiWireBuildResult).
type WireBuildResult struct {
	Step      Cpi
	Remaining []typed.AccountMeta
}

// CpiRequiresPatchApply reports whether a step may be sent via ifx_patched_cpi.
func CpiRequiresPatchApply(c Cpi) bool {
	if c.StructuredPayload != nil {
		return true
	}
	return c.Patches.HasPatches()
}

// ValidateWireBuild ensures the step is valid for ifx_patched_cpi.
func ValidateWireBuild(b WireBuildResult) error {
	if !CpiRequiresPatchApply(b.Step) {
		return fmt.Errorf("ifx_patched_cpi requires structured patch or raw patches; for static CPI use the target instruction directly or if_else with static step")
	}
	return nil
}
