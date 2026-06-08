package codec

import "errors"

var (
	errIfElseArmStepCount = errors.New("IfElseArm step count must be 1..=254")
	errUnknownIfElseArm   = errors.New("unknown IfElseArm kind")
)
