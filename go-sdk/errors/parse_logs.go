package errors

import (
	"regexp"
	"strconv"
	"strings"
)

// ParsedIfxLog is one parsed simulation / RPC log line.
type ParsedIfxLog struct {
	Raw              string
	Kind             string // ifx_error | instruction_failed | program_failed | other
	InstructionIndex *int
	ErrorName        string
	ErrorCode        *int
}

var (
	customErrRE         = regexp.MustCompile(`(?i)custom program error: 0x([0-9a-f]+)`)
	anchorErrRE         = regexp.MustCompile(`Error Code: (\w+)`)
	instructionFailedRE = regexp.MustCompile(`(?i)instruction #(\d+)`)
)

// ParseIfxLogs parses log lines for Ifx error codes and instruction failure indices.
func ParseIfxLogs(logs []string) []ParsedIfxLog {
	out := make([]ParsedIfxLog, len(logs))
	for i, line := range logs {
		out[i] = parseIfxLogLine(line)
	}
	return out
}

// FirstIfxErrorInLogs returns the first ifx_error entry, if any.
func FirstIfxErrorInLogs(logs []string) *ParsedIfxLog {
	for _, p := range ParseIfxLogs(logs) {
		if p.Kind == "ifx_error" {
			cp := p
			return &cp
		}
	}
	return nil
}

func parseIfxLogLine(raw string) ParsedIfxLog {
	if m := instructionFailedRE.FindStringSubmatch(raw); len(m) > 1 {
		idx, _ := strconv.Atoi(m[1])
		return ParsedIfxLog{
			Raw:              raw,
			Kind:             "instruction_failed",
			InstructionIndex: &idx,
		}
	}
	if m := anchorErrRE.FindStringSubmatch(raw); len(m) > 1 {
		name := m[1]
		if code, ok := CodeForName(name); ok {
			c := code
			return ParsedIfxLog{
				Raw:       raw,
				Kind:      "ifx_error",
				ErrorName: name,
				ErrorCode: &c,
			}
		}
	}
	if m := customErrRE.FindStringSubmatch(raw); len(m) > 1 {
		code, err := strconv.ParseInt(m[1], 16, 64)
		if err == nil {
			if name, ok := Name(int(code)); ok {
				c := int(code)
				return ParsedIfxLog{
					Raw:       raw,
					Kind:      "ifx_error",
					ErrorName: name,
					ErrorCode: &c,
				}
			}
			for c, name := range nameByCode {
				if c&0xff == int(code)&0xff {
					codeCopy := c
					return ParsedIfxLog{
						Raw:       raw,
						Kind:      "ifx_error",
						ErrorName: name,
						ErrorCode: &codeCopy,
					}
				}
			}
		}
	}
	if strings.Contains(strings.ToLower(raw), "program") && strings.Contains(strings.ToLower(raw), "failed") {
		return ParsedIfxLog{Raw: raw, Kind: "program_failed"}
	}
	return ParsedIfxLog{Raw: raw, Kind: "other"}
}
