"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCond = toCond;
const typed_1 = require("../typed");
const builder_1 = require("./builder");
/** `Cond` → wire `Expr` for assert / if_else. */
function toCond(c) {
    if ((0, typed_1.isScratchValue)(c)) {
        return builder_1.expr.ref(c);
    }
    return c;
}
