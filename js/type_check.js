import { TypeError } from './error.js';
import { NumberLit, StringLit, ArrayLit } from './ast.js';
// The predicate should check that A is an instance of B. This is very
// much not typesafe (which is why it's not exported)
function checkOrThrow(expecting, p) {
    return (value) => {
        if (p(value)) {
            return value;
        }
        else {
            throw new TypeError(expecting, value);
        }
    };
}
export const isNumber = checkOrThrow("number", function (v) {
    return v instanceof NumberLit;
});
export const isString = checkOrThrow("string", function (v) {
    return v instanceof StringLit;
});
export const isList = checkOrThrow("list", function (v) {
    return v instanceof ArrayLit;
});
export const isStringOrList = checkOrThrow("string or list", function (v) {
    return v instanceof StringLit || v instanceof ArrayLit;
});
