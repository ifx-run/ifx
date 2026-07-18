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
        "version": "0.1.2";
        "spec": "0.1.0";
        "description": "Created with Anchor";
    };
    "instructions": [
        {
            "name": "ifxAssert";
            "docs": [
                "Require `cond` to evaluate to `true`; otherwise revert with [`ErrorCode::AssertFailed`](crate::error::ErrorCode::AssertFailed).",
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
            "name": "ifxAssertMulti";
            "docs": [
                "Require every entry in `args.conds` to evaluate to `true`; short-circuit on first failure",
                "with [`ErrorCode::AssertFailedMulti`](crate::error::ErrorCode::AssertFailedMulti) (failing index in return data + pseudocode logs).",
                "",
                "`conds` is a [`U8LenVec`] of [`Expr`] over values already in `Frame::tape` (via prior",
                "[`ifx_let`]). At least one condition is required."
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
                    "name": "args";
                    "type": {
                        "defined": {
                            "name": "assertMultiArgs";
                        };
                    };
                }
            ];
        },
        {
            "name": "ifxCloseFrame";
            "docs": [
                "Close a [`Frame`] PDA and return rent to `authority`.",
                "",
                "Requires `authority` signer to match `Frame.authority`. Top-level only.",
                "Typical usage: standalone teardown tx when the Frame is no longer needed."
            ];
            "discriminator": [
                1
            ];
            "accounts": [
                {
                    "name": "authority";
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
                "sets `cursor = 0`, `index_count = 0`, and stores `authority` for later",
                "[`ifx_close_frame`] and write gates on [`ifx_reset_frame`] / [`ifx_let`].",
                "The PDA seeds are `[FRAME_SEED, payer, frame_id]`.",
                "",
                "**Off-curve `authority`** (e.g. Frame PDA) → public scratch. **On-curve** → private Frame.",
                "Top-level only. See `docs/frame-authority.md`."
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
                    "name": "authority";
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
                7
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
                "**Constraints:** must run at transaction top level (stack height 1).",
                "**Private** Frame: `remaining_accounts[0]` = `authority` signer; let bindings",
                "index `remaining_accounts[1..]`. **Public** Frame: bindings index from `[0]`."
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
                "`arm` is a [`Cpi`] step (see [`state::cpi`] wire: Static | RawPatched | Structured)."
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
                "Does not change `authority` or account size — only clears session data.",
                "Top-level only. **Public** Frame (off-curve `authority`): no `remaining_accounts`.",
                "**Private** Frame: `remaining_accounts[0]` = on-curve `authority` signer."
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
            "msg": "Only the frame authority may close this PDA";
        },
        {
            "code": 6003;
            "name": "invalidAuthority";
            "msg": "Invalid frame authority";
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
        },
        {
            "code": 6030;
            "name": "invalidStructuredCpiProgram";
            "msg": "Structured CPI program id does not match patch";
        },
        {
            "code": 6031;
            "name": "invalidInstructionData";
            "msg": "Invalid instruction data";
        },
        {
            "code": 6032;
            "name": "stakeUnpackFailed";
            "msg": "Failed to unpack stake account";
        },
        {
            "code": 6033;
            "name": "stakeStateMismatch";
            "msg": "Stake account state does not expose the requested field";
        },
        {
            "code": 6034;
            "name": "resetNotTopLevel";
            "msg": "ifx_reset_frame must be invoked at transaction top level (stack height 1)";
        },
        {
            "code": 6035;
            "name": "closeNotTopLevel";
            "msg": "ifx_close_frame must be invoked at transaction top level (stack height 1)";
        },
        {
            "code": 6036;
            "name": "createNotTopLevel";
            "msg": "ifx_create_frame must be invoked at transaction top level (stack height 1)";
        },
        {
            "code": 6037;
            "name": "unauthorizedFrameWrite";
            "msg": "Frame write requires authority signer";
        },
        {
            "code": 6038;
            "name": "splMintOptionEmpty";
            "msg": "SPL mint optional authority is not set";
        },
        {
            "code": 6039;
            "name": "assertFailedMulti";
            "msg": "Assertion failed in ifx_assert_multi";
        }
    ];
    "types": [
        {
            "name": "assertMultiArgs";
            "docs": [
                "Arguments for [`crate::ifx_assert_multi`]: each `conds` entry must evaluate to **`Bool`**."
            ];
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "conds";
                        "type": {
                            "defined": {
                                "name": "ifx::state::u8_len_vec::U8LenVec<ifx_core::wire::expr::Expr>";
                                "generics": [
                                    {
                                        "kind": "type";
                                        "type": {
                                            "defined": {
                                                "name": "expr";
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
            "name": "cpi";
            "docs": [
                "CPI step wire: Static (tag 0) | RawPatched (tag 1) | Structured (tag 2 + StructuredCpiPatch)."
            ];
            "type": {
                "kind": "struct";
                "fields": [];
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
                        "name": "asU8";
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
                        "name": "asU16";
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
                        "name": "asU32";
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
                        "name": "asI8";
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
                        "name": "asI16";
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
                        "name": "asI32";
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
                        "name": "asI64";
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
                        "name": "asI128";
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
                    },
                    {
                        "name": "constPubkey";
                        "fields": [
                            {
                                "array": [
                                    "u8",
                                    32
                                ];
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
                        "name": "authority";
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
                        "name": "generation";
                        "docs": [
                            "Incremented on each `ifx_reset_frame` (`wrapping_add`); `0` at create."
                        ];
                        "type": "u64";
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
                                "name": "ifx_core::u8_len_vec::U8LenVec<ifx_core::wire::let_binding::LetBinding>";
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
                "Variant order matches opcode tags `0`–`67` (see `docs/typed-let-bindings.md`)."
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
                    },
                    {
                        "name": "accountKey";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "constPubkey";
                        "fields": [
                            {
                                "name": "bytes";
                                "type": {
                                    "array": [
                                        "u8",
                                        32
                                    ];
                                };
                            }
                        ];
                    },
                    {
                        "name": "frameGeneration";
                    },
                    {
                        "name": "frameIndexCount";
                    },
                    {
                        "name": "accountIsSigner";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "accountIsWritable";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "stakeDelegationStake";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "stakeDelegationActivationEpoch";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "stakeDelegationDeactivationEpoch";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "stakeLockupUnixTimestamp";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "stakeLockupEpoch";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "stakeAuthorizedStaker";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "stakeAuthorizedWithdrawer";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "stakeDelegationVoter";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splMintIsInitialized";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splMintMintAuthority";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splMintFreezeAuthority";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022MintIsInitialized";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022MintMintAuthority";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022MintFreezeAuthority";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "accountProgramOwner";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "accountExecutable";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "accountRentEpoch";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splTokenAccountMint";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splTokenAccountOwner";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splTokenAccountDelegate";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splTokenAccountCloseAuthority";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splTokenAccountIsNative";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splTokenAccountOwnerIsDerived";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022AccountMint";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022AccountOwner";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022AccountDelegate";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022AccountCloseAuthority";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022AccountIsNative";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "splToken2022AccountOwnerIsDerived";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "stakeAccountState";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "stakeLockupCustodian";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "stakeRentExemptReserve";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "stakeCreditsObserved";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "stakeStakeFlags";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "upgradeableProgramDataTag";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "upgradeableProgramDataUpgradeAuthority";
                        "fields": [
                            {
                                "name": "accountIndex";
                                "type": "u8";
                            }
                        ];
                    },
                    {
                        "name": "upgradeableProgramProgramDataAddress";
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
                    },
                    {
                        "name": "pubkey";
                    }
                ];
            };
        }
    ];
};
