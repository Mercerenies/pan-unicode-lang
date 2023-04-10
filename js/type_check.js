import { TypeError } from './error.js';
import { NumberLit, StringLit, ArrayLit, LazyListLit } from './ast.js';
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
//// names and error messages here
export const isList = checkOrThrow("eager list", function (v) {
    return v instanceof ArrayLit;
});
export const isEitherList = checkOrThrow("list", function (v) {
    return (v instanceof ArrayLit) || (v instanceof LazyListLit);
});
export const isLazyList = checkOrThrow("lazy list", function (v) {
    return v instanceof LazyListLit;
});
export const isStringOrList = checkOrThrow("string or eager list", function (v) {
    return v instanceof StringLit || v instanceof ArrayLit;
});
export const isStringOrEitherList = checkOrThrow("string or list", function (v) {
    return v instanceof StringLit || v instanceof ArrayLit || v instanceof LazyListLit;
});
