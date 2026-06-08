package codec

// IfElseArm wire tags (one u8 per arm).
// Note: do not name this file *_arm.go — Go treats that suffix as GOARCH=arm build tags.
const (
	IfElseArmTagSkip    uint8 = 0x00
	IfElseArmTagRevert  uint8 = 0xff
	IfElseArmTagStepMin uint8 = 0x01
	IfElseArmTagStepMax uint8 = 0xfe
	IfElseArmMaxSteps   int   = 254
)
