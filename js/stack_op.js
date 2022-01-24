// Generated by CoffeeScript 2.5.1
var doCross;
import { tryCall } from './ast.js';
export var spread = function (term, state) {
    var args, argsEach, everything, func, funcs, i, k, ref, results;
    [argsEach, funcs] = term.getNumMod(1, 2);
    everything = state.pop(funcs * (argsEach + 1));
    results = [];
    for (i = k = 0, ref = funcs - 1; (0 <= ref ? k <= ref : k >= ref); i = 0 <= ref ? ++k : --k) {
        args = everything.slice(i * argsEach, (i + 1) * argsEach);
        func = everything[argsEach * funcs + i];
        state.push(...args);
        results.push(tryCall(func, state));
    }
    return results;
};
// ⤨ (Cross, an amalgamation of the operators Factor calls apply and
// cleave) takes three numerical arguments. The first (we'll call it A)
// defaults to 1, the second (call it B) defaults to 2, and the third
// (call it F) defaults to 2. A denotes the number of arguments to pass
// to each call, B denotes the number of groups of arguments, and F
// denotes the number of functions. This will pop A×B arguments and F
// functions, for a total of A×B+F values off the stack. For each
// function and each group of arguments, the function will be called
// for that group, producing every possible pairing of results in order
// (function-major ordering).
// Note: ⤨ is a very general combinator. In many cases, ↘ or ↗ will do
// what you want with fewer explicit numeric arguments, so consider
// using those before resorting to this one.
export var cross = function (term, state) {
    var a, b, f;
    [a, b, f] = term.getNumMod(1, 2, 2);
    return doCross(state, a, b, f);
};
// ↘ (Apply) is ⤨ but with F=1 automatically. Cleave takes two
// numerical arguments: A and B. A defaults to 1 and B defaults to 2.
// Mnemonic: We pass several argument groups down to one function.
export var apply = function (term, state) {
    var a, b;
    [a, b] = term.getNumMod(1, 2);
    return doCross(state, a, b, 1);
};
// ↗ (Cleave) is ⤨ but with B=1 automatically. Apply takes two numerical
// arguments: A and F. A defaults to 1 and F defaults to 2.
// Mnemonic: We pass a single argument group up to several functions.
export var cleave = function (term, state) {
    var a, f;
    [a, f] = term.getNumMod(1, 2);
    return doCross(state, a, 1, f);
};
doCross = function (state, a, b, f) {
    var args, everything, func, i, j, k, ref, results;
    everything = state.pop(a * b + f);
    results = [];
    for (i = k = 0, ref = f - 1; (0 <= ref ? k <= ref : k >= ref); i = 0 <= ref ? ++k : --k) {
        func = everything[a * b + i];
        results.push((function () {
            var l, ref1, results1;
            results1 = [];
            for (j = l = 0, ref1 = b - 1; (0 <= ref1 ? l <= ref1 : l >= ref1); j = 0 <= ref1 ? ++l : --l) {
                args = everything.slice(a * j, a * (j + 1));
                state.push(...args);
                results1.push(tryCall(func, state));
            }
            return results1;
        })());
    }
    return results;
};
//# sourceMappingURL=stack_op.js.map
