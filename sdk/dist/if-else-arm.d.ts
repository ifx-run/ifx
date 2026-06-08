/** `ifx_if_else` arm wire tags (single u8 per arm). See `docs/implementation.md`. */
export declare const IF_ELSE_ARM: {
    readonly skip: 0;
    readonly revert: 255;
    readonly stepMin: 1;
    readonly stepMax: 254;
    readonly maxSteps: 254;
};
export declare function ifElseArmStepTag(count: number): number;
