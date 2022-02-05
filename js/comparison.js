import { SimpleCmd, ArrayLit, StringLit, NumberLit, Box, isTruthy, tryCall } from './ast.js';
import { IncomparableValues } from './error.js';
import { arrayEq } from './util.js';
export var Ordering;
(function (Ordering) {
    Ordering[Ordering["LT"] = -1] = "LT";
    Ordering[Ordering["EQ"] = 0] = "EQ";
    Ordering[Ordering["GT"] = 1] = "GT";
})(Ordering || (Ordering = {}));
export function toOrdering(n) {
    return Math.sign(n);
}
// Note: Equality will never produce an error. Comparing values of
// different types simply returns false.
export function equals(a, b) {
    if (a === b) {
        return true;
    }
    if (a instanceof SimpleCmd && b instanceof SimpleCmd) {
        if (symbolCmp(a, b) == Ordering.EQ) {
            return true;
        }
    }
    if (a instanceof ArrayLit && b instanceof ArrayLit) {
        if (arrayEq(a.data, b.data, equals)) {
            return true;
        }
    }
    if (a instanceof StringLit && b instanceof StringLit) {
        if (a.text.toString() === b.text.toString() && a.isRegexp() === b.isRegexp()) {
            return true;
        }
    }
    if (a instanceof NumberLit && b instanceof NumberLit) {
        if (a.value === b.value) {
            return true;
        }
    }
    if (a instanceof Box && b instanceof Box) {
        if (equals(a.value, b.value)) {
            return true;
        }
    }
    return false;
}
// Unlike equality, comparison WILL throw an error if given
// incompatible types.
export function compare(a, b) {
    if (a instanceof NumberLit && b instanceof NumberLit) {
        return toOrdering(a.value - b.value);
    }
    else if (a instanceof ArrayLit && b instanceof ArrayLit) {
        return arrayCmp(a.data, b.data, compare);
    }
    else if (a instanceof SimpleCmd && b instanceof SimpleCmd) {
        return symbolCmp(a, b);
    }
    else if (a instanceof StringLit && b instanceof StringLit) {
        const a1 = a.text.toString();
        const b1 = b.text.toString();
        if (a1 < b1) {
            return Ordering.LT;
        }
        else if (a1 > b1) {
            return Ordering.GT;
        }
        else {
            return toOrdering((+a.isRegexp()) - (+b.isRegexp()));
        }
    }
    else if (a instanceof Box && b instanceof Box) {
        return compare(a.value, b.value);
    }
    else {
        throw new IncomparableValues(a, b);
    }
}
function arrayCmp(a, b, comparator) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const result = comparator(a[i], b[i]);
        if (result !== Ordering.EQ) {
            return result;
        }
    }
    return toOrdering(a.length - b.length);
}
function symbolCmp(a, b) {
    if (a.token.text < b.token.text) {
        return Ordering.LT;
    }
    else if (a.token.text > b.token.text) {
        return Ordering.GT;
    }
    else {
        const numModCmp = arrayCmp(a.getAllNumMods(), b.getAllNumMods(), (a, b) => toOrdering(a - b));
        if (numModCmp != Ordering.EQ) {
            return numModCmp;
        }
        else {
            return toOrdering(a.getPrimeMod() - b.getPrimeMod());
        }
    }
}
export async function defaultLT(x, y) {
    return compare(x, y) === Ordering.LT;
}
export function customLT(state, fn) {
    return async function (x, y) {
        state.push(x, y);
        await tryCall(fn, state);
        return isTruthy(state.pop());
    };
}
