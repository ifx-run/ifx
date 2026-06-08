/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/ifx.json`.
 */
export type Ifx = {
    "address": "ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD";
    "metadata": {
        "name": "ifx";
        "version": "0.1.0";
        "spec": "0.1.0";
        "description": "Created with Anchor";
    };
    "instructions": [
        {
            "name": "ifxAssert";
            "docs": [
                "Require `cond` to evaluate to `true`; otherwise revert with [`ErrorCode::AssertFailed`].",
                "",
                "`cond` is an [`Expr`] over values already in `Frame::tape` (via prior",
                "[`ifx_let`]) or nested compare/arithmetic. Use for global guards that must",
                "hold before later steps proceed (contrast [`ifx_if_else`] branch-local `Revert`)."
            ];
            "discriminator": [
                4
            ];
            "accounts": [
                {
                    "name": "frame";
                }
            ];
            "args": [
                {
                    "name": "cond";
                    "type": {
                        "defined": {
                            "name": "expr";
                        };
                    };
                }
            ];
        },
        {
            "name": "ifxCloseFrame";
            "docs": [
                "Close a [`Frame`] PDA and return rent to `close_authority`.",
                "",
                "Requires `authority` signer to match the `close_authority` stored at create.",
                "Typical usage: standalone teardown tx when the Frame is no longer needed."
            ];
            "discriminator": [
                1
            ];
            "accounts": [
                {
                    "name": "authority";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "frame";
                    "writable": true;
                }
            ];
            "args": [];
        },
        {
            "name": "ifxCreateFrame";
            "docs": [
                "Create a new [`Frame`] PDA — one-time provisioning per `(payer, frame_id)`.",
                "",
                "Allocates `tape_len` bytes of scratch tape (+ fixed `payload_at` index table),",
                "sets `cursor = 0`, `index_count = 0`, and stores `close_authority` for later",
                "[`ifx_close_frame`]. The PDA seeds are `[FRAME_SEED, payer, frame_id]`.",
                "",
                "Typical usage: standalone tx before business flows; not every swap/settlement tx.",
                "There is no access control on who may [`ifx_reset_frame`] or append later —",
                "treat `tape` as tx-scoped scratch, not durable application state."
            ];
            "discriminator": [
                0
            ];
            "accounts": [
                {
                    "name": "payer";
                    "docs": [
                        "Pays rent for the new Frame PDA."
                    ];
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "frame";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    102,
                                    114,
                                    97,
                                    109,
                                    101
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "payer";
                            },
                            {
                                "kind": "arg";
                                "path": "frameId";
                            }
                        ];
                    };
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "frameId";
                    "type": {
                        "array": [
                            "u8",
                            32
                        ];
                    };
                },
                {
                    "name": "closeAuthority";
                    "type": "pubkey";
                },
                {
                    "name": "tapeLen";
                    "type": "u32";
                }
            ];
        },
        {
            "name": "ifxIfElse";
            "docs": [
                "Conditional branch: evaluate `cond`, then run exactly one [`IfElseArm`].",
                "",
                "- `cond == true` → `then_arm`",
                "- `cond == false` → `else_arm`",
                "",
                "Each arm is [`IfElseArm::Skip`], [`IfElseArm::Revert`], or an ordered sequence of",
                "[`IfElseArm::Cpi`] steps (1–254 per arm; wire tag encodes count — see `state/if_else_arm.rs`).",
                "",
                "`remaining_accounts` layout matches [`ifx_patched_cpi`] when an arm invokes CPI."
            ];
            "discriminator": [
                6
            ];
            "accounts": [
                {
                    "name": "frame";
                }
            ];
            "args": [
                {
                    "name": "args";
                    "type": {
                        "defined": {
                            "name": "ifElseArgs";
                        };
                    };
                }
            ];
        },
        {
            "name": "ifxLet";
            "docs": [
                "Evaluate `bindings` in order and append typed records to `Frame::tape`.",
                "",
                "Each binding writes `[ty:1][payload]`, records `payload_at[index]`, and advances",
                "`cursor`. Sources include account lamports/data, sysvar syscalls, typed SPL",
                "unpacks, and [`Expr`] evaluation (`Eval`). Bindings may reference earlier slots",
                "in the same batch via [`Expr::Value`] (binding **index**).",
                "",
                "**Constraints:** must run at transaction top level (stack height 1). CPI",
                "sources index [`remaining_accounts`] passed with this instruction."
            ];
            "discriminator": [
                3
            ];
            "accounts": [
                {
                    "name": "frame";
                    "writable": true;
                }
            ];
            "args": [
                {
                    "name": "args";
                    "type": {
                        "defined": {
                            "name": "letArgs";
                        };
                    };
                }
            ];
        },
        {
            "name": "ifxPatchedCpi";
            "docs": [
                "Unconditional patched CPI into an existing program.",
                "",
                "`arm` is a [`Cpi`]: template instruction `data` plus optional [`CpiPatch`] ranges",
                "copied from `Frame::tape` immediately before `invoke`. Accounts are taken from",
                "`remaining_accounts[accounts_start .. accounts_start + accounts_len]` as",
                "`[program_id, …inner_accounts]` (program id is not repeated in the inner slice).",
                "",
                "Use when CPI fields (e.g. transfer lamports) were bound on-chain in the same tx",
                "via [`ifx_let`]. For unconditional CPI without patches, add the target ix to the",
                "transaction directly; use [`ifx_if_else`] [`IfElseArm::Cpi`] for conditional static CPI."
            ];
            "discriminator": [
                5
            ];
            "accounts": [
                {
                    "name": "frame";
                }
            ];
            "args": [
                {
                    "name": "arm";
                    "type": {
                        "defined": {
                            "name": "cpi";
                        };
                    };
                }
            ];
        },
        {
            "name": "ifxResetFrame";
            "docs": [
                "Reset Frame scratch: `cursor = 0`, `index_count = 0` (lazy — does not zero `tape`).",
                "",
                "Call at the start of a business tx when reusing an existing PDA with a clean",
                "tape. Omit only when a later tx in the **same landed bundle** intentionally",
                "continues bindings written by an earlier tx (same scratch session).",
                "",
                "Does not change `close_authority` or account size — only clears session data."
            ];
            "discriminator": [
                2
            ];
            "accounts": [
                {
                    "name": "frame";
                    "writable": true;
                }
            ];
            "args": [];
        }
    ];
    "accounts": [
        {
            "name": "frame";
            "discriminator": [
                6
            ];
        }
    ];
    "errors": [
        {
            "code": 6000;
            "name": "letNotTopLevel";
            "msg": "ifx_let must be invoked at transaction top level (stack height 1)";
        },
        {
            "code": 6001;
            "name": "tapeOutOfBounds";
            "msg": "Tape offset and type exceed Frame::tape bounds";
        },
        {
            "code": 6002;
            "name": "unauthorizedClose";
            "msg": "Only the frame close authority may close this PDA";
        },
        {
            "code": 6003;
            "name": "invalidCloseAuthority";
            "msg": "Invalid close authority";
        },
        {
            "code": 6004;
            "name": "invalidTapeLen";
            "msg": "Frame tape length must be at least 1";
        },
        {
            "code": 6005;
            "name": "assertFailed";
            "msg": "Assertion failed";
        },
        {
            "code": 6006;
            "name": "ifElseRevert";
            "msg": "ifx_if_else branch selected Revert";
        },
        {
            "code": 6007;
            "name": "invalidAccountIndex";
            "msg": "Invalid remaining account index";
        },
        {
            "code": 6008;
            "name": "invalidAccountRange";
            "msg": "Invalid CPI account range in remaining accounts";
        },
        {
            "code": 6009;
            "name": "accountDataTooShort";
            "msg": "Account data too short for load offset/type";
        },
        {
            "code": 6010;
            "name": "integerOverflow";
            "msg": "Integer overflow";
        },
        {
            "code": 6011;
            "name": "integerUnderflow";
            "msg": "Integer underflow";
        },
        {
            "code": 6012;
            "name": "divisionByZero";
            "msg": "Division by zero";
        },
        {
            "code": 6013;
            "name": "unsupportedBinaryOp";
            "msg": "Unsupported binary operator for value type";
        },
        {
            "code": 6014;
            "name": "unsupportedUnaryOp";
            "msg": "Unsupported unary operator for value type";
        },
        {
            "code": 6015;
            "name": "floatUnordered";
            "msg": "Float comparison is undefined (e.g. NaN)";
        },
        {
            "code": 6016;
            "name": "loadTypeMismatch";
            "msg": "Load source type does not match binding value type";
        },
        {
            "code": 6017;
            "name": "exprTypeMismatch";
            "msg": "Expression result type does not match binding value type";
        },
        {
            "code": 6018;
            "name": "invalidExprOperand";
            "msg": "Invalid constant for expression operand";
        },
        {
            "code": 6019;
            "name": "patchDataOutOfRange";
            "msg": "CPI patch range exceeds arm data length";
        },
        {
            "code": 6020;
            "name": "invalidValueTypeTag";
            "msg": "Invalid value type tag in Frame tape";
        },
        {
            "code": 6021;
            "name": "invalidValueIndex";
            "msg": "Invalid Frame binding index";
        },
        {
            "code": 6022;
            "name": "indexCapReached";
            "msg": "Frame binding index cap reached";
        },
        {
            "code": 6023;
            "name": "accountOwnerMismatch";
            "msg": "Account owner does not match expected program";
        },
        {
            "code": 6024;
            "name": "accountDataLenMismatch";
            "msg": "Account data length does not match expected layout";
        },
        {
            "code": 6025;
            "name": "splTokenUnpackFailed";
            "msg": "Failed to unpack SPL token account or mint";
        },
        {
            "code": 6026;
            "name": "token2022ExtensionNotPresent";
            "msg": "Token-2022 extension not present on account";
        },
        {
            "code": 6027;
            "name": "splToken2022UnpackFailed";
            "msg": "Failed to unpack SPL token-2022 account or mint";
        },
        {
            "code": 6028;
            "name": "castOverflow";
            "msg": "Cast value does not fit target type";
        },
        {
            "code": 6029;
            "name": "invalidPatchedCpiPatches";
            "msg": "ifx_patched_cpi requires at least one patch";
        }
    ];
    "types": [
        {
            "name": "cpi";
            "docs": [
                "Template CPI + optional tape patches (`ifx_patched_cpi` / `ifx_if_else` steps).",
                "",
                "`remaining[accounts_start..accounts_start + accounts_len]` must be",
                "`[program, …cpi_accounts]`. Empty [`PatchList`] = static step (template `data` as-is)."
            ];
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "accountsStart";
                        "type": "u8";
                    },
                    {
                        "name": "accountsLen";
                        "type": "u8";
                    },
                    {
                        "name": "data";
                        "docs": [
                            "Base instruction data; patches overwrite ranges before `invoke`."
                        ];
                        "type": {
                            "defined": {
                                "name": "ifx::state::u16_len_vec::U16LenVec<u8>";
                                "generics": [
                                    {
                                        "kind": "type";
                                        "type": "u8";
                                    }
                                ];
                            };
                        };
                    },
                    {
                        "name": "patches";
                        "type": {
                            "defined": {
                                "name": "ifx::state::u16_len_vec::U16LenVec<ifx::state::types::CpiPatch>";
                                "generics": [
                                    {
                                        "kind": "type";
                                        "type": {
                                            "defined": {
                                                "name": "cpiPatch";
                                            };
                                        };
                                    }
                                ];
                            };
                        };
                    }
                ];
            };
        },
        {
            "name": "cpiPatch";
            "docs": [
                "Overwrite a slice of [`Cpi::data`] with bytes read from [`Frame::tape`] before invoke."
            ];
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "dataOffset";
                        "docs": [
                            "Byte offset into [`Cpi::data`] (not a Frame index; may exceed 255)."
                        ];
                        "type": "u16";
                    },
                    {
                        "name": "source";
                        "docs": [
                            "Binding index in the Frame (`payload_at[index]` → tape payload bytes)."
                        ];
                        "type": {
                            "defined": {
                                "name": "value";
                            };
                        };
                    }
                ];
            };
        },
        {
            "name": "expr";
            "type": {
                "kind": "enum";
                "variants": [
                    {
                        "name": "value";
                        "fields": [
                            {
                                "name": "value";
                                "type": {
                                    "defined": {
                                        "name": "value";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "constBool";
                        "fields": [
                            "bool"
                        ];
                    },
                    {
                        "name": "constU8";
                        "fields": [
                            "u8"
                        ];
                    },
                    {
                        "name": "constU16";
                        "fields": [
                            "u16"
                        ];
                    },
                    {
                        "name": "constU32";
                        "fields": [
                            "u32"
                        ];
                    },
                    {
                        "name": "constU64";
                        "fields": [
                            "u64"
                        ];
                    },
                    {
                        "name": "constU128";
                        "fields": [
                            "u128"
                        ];
                    },
                    {
                        "name": "constI8";
                        "fields": [
                            "i8"
                        ];
                    },
                    {
                        "name": "constI16";
                        "fields": [
                            "i16"
                        ];
                    },
                    {
                        "name": "constI32";
                        "fields": [
                            "i32"
                        ];
                    },
                    {
                        "name": "constI64";
                        "fields": [
                            "i64"
                        ];
                    },
                    {
                        "name": "constI128";
                        "fields": [
                            "i128"
                        ];
                    },
                    {
                        "name": "constF32";
                        "fields": [
                            "f32"
                        ];
                    },
                    {
                        "name": "constF64";
                        "fields": [
                            "f64"
                        ];
                    },
                    {
                        "name": "not";
                        "fields": [
                            {
                                "name": "operand";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "neg";
                        "fields": [
                            {
                                "name": "operand";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "isZero";
                        "fields": [
                            {
                                "name": "operand";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "nonZero";
                        "fields": [
                            {
                                "name": "operand";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "asU64";
                        "fields": [
                            {
                                "name": "operand";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "asU128";
                        "fields": [
                            {
                                "name": "operand";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "add";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "sub";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "mul";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "div";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "divFloor";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "divCeil";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "min";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "max";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "eq";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "ne";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "gt";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "ge";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "lt";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "le";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "saturatingSub";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "and";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "or";
                        "fields": [
                            {
                                "name": "lhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "rhs";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "bpsMulFloor";
                        "fields": [
                            {
                                "name": "amount";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "bps";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "bpsMulCeil";
                        "fields": [
                            {
                                "name": "amount";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "bps";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "mulDivFloor";
                        "fields": [
                            {
                                "name": "a";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "b";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "c";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "mulDivCeil";
                        "fields": [
                            {
                                "name": "a";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "b";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "c";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "clamp";
                        "fields": [
                            {
                                "name": "value";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "lo";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "hi";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "select";
                        "fields": [
                            {
                                "name": "cond";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "thenExpr";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            },
                            {
                                "name": "elseExpr";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    }
                ];
            };
        },
        {
            "name": "frame";
            "docs": [
                "Transaction-scoped SSA frame; `tape` is an append-only byte buffer per session."
            ];
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "closeAuthority";
                        "type": "pubkey";
                    },
                    {
                        "name": "cursor";
                        "docs": [
                            "Next append byte position in `tape` after `ifx_reset_frame` (or `ifx_create_frame`)."
                        ];
                        "type": "u32";
                    },
                    {
                        "name": "indexCount";
                        "docs": [
                            "Bindings appended since last reset."
                        ];
                        "type": "u16";
                    },
                    {
                        "name": "indexCap";
                        "docs": [
                            "Fixed at create: `payload_at.len()` (= `index_cap_for_tape_len(tape_len)`)."
                        ];
                        "type": "u16";
                    },
                    {
                        "name": "payloadAt";
                        "docs": [
                            "`payload_at[i]` = byte offset of binding `i` payload in `tape`."
                        ];
                        "type": {
                            "vec": "u16";
                        };
                    },
                    {
                        "name": "tape";
                        "type": "bytes";
                    }
                ];
            };
        },
        {
            "name": "ifElseArgs";
            "docs": [
                "Arguments for [`crate::ifx_if_else`]: `cond` must evaluate to **`Bool`**."
            ];
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "cond";
                        "type": {
                            "defined": {
                                "name": "expr";
                            };
                        };
                    },
                    {
                        "name": "thenArm";
                        "type": {
                            "defined": {
                                "name": "ifElseArm";
                            };
                        };
                    },
                    {
                        "name": "elseArm";
                        "type": {
                            "defined": {
                                "name": "ifElseArm";
                            };
                        };
                    }
                ];
            };
        },
        {
            "name": "ifElseArm";
            "docs": [
                "One side of `ifx_if_else`: skip, revert, or 1..254 `Cpi` steps (wire tag = step count)."
            ];
            "type": {
                "kind": "enum";
                "variants": [
                    {
                        "name": "skip";
                    },
                    {
                        "name": "cpi";
                        "fields": [
                            {
                                "vec": {
                                    "defined": {
                                        "name": "cpi";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "revert";
                    }
                ];
            };
        },
        {
            "name": "letArgs";
            "docs": [
                "Parallel bindings for a single top-level `ifx_let`."
            ];
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "bindings";
                        "type": {
                            "defined": {
                                "name": "ifx::state::u8_len_vec::U8LenVec<ifx::state::types::LetBinding>";
                                "generics": [
                                    {
                                        "kind": "type";
                                        "type": {
                                            "defined": {
                                                "name": "letBinding";
                                            };
                                        };
                                    }
                                ];
                            };
                        };
                    }
                ];
            };
        },
        {
            "name": "letBinding";
            "docs": [
                "One `ifx_let` binding: wire tag selects variant; Frame `ty` is implied (or explicit for slices/eval).",
                "",
                "Variant order matches opcode tags `0`–`24` (see `docs/typed-let-bindings.md`)."
            ];
            "type": {
                "kind": "enum";
                "variants": [
                    {
                        "name": "accountDataSlice";
                        "fields": [
                            {
                                "name": "ty";
                                "type": {
                                    "defined": {
                                        "name": "valueType";
                                    };
                                };
                            },
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            },
                            {
                                "name": "offset";
                                "type": "u32";
                            },
                            {
                                "name": "expectedProgramOwner";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "accountLamports";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "eval";
                        "fields": [
                            {
                                "name": "expr";
                                "type": {
                                    "defined": {
                                        "name": "expr";
                                    };
                                };
                            }
                        ];
                    },
                    {
                        "name": "sysvarClockSlot";
                    },
                    {
                        "name": "sysvarClockEpochStartTimestamp";
                    },
                    {
                        "name": "sysvarClockEpoch";
                    },
                    {
                        "name": "sysvarClockLeaderScheduleEpoch";
                    },
                    {
                        "name": "sysvarClockUnixTimestamp";
                    },
                    {
                        "name": "sysvarRentMinimumBalance";
                        "fields": [
                            {
                                "name": "dataLen";
                                "type": "u32";
                            }
                        ];
                    },
                    {
                        "name": "splTokenAccountAmount";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splTokenAccountDelegatedAmount";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splTokenAccountState";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splMintSupply";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splMintDecimals";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022AccountAmount";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022AccountDelegatedAmount";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022AccountState";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022MintSupply";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022MintDecimals";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022AccountTransferFeeWithheld";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022MintTransferFeeBasisPoints";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022MintTransferFeeMaximum";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022MintWithheldAmount";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022MintDefaultAccountState";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "accountDataLen";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    }
                ];
            };
        },
        {
            "name": "value";
            "docs": [
                "Reference to a bound value by **binding index** (0-based append order)."
            ];
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "index";
                        "type": "u8";
                    }
                ];
            };
        },
        {
            "name": "valueType";
            "docs": [
                "Primitive types supported in Frame tape and `ifx_let` (little-endian, fixed width)."
            ];
            "type": {
                "kind": "enum";
                "variants": [
                    {
                        "name": "bool";
                    },
                    {
                        "name": "u8";
                    },
                    {
                        "name": "u16";
                    },
                    {
                        "name": "u32";
                    },
                    {
                        "name": "u64";
                    },
                    {
                        "name": "u128";
                    },
                    {
                        "name": "i8";
                    },
                    {
                        "name": "i16";
                    },
                    {
                        "name": "i32";
                    },
                    {
                        "name": "i64";
                    },
                    {
                        "name": "i128";
                    },
                    {
                        "name": "f32";
                    },
                    {
                        "name": "f64";
                    }
                ];
            };
        }
    ];
};
