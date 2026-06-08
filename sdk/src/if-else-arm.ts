/** `ifx_if_else` arm wire tags (single u8 per arm). See `docs/implementation.md`. */
export const IF_ELSE_ARM = {
  skip: 0x00,
  revert: 0xff,
  stepMin: 0x01,
  stepMax: 0xfe,
  maxSteps: 254,
} as const;

export function ifElseArmStepTag(count: number): number {
  if (count < 1 || count > IF_ELSE_ARM.maxSteps) {
    throw new Error(
      `IfElseArm step count must be 1..=${IF_ELSE_ARM.maxSteps}, got ${count}`
    );
  }
  return count;
}
