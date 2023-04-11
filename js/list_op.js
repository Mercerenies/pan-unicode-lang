import * as Error from './error.js';
import { AST, ArrayLit, LazyListLit, NumberLit, StringLit, SentinelValue, tryCall, isTruthy, SymbolLit } from './ast.js';
import { NumModifier, MAX_NUM_MODIFIER } from './modifier.js';
import Str from './str.js';
import { customLT, defaultLT, equals } from './comparison.js';
import { isList, isNumber, isString } from './type_check.js';
import { Token } from './token.js';
import { assertNever, range, sortM } from './util.js';
// Filter (⌿) always takes exactly two arguments off the stack. Its
// behavior is very general. The numerical modifier determines the
// maximum depth that we will dig into the list argument (the first
// argument). So, for instance, if our list argument is
//
// { 0 { 1 } { { 2 } 3 } }
//
// Then a modifier of ③ will operate on 0, 1, 2, 3. A modifier of ②
// will operate on 0, 1, {2}, 3. A modifier of ① (the default) will
// operate on 0, {1}, {{2} 3}. A modifier of ⓪ will operate on the
// list as a whole. Note that a modifier of ⑳ is treated as infinity
// and will nest arbitrarily deep.
//
// For each position in the original list at index (i1, i2, ..., in),
// we get the corresponding entry from the function argument. If the
// function argument is not nested as deeply, then we simply access as
// many indices as possible until we reach a non-list. The result
// shall be either a number or a function. If it's a function, it's
// called with the value as an argument and should return a number.
// The absolute value of the number, in either case, determines the
// number of times to repeat the argument.
//
// Examples: (Assume f, g, h are function literals)
//
// { 0 1 2 } f ⌿ will call f for each of 0, 1, 2
//
// { 0 1 { 2 } } f ⌿ will call f for each of 0, 1, {2}
//
// { 0 1 { 2 } } f② ⌿ will call f for each of 0, 1, 2
//
// { 0 1 { 2 } } { f g h } ⌿ will call f on 0, g on 1, h on {2}
//
// { 0 1 { 2 } } { f g h } ⌿② will call f on 0, g on 1, h on 2
//
// { 0 {1 2} } { f g } ⌿② will call f on 0, g on 1, g on 2
//
// { 0 {1 2} } { f {g h} } ⌿② will call f on 0, g on 1, h on 2
//
// In any example above, we can replace a function with a number, and
// it will be treated as a constant function which returns that number.
export async function filter(term, state) {
    let depth = term.getNumMod(1);
    if (depth === MAX_NUM_MODIFIER) {
        depth = Infinity;
    }
    const [list, func] = state.pop(2);
    const result = await runFilter(depth, list, func, state);
    state.push(...result);
}
async function filterTestFunc(value, func, state) {
    if (func instanceof NumberLit) {
        if (!Number.isInteger(func.value)) {
            throw new Error.TypeError("integer", func);
        }
        return Math.abs(func.value);
    }
    else {
        state.push(value);
        await tryCall(func, state);
        const result = isNumber(state.pop());
        if (!Number.isInteger(result.value)) {
            throw new Error.TypeError("integer", result);
        }
        return Math.abs(result.value);
    }
}
async function runFilter(depth, list, func, state) {
    if (depth <= 0 || !(list instanceof ArrayLit)) {
        const count = await filterTestFunc(list, func, state);
        return Array(count).fill(list);
    }
    else {
        let mask;
        if (func instanceof ArrayLit) {
            if (func.data.length !== list.data.length) {
                throw new Error.IncompatibleArrayLengths();
            }
            mask = func.data;
        }
        else {
            mask = Array(list.data.length).fill(func);
        }
        let result = [];
        for (let i = 0; i < mask.length; i++) {
            result = result.concat(await runFilter(depth - 1, list.data[i], mask[i], state));
        }
        return [new ArrayLit(result)];
    }
}
// Map (¨). Takes two arguments: a list and a function. The first
// numerical argument controls the number of lists to pop (Map will
// always pop one more total argument than its first numerical
// argument, as it also pops the function). The second numerical
// argument determines the depth in the same way as filter's depth
// argument. Both numerical arguments default to 1. The function can
// be a function or an arbitrary nested list of functions.
//
// Examples:
//
// {1 {1} {{1}}} [1≡] ¨①⓪ evaluates to 0
//
// {1 {1} {{1}}} [1≡] ¨①① evaluates to {-1 0 0}
//
// {1 {1} {{1}}} [1≡] ¨①② evaluates to {-1 {-1} {0}}
//
// {1 {1} {{1}}} [1≡] ¨①③ evaluates to {-1 {-1} {{-1}}}
//
// Note that ¨①⓪ is just $ and ¨⓪① will simply pop the function and
// call it once with no arguments.
export async function map(term, state) {
    let [argCount, depth] = term.getNumMod(1, 1);
    if (depth === MAX_NUM_MODIFIER) {
        depth = Infinity;
    }
    const everything = state.pop(argCount + 1);
    const args = everything.slice(0, -1);
    const func = everything[everything.length - 1];
    const result = await runMap(depth, args, func, async function (args, func) {
        state.push(...args);
        await tryCall(func, state);
        return state.pop();
    });
    state.push(result);
}
// Given an array, checks that every element of the array is either an
// ArrayLit with the same length or a non-ArrayLit. If two ArrayLit of
// distinct lengths are encountered, an exception is raised. If no
// ArrayLits are present (if the array is empty, for instance, or
// contains other ASTs exclusively), then undefined is returned.
function getNodeLength(args) {
    let length = undefined;
    for (const arg of args) {
        if (!(arg instanceof ArrayLit)) {
            continue;
        }
        if (length == null) {
            // First array encountered, so set the length
            length = arg.data.length;
        }
        else if (length !== arg.data.length) {
            // Incompatible array lengths encountered
            throw new Error.IncompatibleArrayLengths();
        }
        else {
            // Compatible length, so proceed
        }
    }
    return length;
}
async function runMap(depth, args, func, baseCase) {
    const len = getNodeLength(args);
    if (depth <= 0 || len === undefined) {
        return await baseCase(args, func);
    }
    else {
        // TODO mask does the same thing here as in filter; consolidate?
        let mask;
        if (func instanceof ArrayLit) {
            if (func.data.length !== len) {
                throw new Error.IncompatibleArrayLengths();
            }
            mask = func.data;
        }
        else {
            mask = Array(len).fill(func);
        }
        const result = [];
        for (let i = 0; i < len; i++) {
            const newArgs = args.map(function (v) {
                if (v instanceof ArrayLit) {
                    return v.data[i];
                }
                else {
                    return v;
                }
            });
            result.push(await runMap(depth - 1, newArgs, mask[i], baseCase));
        }
        return new ArrayLit(result);
    }
}
// Just like map but doesn't expect a result of any kind.
export async function each(term, state) {
    let [argCount, depth] = term.getNumMod(1, 1);
    if (depth === MAX_NUM_MODIFIER) {
        depth = Infinity;
    }
    const everything = state.pop(argCount + 1);
    const args = everything.slice(0, -1);
    const func = everything[everything.length - 1];
    await runMap(depth, args, func, async function (args, func) {
        state.push(...args);
        await tryCall(func, state);
        return SentinelValue.null;
    });
}
// Nested query (n) Takes two arguments: a list/string and an index,
// which can be either a number or a list. The index is traversed in
// order, taking the nth element of the list/string at each step.
export async function nestedQuery(term, state) {
    const [list, index0] = state.pop(2);
    let index;
    if (index0 instanceof NumberLit) {
        index = [index0];
    }
    else if (index0 instanceof ArrayLit) {
        index = index0.data;
    }
    else {
        throw new Error.TypeError("number or array", index0);
    }
    let result = list;
    for (const idx of index) {
        result = await nth(state, result, idx);
    }
    if (result != null) {
        state.push(result);
    }
    else {
        state.push(SentinelValue.null);
    }
}
// Select (⊇) takes two arguments: a list/string and an index. The
// index can either be a number or a list. If it's a number, it's
// treated a a singleton list. A new list/string is formed by taking
// the elements at the given positions. Any invalid indices are
// ignored.
export async function select(term, state) {
    const [list, index0] = state.pop(2);
    let index;
    if (index0 instanceof NumberLit) {
        index = [index0];
    }
    else if (index0 instanceof ArrayLit) {
        index = index0.data;
    }
    else {
        throw new Error.TypeError("number or array", index0);
    }
    if (!((list instanceof StringLit) || (list instanceof ArrayLit))) {
        throw new Error.TypeError("array or string", list);
    }
    const results = [];
    for (const idx of index) {
        const curr = await nth(state, list, idx);
        if (curr != null) {
            results.push(curr);
        }
    }
    state.push(rebuild(list, results));
}
// If model is a string, concatenate values into a string. If model is
// a list, concatenate values into a list.
function rebuild(model, values) {
    if (model instanceof StringLit) {
        return new StringLit(new Str(values.map(function (x) {
            return isString(x).text.toString();
        })));
    }
    else if (model instanceof ArrayLit) {
        return new ArrayLit(values);
    }
    else {
        return assertNever(model);
    }
}
export async function nth(state, value, index) {
    if (index instanceof AST) {
        index = isNumber(index).value;
    }
    if (value instanceof StringLit) {
        if (index < 0) {
            index += value.text.length;
        }
        const result = value.text.charAt(index);
        return new StringLit(result);
    }
    else if (value instanceof ArrayLit) {
        if (index < 0) {
            index += value.data.length;
        }
        return value.data[index];
    }
    else if (value instanceof LazyListLit) {
        return await value.getNth(state, index);
    }
    else {
        return value;
    }
}
// (⍋) By default, gradeUp takes one argument: a list. It returns a
// list of indices which indicates the permutation placing the list
// into ascending order. With a prime modifier, this will pop a
// function (before popping the list) that will be used as the "less
// than" operator for comparison. Returns a list of indices which
// indicate the permutation of the list after sorting.
export async function gradeUp(term, state) {
    let list0;
    let func;
    if (term.getPrimeMod() > 0) {
        let customFunc;
        [list0, customFunc] = state.pop(2);
        func = customLT(state, customFunc);
    }
    else {
        list0 = state.pop();
        func = defaultLT(state);
    }
    const list = isList(list0);
    const indices = range(0, list.data.length);
    await sortM(indices, async function (a, b) {
        if (await func(list.data[a], list.data[b])) {
            return -1;
        }
        else if (await func(list.data[b], list.data[a])) {
            return 1;
        }
        else {
            return 0;
        }
    });
    state.push(new ArrayLit(indices.map((x) => new NumberLit(x))));
}
// (⍪) Flattens nested lists. Numerical argument (default=1)
// determines how many layers to flatten. Numerical argument of 20 is
// treated as infinity. Numerical argument of 0 results in no change
// to the list.
export function ravel(term, state) {
    let depth = term.getNumMod(1);
    if (depth === MAX_NUM_MODIFIER) {
        depth = Infinity;
    }
    const list = isList(state.pop());
    state.push(new ArrayLit(doRavel(depth, list.data)));
}
export function doRavel(depth, list) {
    if (depth <= 0) {
        return list;
    }
    else {
        let result = [];
        for (const elem of list) {
            if (elem instanceof ArrayLit) {
                result = result.concat(doRavel(depth - 1, elem.data));
            }
            else {
                result.push(elem);
            }
        }
        return result;
    }
}
// Outer product (⊗) takes one numerical argument N, which defaults to
// 1. It pops N+1 values, where the top value should be a function and
// the rest should be lists. The function will be called with one
// argument from each list, for every possible combination of such
// arguments.
//
// Examples:
//
// {"a" "b"} {"A" "B"} `⋄ ⊗ equals {{"aA" "aB"} {"bA" "bB"}}
//
// {"a" "b"} {"A" "B"} `⋄ ⊗② equals {{"aA" "aB"} {"bA" "bB"}}
//
// Note that ⊗① simply maps over a list, and ⊗⓪ simply calls the
// function once.
//
// If you wish to get a flat result structure (rather than the nested
// one that ⊗ produces, you should call Flatten (⍪) on the result,
// with a numerical argument one smaller than the one passed to ⊗.
export async function outerProduct(term, state) {
    const argCount = term.getNumMod(2);
    const func = state.pop();
    const args = state.pop(argCount);
    const arglists = [];
    for (const arg of args) {
        arglists.push(isList(arg).data);
    }
    state.push(await doOuterProduct(state, func, arglists, 0, []));
}
export async function doOuterProduct(state, func, arglists, n, prefix) {
    if (n >= arglists.length) {
        state.push(...prefix);
        await tryCall(func, state);
        return state.pop();
    }
    else {
        const result = [];
        for (const elem of arglists[n]) {
            const curr = await doOuterProduct(state, func, arglists, n + 1, prefix.concat([elem]));
            result.push(curr);
        }
        return new ArrayLit(result);
    }
}
export function* cartesianProduct(lists) {
    yield* cartesianProductRec(lists, 0, []);
}
function* cartesianProductRec(lists, n, prefix) {
    if (n >= lists.length) {
        yield prefix;
    }
    else {
        for (const elem of lists[n]) {
            yield* cartesianProductRec(lists, n + 1, prefix.concat([elem]));
        }
    }
}
// ∈ (Member). By default, it takes two arguments: the first is a list
// and the second is an element to search for. Returns all of the
// indices at which the element can be found in the list. If used with
// a prime modifier, the search element is instead a unary function,
// which is called for each position.
export async function member(term, state) {
    const [list0, needle] = state.pop(2);
    const list = isList(list0);
    let func;
    if (term.getPrimeMod() > 0) {
        func = async function (x) {
            state.push(x);
            await tryCall(needle, state);
            return isTruthy(state.pop());
        };
    }
    else {
        func = (x) => equals(state, x, needle);
    }
    const result = [];
    for (let i = 0; i < list.data.length; i++) {
        const v = list.data[i];
        if (await func(v)) {
            result.push(new NumberLit(i));
        }
    }
    state.push(new ArrayLit(result));
}
// Length (#). By default, returns the length of the list. With a
// numerical modifier, this will happily nest deeper and count the
// length of sublists as well. Numerical argument of 20 is treated as
// infinity.
export function length(term, state) {
    const num = term.getNumMod(1);
    if (num === 0) {
        // There's one thing, if we ignore all depth. Simple and dumb result.
        state.pop();
        state.push(1);
        return;
    }
    const newTerm = new SymbolLit(new Token('⍪'));
    newTerm.modifiers.push(new NumModifier(num === MAX_NUM_MODIFIER || num === 0 ? num : num - 1));
    ravel(newTerm, state);
    const list = isList(state.pop());
    state.push(list.data.length);
}
// Reshape (⍴) takes two arguments: a list and a shape. Its numerical
// argument defaults to 20 (which equates to infinity). The first thing
// it does is ravel the list to the depth of its own numerical
// argument. Then it produces a new list of the specified shape, where
// the shape should either be a number or a list of numbers.
export function reshape(term, state) {
    const shape0 = state.pop();
    let shape;
    if (shape0 instanceof ArrayLit) {
        shape = shape0;
    }
    else {
        shape = new ArrayLit([shape0]);
    }
    let depth = term.getNumMod(MAX_NUM_MODIFIER);
    if (depth === MAX_NUM_MODIFIER) {
        depth = Infinity;
    }
    const newTerm = new SymbolLit(new Token('⍪'));
    newTerm.modifiers.push(new NumModifier(depth));
    ravel(newTerm, state);
    const list = isList(state.pop());
    if (list.data.length === 0) {
        throw new Error.TypeError("nonempty list", list);
    }
    const result = doReshape(shape.data, 0, list.data, [0]);
    state.push(result);
}
// listPos is a 1-element array (cheap and nasty ref cell) (HACK)
export function doReshape(shape, shapePos, list, listPos) {
    if (shapePos >= shape.length) {
        const result = list[listPos[0] % list.length];
        listPos[0] += 1;
        return result;
    }
    else {
        const dim = isNumber(shape[shapePos]).value;
        const result = [];
        for (let i = 0; i < dim; i++) {
            result.push(doReshape(shape, shapePos + 1, list, listPos));
        }
        return new ArrayLit(result);
    }
}
