/**
 * Structured CPI patch wire encoding (matches on-chain `StructuredCpiPatch`).
 *
 * One flat enum per official ix layout — no separate kind + payload layers.
 * Dynamic values use [`Value`] (Frame binding index).
 */
import type { ScratchValue } from "./scratch";
import type { IfxTy } from "./typed";
import type { Value } from "./types";
/** Wire tag 0–28 (matches on-chain `StructuredCpiPatch::wire_tag`). */
export declare const STRUCTURED_CPI_PATCH_WIRE: {
    /** (0) System `Transfer` — dynamic lamports. */
    readonly systemTransfer: 0;
    /** (1) System `CreateAccount` — lamports/space via `LamportsSpacePatch`. */
    readonly systemCreateAccount: 1;
    /** (2) System `Allocate` — dynamic space. */
    readonly systemAllocate: 2;
    /** (3) SPL Token `Transfer` — dynamic amount. */
    readonly tokenTransfer: 3;
    /** (4) SPL Token `Approve` — dynamic amount. */
    readonly tokenApprove: 4;
    /** (5) SPL Token `MintTo` — dynamic amount. */
    readonly tokenMintTo: 5;
    /** (6) SPL Token `Burn` — dynamic amount. */
    readonly tokenBurn: 6;
    /** (7) SPL Token `TransferChecked` — `AmountDecimalsPatch`. */
    readonly tokenTransferChecked: 7;
    /** (8) SPL Token `ApproveChecked` — `AmountDecimalsPatch`. */
    readonly tokenApproveChecked: 8;
    /** (9) SPL Token `MintToChecked` — `AmountDecimalsPatch`. */
    readonly tokenMintToChecked: 9;
    /** (10) SPL Token `BurnChecked` — `AmountDecimalsPatch`. */
    readonly tokenBurnChecked: 10;
    /** (11) SPL Token `AmountToUiAmount` — dynamic amount. */
    readonly tokenAmountToUiAmount: 11;
    /** (12) SPL Token `InitializeMint` — `InitializeMintPatch`. */
    readonly tokenInitializeMint: 12;
    /** (13) SPL Token `InitializeMint2` — `InitializeMintPatch`. */
    readonly tokenInitializeMint2: 13;
    /** (14) SPL Token `InitializeMultisig` — dynamic m. */
    readonly tokenInitializeMultisig: 14;
    /** (15) Token-2022 `Transfer` — dynamic amount. */
    readonly token2022Transfer: 15;
    /** (16) Token-2022 `Approve` — dynamic amount. */
    readonly token2022Approve: 16;
    /** (17) Token-2022 `MintTo` — dynamic amount. */
    readonly token2022MintTo: 17;
    /** (18) Token-2022 `Burn` — dynamic amount. */
    readonly token2022Burn: 18;
    /** (19) Token-2022 `TransferChecked` — `AmountDecimalsPatch`. */
    readonly token2022TransferChecked: 19;
    /** (20) Token-2022 `ApproveChecked` — `AmountDecimalsPatch`. */
    readonly token2022ApproveChecked: 20;
    /** (21) Token-2022 `MintToChecked` — `AmountDecimalsPatch`. */
    readonly token2022MintToChecked: 21;
    /** (22) Token-2022 `BurnChecked` — `AmountDecimalsPatch`. */
    readonly token2022BurnChecked: 22;
    /** (23) Token-2022 `AmountToUiAmount` — dynamic amount. */
    readonly token2022AmountToUiAmount: 23;
    /** (24) Token-2022 `InitializeMint` — `InitializeMintPatch`. */
    readonly token2022InitializeMint: 24;
    /** (25) Token-2022 `InitializeMint2` — `InitializeMintPatch`. */
    readonly token2022InitializeMint2: 25;
    /** (26) Token-2022 `InitializeMultisig` — dynamic m. */
    readonly token2022InitializeMultisig: 26;
    /** (27) Token-2022 TransferFee `TransferCheckedWithFee` — `AmountDecimalsFeePatch`. */
    readonly token2022TransferCheckedWithFee: 27;
    /** (28) Token-2022 TransferFee `SetTransferFee` — `SetTransferFeePatch`. */
    readonly token2022SetTransferFee: 28;
};
export type StructuredCpiPatchWireTag = (typeof STRUCTURED_CPI_PATCH_WIRE)[keyof typeof STRUCTURED_CPI_PATCH_WIRE];
export type ValueInput = Value | ScratchValue<IfxTy>;
export declare function asValue(source: ValueInput): Value;
/** `TransferChecked`-family sub-layout: Frame Value vs literal for amount/decimals. */
export type AmountDecimalsPatch = 
/** Amount from Frame; decimals literal. */
{
    tag: "amountOnly";
    amount: Value;
    decimals: number;
}
/** Amount and decimals from Frame. */
 | {
    tag: "both";
    amount: Value;
    decimals: Value;
}
/** Amount literal; decimals from Frame. */
 | {
    tag: "decimalsOnly";
    amount: bigint;
    decimals: Value;
};
/** System `CreateAccount` sub-layout: Frame vs literal lamports/space. */
export type LamportsSpacePatch = {
    tag: "lamportsOnly";
    lamports: Value;
    space: bigint;
} | {
    tag: "spaceOnly";
    lamports: bigint;
    space: Value;
} | {
    tag: "both";
    lamports: Value;
    space: Value;
};
/** Token-2022 `TransferCheckedWithFee` sub-layout (≥1 Frame Value). */
export type AmountDecimalsFeePatch = {
    tag: "amountOnly";
    amount: Value;
    decimals: number;
    fee: bigint;
} | {
    tag: "decimalsOnly";
    amount: bigint;
    decimals: Value;
    fee: bigint;
} | {
    tag: "feeOnly";
    amount: bigint;
    decimals: number;
    fee: Value;
} | {
    tag: "amountDecimals";
    amount: Value;
    decimals: Value;
    fee: bigint;
} | {
    tag: "amountFee";
    amount: Value;
    decimals: number;
    fee: Value;
} | {
    tag: "decimalsFee";
    amount: bigint;
    decimals: Value;
    fee: Value;
} | {
    tag: "allFromFrame";
    amount: Value;
    decimals: Value;
    fee: Value;
};
/** Token-2022 TransferFee `SetTransferFee` sub-layout. */
export type SetTransferFeePatch = {
    tag: "bpsOnly";
    basisPoints: Value;
    maximumFee: bigint;
} | {
    tag: "maxOnly";
    basisPoints: number;
    maximumFee: Value;
} | {
    tag: "both";
    basisPoints: Value;
    maximumFee: Value;
};
/** Pubkey Value: Frame binding or 32-byte wire literal. */
export type PubkeyValue = {
    tag: "fromFrame";
    value: Value;
} | {
    tag: "literal";
    bytes: Buffer;
};
/** Optional freeze authority on InitializeMint-family ixs. */
export type FreezeAuthPatch = {
    tag: "none";
} | {
    tag: "someValue";
    pubkey: Value;
} | {
    tag: "someLiteral";
    bytes: Buffer;
};
/** SPL `InitializeMint*` dynamic fields (decimals, mint authority, freeze). */
export type InitializeMintPatch = {
    decimals: Value;
    mintAuthority: PubkeyValue;
    freeze: FreezeAuthPatch;
};
/** Official-program CPI patch — ix variant + typed payload (1:1 with on-chain). */
export type StructuredCpiPatch = 
/** (0) System `Transfer` — dynamic lamports. */
{
    tag: "systemTransfer";
    lamports: Value;
}
/** (1) System `CreateAccount` — `LamportsSpacePatch`. */
 | {
    tag: "systemCreateAccount";
    lamportsSpace: LamportsSpacePatch;
}
/** (2) System `Allocate` — dynamic space. */
 | {
    tag: "systemAllocate";
    space: Value;
}
/** (3) SPL Token `Transfer` — dynamic amount. */
 | {
    tag: "tokenTransfer";
    amount: Value;
}
/** (4) SPL Token `Approve` — dynamic amount. */
 | {
    tag: "tokenApprove";
    amount: Value;
}
/** (5) SPL Token `MintTo` — dynamic amount. */
 | {
    tag: "tokenMintTo";
    amount: Value;
}
/** (6) SPL Token `Burn` — dynamic amount. */
 | {
    tag: "tokenBurn";
    amount: Value;
}
/** (7) SPL Token `TransferChecked` — `AmountDecimalsPatch`. */
 | {
    tag: "tokenTransferChecked";
    amountDecimals: AmountDecimalsPatch;
}
/** (8) SPL Token `ApproveChecked` — `AmountDecimalsPatch`. */
 | {
    tag: "tokenApproveChecked";
    amountDecimals: AmountDecimalsPatch;
}
/** (9) SPL Token `MintToChecked` — `AmountDecimalsPatch`. */
 | {
    tag: "tokenMintToChecked";
    amountDecimals: AmountDecimalsPatch;
}
/** (10) SPL Token `BurnChecked` — `AmountDecimalsPatch`. */
 | {
    tag: "tokenBurnChecked";
    amountDecimals: AmountDecimalsPatch;
}
/** (11) SPL Token `AmountToUiAmount` — dynamic amount. */
 | {
    tag: "tokenAmountToUiAmount";
    amount: Value;
}
/** (12) SPL Token `InitializeMint` — `InitializeMintPatch`. */
 | {
    tag: "tokenInitializeMint";
    initializeMint: InitializeMintPatch;
}
/** (13) SPL Token `InitializeMint2` — `InitializeMintPatch`. */
 | {
    tag: "tokenInitializeMint2";
    initializeMint: InitializeMintPatch;
}
/** (14) SPL Token `InitializeMultisig` — dynamic m. */
 | {
    tag: "tokenInitializeMultisig";
    m: Value;
}
/** (15) Token-2022 `Transfer` — dynamic amount. */
 | {
    tag: "token2022Transfer";
    amount: Value;
}
/** (16) Token-2022 `Approve` — dynamic amount. */
 | {
    tag: "token2022Approve";
    amount: Value;
}
/** (17) Token-2022 `MintTo` — dynamic amount. */
 | {
    tag: "token2022MintTo";
    amount: Value;
}
/** (18) Token-2022 `Burn` — dynamic amount. */
 | {
    tag: "token2022Burn";
    amount: Value;
}
/** (19) Token-2022 `TransferChecked` — `AmountDecimalsPatch`. */
 | {
    tag: "token2022TransferChecked";
    amountDecimals: AmountDecimalsPatch;
}
/** (20) Token-2022 `ApproveChecked` — `AmountDecimalsPatch`. */
 | {
    tag: "token2022ApproveChecked";
    amountDecimals: AmountDecimalsPatch;
}
/** (21) Token-2022 `MintToChecked` — `AmountDecimalsPatch`. */
 | {
    tag: "token2022MintToChecked";
    amountDecimals: AmountDecimalsPatch;
}
/** (22) Token-2022 `BurnChecked` — `AmountDecimalsPatch`. */
 | {
    tag: "token2022BurnChecked";
    amountDecimals: AmountDecimalsPatch;
}
/** (23) Token-2022 `AmountToUiAmount` — dynamic amount. */
 | {
    tag: "token2022AmountToUiAmount";
    amount: Value;
}
/** (24) Token-2022 `InitializeMint` — `InitializeMintPatch`. */
 | {
    tag: "token2022InitializeMint";
    initializeMint: InitializeMintPatch;
}
/** (25) Token-2022 `InitializeMint2` — `InitializeMintPatch`. */
 | {
    tag: "token2022InitializeMint2";
    initializeMint: InitializeMintPatch;
}
/** (26) Token-2022 `InitializeMultisig` — dynamic m. */
 | {
    tag: "token2022InitializeMultisig";
    m: Value;
}
/** (27) Token-2022 TransferFee `TransferCheckedWithFee` — `AmountDecimalsFeePatch`. */
 | {
    tag: "token2022TransferCheckedWithFee";
    amountDecimalsFee: AmountDecimalsFeePatch;
}
/** (28) Token-2022 TransferFee `SetTransferFee` — `SetTransferFeePatch`. */
 | {
    tag: "token2022SetTransferFee";
    setTransferFee: SetTransferFeePatch;
};
export declare function structuredCpiPatchWireTag(patch: StructuredCpiPatch): number;
/** Encode patch payload bytes (wire tag is separate in `Cpi::Structured`). */
export declare function encodeStructuredCpiPatchPayload(patch: StructuredCpiPatch): Buffer;
/** Builders for every wire tag in {@link STRUCTURED_CPI_PATCH_WIRE} (0–28). */
export declare const structuredCpiPatch: {
    systemTransfer(lamports: ValueInput): StructuredCpiPatch;
    systemCreateAccount: {
        lamportsOnly(lamports: ValueInput, space: bigint): StructuredCpiPatch;
        spaceOnly(lamports: bigint, space: ValueInput): StructuredCpiPatch;
        both(lamports: ValueInput, space: ValueInput): StructuredCpiPatch;
    };
    systemAllocate(space: ValueInput): StructuredCpiPatch;
    tokenTransfer(amount: ValueInput): StructuredCpiPatch;
    tokenApprove(amount: ValueInput): StructuredCpiPatch;
    tokenMintTo(amount: ValueInput): StructuredCpiPatch;
    tokenBurn(amount: ValueInput): StructuredCpiPatch;
    tokenTransferChecked: {
        amountOnly(amount: ValueInput, decimals: number): StructuredCpiPatch;
        both(amount: ValueInput, decimals: ValueInput): StructuredCpiPatch;
        decimalsOnly(amount: bigint, decimals: ValueInput): StructuredCpiPatch;
    };
    tokenApproveChecked: {
        amountOnly(amount: ValueInput, decimals: number): StructuredCpiPatch;
        both(amount: ValueInput, decimals: ValueInput): StructuredCpiPatch;
        decimalsOnly(amount: bigint, decimals: ValueInput): StructuredCpiPatch;
    };
    tokenMintToChecked: {
        amountOnly(amount: ValueInput, decimals: number): StructuredCpiPatch;
        both(amount: ValueInput, decimals: ValueInput): StructuredCpiPatch;
        decimalsOnly(amount: bigint, decimals: ValueInput): StructuredCpiPatch;
    };
    tokenBurnChecked: {
        amountOnly(amount: ValueInput, decimals: number): StructuredCpiPatch;
        both(amount: ValueInput, decimals: ValueInput): StructuredCpiPatch;
        decimalsOnly(amount: bigint, decimals: ValueInput): StructuredCpiPatch;
    };
    tokenAmountToUiAmount(amount: ValueInput): StructuredCpiPatch;
    tokenInitializeMint: (args: {
        decimals: ValueInput;
        mintAuthority: ValueInput | Buffer;
        freeze?: FreezeAuthPatch;
    }) => StructuredCpiPatch;
    tokenInitializeMint2: (args: {
        decimals: ValueInput;
        mintAuthority: ValueInput | Buffer;
        freeze?: FreezeAuthPatch;
    }) => StructuredCpiPatch;
    tokenInitializeMultisig(m: ValueInput): StructuredCpiPatch;
    token2022Transfer(amount: ValueInput): StructuredCpiPatch;
    token2022Approve(amount: ValueInput): StructuredCpiPatch;
    token2022MintTo(amount: ValueInput): StructuredCpiPatch;
    token2022Burn(amount: ValueInput): StructuredCpiPatch;
    token2022TransferChecked: {
        amountOnly(amount: ValueInput, decimals: number): StructuredCpiPatch;
        both(amount: ValueInput, decimals: ValueInput): StructuredCpiPatch;
        decimalsOnly(amount: bigint, decimals: ValueInput): StructuredCpiPatch;
    };
    token2022ApproveChecked: {
        amountOnly(amount: ValueInput, decimals: number): StructuredCpiPatch;
        both(amount: ValueInput, decimals: ValueInput): StructuredCpiPatch;
        decimalsOnly(amount: bigint, decimals: ValueInput): StructuredCpiPatch;
    };
    token2022MintToChecked: {
        amountOnly(amount: ValueInput, decimals: number): StructuredCpiPatch;
        both(amount: ValueInput, decimals: ValueInput): StructuredCpiPatch;
        decimalsOnly(amount: bigint, decimals: ValueInput): StructuredCpiPatch;
    };
    token2022BurnChecked: {
        amountOnly(amount: ValueInput, decimals: number): StructuredCpiPatch;
        both(amount: ValueInput, decimals: ValueInput): StructuredCpiPatch;
        decimalsOnly(amount: bigint, decimals: ValueInput): StructuredCpiPatch;
    };
    token2022AmountToUiAmount(amount: ValueInput): StructuredCpiPatch;
    token2022InitializeMint: (args: {
        decimals: ValueInput;
        mintAuthority: ValueInput | Buffer;
        freeze?: FreezeAuthPatch;
    }) => StructuredCpiPatch;
    token2022InitializeMint2: (args: {
        decimals: ValueInput;
        mintAuthority: ValueInput | Buffer;
        freeze?: FreezeAuthPatch;
    }) => StructuredCpiPatch;
    token2022InitializeMultisig(m: ValueInput): StructuredCpiPatch;
    token2022TransferCheckedWithFee: {
        amountOnly(amount: ValueInput, decimals: number, fee: bigint): StructuredCpiPatch;
        decimalsOnly(amount: bigint, decimals: ValueInput, fee: bigint): StructuredCpiPatch;
        feeOnly(amount: bigint, decimals: number, fee: ValueInput): StructuredCpiPatch;
        amountDecimals(amount: ValueInput, decimals: ValueInput, fee: bigint): StructuredCpiPatch;
        amountFee(amount: ValueInput, decimals: number, fee: ValueInput): StructuredCpiPatch;
        decimalsFee(amount: bigint, decimals: ValueInput, fee: ValueInput): StructuredCpiPatch;
        allFromFrame(amount: ValueInput, decimals: ValueInput, fee: ValueInput): StructuredCpiPatch;
    };
    token2022SetTransferFee: {
        bpsOnly(basisPoints: ValueInput, maximumFee: bigint): StructuredCpiPatch;
        maxOnly(basisPoints: number, maximumFee: ValueInput): StructuredCpiPatch;
        both(basisPoints: ValueInput, maximumFee: ValueInput): StructuredCpiPatch;
    };
    /** @deprecated Use {@link structuredCpiPatch.tokenTransfer}. */
    tokenAmount(amount: ValueInput): StructuredCpiPatch;
    /** @deprecated Use {@link structuredCpiPatch.tokenInitializeMint2}. */
    initializeMint2: (args: {
        decimals: ValueInput;
        mintAuthority: ValueInput | Buffer;
        freeze?: FreezeAuthPatch;
    }) => StructuredCpiPatch;
};
