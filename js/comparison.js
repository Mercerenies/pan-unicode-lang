import { SentinelValue, ArrayLit, StringLit, NumberLit, Box, isTruthy, tryCall } from './ast.js';
import { IncomparableValues } from './error.js';
import { arrayEq } from './util.js';
export var Ordering = {
    LT: -1,
    EQ: 0,
    GT: 1
};
export var toOrdering = function (n) {
    return Math.sign(n);
};
// Note: Equality will never produce an error. Comparing values of
// different types simply returns false.
export var equals = function (a, b) {
    if (a === b) {
        return true;
    }
    if (a instanceof SentinelValue && b instanceof SentinelValue) {
        if (a.type.toString() === b.type.toString()) {
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
};
// Unlike equality, comparison WILL throw an error if given
// incompatible types.
export var compare = function (a, b) {
    var a1, b1, i, j, ref, result;
    switch (false) {
        case !(typeof a === 'number' && typeof b === 'number'):
            return toOrdering(a - b);
        case !(a instanceof NumberLit && b instanceof NumberLit):
            return toOrdering(a.value - b.value);
        case !(a instanceof ArrayLit && b instanceof ArrayLit):
            for (i = j = 0, ref = Math.min(a.length, b.length) - 1; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
                result = compare(a.data[i], b.data[i]);
                if (result !== Ordering.EQ) {
                    return result;
                }
            }
            return compare(a.length, b.length);
        case !(a instanceof StringLit && b instanceof StringLit):
            a1 = a.text.toString();
            b1 = b.text.toString();
            switch (false) {
                case !(a1 < b1):
                    return Ordering.LT;
                case !(a1 > b1):
                    return Ordering.GT;
                default:
                    return toOrdering(a.isRegexp() - b.isRegexp());
            }
            break;
        case !(a instanceof Box && b instanceof Box):
            return compare(a.value, b.value);
        default:
            throw new IncomparableValues(a, b);
    }
};
export var defaultLT = function (x, y) {
    return compare(x, y) === Ordering.LT;
};
export var customLT = function (state, fn) {
    return function (x, y) {
        state.push(x, y);
        tryCall(fn, state);
        return isTruthy(state.pop());
    };
};
//# sourceMappingURL=comparison.js.map
