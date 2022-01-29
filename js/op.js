import * as Error from './error.js';
import { NumberLit, ArrayLit, SentinelValue } from './ast.js';
import { zip } from './util.js';
import { isNumber } from './type_check.js';
// TODO Make the functions here generic, where possible, and see if it
// completely breaks type inference.
// Helper functions for producing operations on the stack.
// Takes a binary function and constructs an operation which takes any
// number of arguments (determined by numerical modifier).
//
// - If given zero arguments, opts.zero is returned, and an exception
//   is thrown if opts.zero is undefined.
// - If given one argument, opts.one is returned. If opts.one is
//   undefined, then a single argument is popped and then pushed
//   unmodified.
// - If two or more are given, the arguments are folded starting
//   with the deepest on the stack.
export function binaryReduce(fn, term, state, opts = {}) {
    var _a;
    const defaultModifier = (_a = opts.defaultModifier) !== null && _a !== void 0 ? _a : 2;
    let mod = term.getNumMod(defaultModifier);
    if (opts.modifierAdjustment) {
        mod = opts.modifierAdjustment(mod);
    }
    if (mod === 0) {
        if (opts.zero != null) {
            state.push(opts.zero());
        }
        else {
            throw new Error.InvalidModifier(term);
        }
    }
    else if ((mod === 1) && (opts.one != null)) {
        const top = state.pop();
        state.push(opts.one(top));
    }
    else {
        const arr = state.pop(mod);
        state.push(arr.reduce(fn));
    }
}
// TODO Common superfunction to this and binaryReduce
export function binaryReduceRight(fn, term, state, opts = {}) {
    var _a;
    const defaultModifier = (_a = opts.defaultModifier) !== null && _a !== void 0 ? _a : 2;
    let mod = term.getNumMod(defaultModifier);
    if (opts.modifierAdjustment) {
        mod = opts.modifierAdjustment(mod);
    }
    if (mod === 0) {
        if (opts.zero != null) {
            state.push(opts.zero());
        }
        else {
            throw new Error.InvalidModifier(term);
        }
    }
    else if ((mod === 1) && (opts.one != null)) {
        const top = state.pop();
        state.push(opts.one(top));
    }
    else {
        const arr = state.pop(mod);
        state.push(arr.slice().reverse().reduce((x, y) => fn(y, x)));
    }
}
// Takes a binary function and constructs an operation which takes any
// number of arguments (determined by numerical modifier).
//
// - If given zero arguments, opts.zero is returned, and an exception
//   is thrown if opts.zero is undefined.
// - If given one argument, opts.one is returned. If opts.one is
//   undefined, then an exception is thrown.
// - If two or more are given, every adjacent pair is compared
//   using the binary function, and the results are reduced.
export function mergeReduce(fn, reduce, term, state, opts = {}) {
    var _a;
    const defaultModifier = (_a = opts.defaultModifier) !== null && _a !== void 0 ? _a : 2;
    let mod = term.getNumMod(defaultModifier);
    if (opts.modifierAdjustment) {
        mod = opts.modifierAdjustment(mod);
    }
    if (mod === 0) {
        if (opts.zero != null) {
            state.push(opts.zero());
        }
        else {
            throw new Error.InvalidModifier(term);
        }
    }
    else if (mod === 1) {
        if (opts.one != null) {
            const top = state.pop();
            state.push(opts.one(top));
        }
        else {
            throw new Error.InvalidModifier(term);
        }
    }
    else {
        const arr = state.pop(mod);
        const brr = [];
        for (let i = 0; i < arr.length - 1; i++) {
            brr.push(fn(arr[i], arr[i + 1]));
        }
        state.push(brr.reduce(reduce));
    }
}
export function scalarExtend(f) {
    const f1 = function (x, y) {
        if (x instanceof ArrayLit || y instanceof ArrayLit) {
            if (!(x instanceof ArrayLit)) {
                x = ArrayLit.filled(y.length, x);
            }
            if (!(y instanceof ArrayLit)) {
                y = ArrayLit.filled(x.length, y);
            }
            const x1 = x;
            const y1 = y;
            if (x1.length !== y1.length) {
                throw new Error.IncompatibleArrayLengths();
            }
            const arr = zip(x1.data, y1.data).map((curr) => f1(...curr));
            return new ArrayLit(arr);
        }
        else {
            return f(x, y);
        }
    };
    return f1;
}
export function scalarExtendUnary(f) {
    const f1 = function (x) {
        if (x instanceof ArrayLit) {
            return new ArrayLit(x.data.map(f1));
        }
        else {
            const result = f(x);
            if (typeof result === 'number') {
                return new NumberLit(result);
            }
            else {
                return result;
            }
        }
    };
    return f1;
}
export function handleWhiteFlag(state, term, default_, f) {
    if (typeof default_ === 'number') {
        default_ = new NumberLit(default_);
    }
    const mod = term.getNumMod(2);
    if (mod > 0) {
        const top = state.peek();
        if (top instanceof SentinelValue && top.type.toString() === '⚐') {
            state.pop(); // Pop the sentinel
            if (typeof default_ === 'function') {
                state.push(default_());
            }
            else {
                state.push(default_);
            }
            return;
        }
    }
    f();
}
export function noExtension(fn, term, state, opts = {}) {
    const [a, b] = state.pop(2);
    state.push(fn(a, b));
}
export const binary = function (fn, term, state, opts = {}) {
    let zero = opts.zero;
    let one = opts.one;
    if (typeof zero === 'number') {
        zero = new NumberLit(zero);
    }
    if (typeof one === 'number') {
        one = new NumberLit(one);
    }
    if ((zero != null) && typeof zero !== 'function') {
        const originalZero = zero;
        zero = () => originalZero;
    }
    if ((one != null) && typeof one !== 'function') {
        const originalOne = one;
        one = () => originalOne;
    }
    if (opts.scalarExtend && (one != null)) {
        one = scalarExtendUnary(one);
    }
    binaryReduce(fn, term, state, {
        zero: zero,
        one: one,
        modifierAdjustment: opts.modifierAdjustment,
        defaultModifier: opts.defaultModifier
    });
};
// binary but associate to the right
export const binaryRight = function (fn, term, state, opts = {}) {
    let zero = opts.zero;
    let one = opts.one;
    if (typeof zero === 'number') {
        zero = new NumberLit(zero);
    }
    if (typeof one === 'number') {
        one = new NumberLit(one);
    }
    if ((zero != null) && typeof zero !== 'function') {
        const originalZero = zero;
        zero = () => originalZero;
    }
    if ((one != null) && typeof one !== 'function') {
        const originalOne = one;
        one = () => originalOne;
    }
    if (opts.scalarExtend && (one != null)) {
        one = scalarExtendUnary(one);
    }
    binaryReduceRight(fn, term, state, {
        zero: zero,
        one: one,
        modifierAdjustment: opts.modifierAdjustment,
        defaultModifier: opts.defaultModifier
    });
};
export function merge(reduce) {
    return function (fn, term, state, opts = {}) {
        if (opts.scalarExtend) {
            reduce = scalarExtend(reduce);
        }
        let zero = opts.zero;
        let one = opts.one;
        if (typeof zero === 'number') {
            zero = new NumberLit(zero);
        }
        if (typeof one === 'number') {
            one = new NumberLit(one);
        }
        if ((zero != null) && typeof zero !== 'function') {
            const originalZero = zero;
            zero = () => originalZero;
        }
        if ((one != null) && typeof one !== 'function') {
            const originalOne = one;
            one = () => originalOne;
        }
        if (opts.scalarExtend && (one != null)) {
            one = scalarExtendUnary(one);
        }
        return mergeReduce(fn, reduce, term, state, {
            zero: zero,
            one: one,
            modifierAdjustment: opts.modifierAdjustment,
            defaultModifier: opts.defaultModifier
        });
    };
}
export const mergeAnd = merge(function (a, b) {
    return new NumberLit(isNumber(a).value & isNumber(b).value);
});
export const WhiteFlag = {
    // Inherit from the zero argument, if provided. If not, behaves like
    // ignore.
    inherit: function (opts) {
        return opts.zero;
    },
    // Use a constant value.
    value: function (n) {
        return function (opts) {
            return n;
        };
    },
    // Perform no special handling.
    ignore: function (opts) {
        return undefined;
    }
};
export function boolToInt(x) {
    return new NumberLit(x ? -1 : 0);
}
;
// This function is an attempt to summarize all of the above,
// providing all of that functionality as keyword arguments. The
// available keyword arguments are listed below.
//
// - function (required) - The function to apply.
//
// - postProcess (required) - Unary function; runs after the original
//   function. Defaults to the identity function.
//
// - preProcess (required) - Unary function; runs on each argument to
//   the original function. Generally, this is a type check of some
//   variety.
//
// - extension (optional) - If provided, this should be one of
//   Op.none, Op.binary, or Op.merge(...). It determines how to reduce
//   the function along more arguments.
//
// - scalarExtend (optional) - Boolean which defaults to false. If
//   true, the function will extend if at least one of the arguments
//   is a list.
//
// - zero (optional) - If provided, this will be used as the
//   zero-argument result after extension.
//
// - one (optional) - If provided, this will be used as the
//   one-argument result after extension.
//
// - whiteFlag (optional) - How to handle the white flag, usually one
//   of the WhiteFlag.* constants. Defaults to WhiteFlag.inherit.
//
// - modifierAdjustment (optional) - A unary function to apply to the
//   numerical modifier before interpreting it as arity. Defaults to
//   the identity function.
//
// - defaultModifier (optional) - Default modifier. Defaults to 2.
export function op(state, term, opts) {
    var _a;
    const postprocessor = opts.postProcess;
    const preprocessor = opts.preProcess;
    let func = (a, b) => postprocessor(opts.function(preprocessor(a), preprocessor(b)));
    if (opts.scalarExtend) {
        func = scalarExtend(func);
    }
    let operation = function () {
        var _a;
        const f = (_a = opts.extension) !== null && _a !== void 0 ? _a : noExtension;
        f(func, term, state, opts);
    };
    const whiteFlag = ((_a = opts.whiteFlag) !== null && _a !== void 0 ? _a : WhiteFlag.inherit)(opts);
    if (whiteFlag != null) {
        const oldOperation = operation;
        operation = function () {
            handleWhiteFlag(state, term, whiteFlag, oldOperation);
        };
    }
    operation();
}
// Takes a value that may or may not be a function. If it's not a
// function, wraps it in a trivial constant function.
export function wrapInFunction(value) {
    if (typeof value === 'function') {
        // Exclude<B, Function> & Function is an empty type. I can't seem
        // to prove that to the type checker, but it is. There's no value
        // which is simultaneously a function and not a function.
        //
        // TODO ...Prove it
        return value;
    }
    else {
        return () => value;
    }
}
