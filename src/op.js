
import * as Error from './error.js';
import { ArrayLit } from './ast.js';

// Helper functions for producing operations on the stack

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
  let mod = term.getNumMod(2);
  if (mod == 0) {
    if (opts['zero'] === undefined) {
      throw new Error.InvalidModifier(term);
    } else {
      state.push(opts['zero']);
    }
    return;
  }
  if ((mod == 1) && (opts['one'] !== undefined)) {
    let top = state.pop();
    state.push(opts['one'](top));
    return;
  }
  let arr = state.pop(mod);
  state.push(arr.reduce(fn));
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
  let mod = term.getNumMod(2);
  if (mod == 0) {
    if (opts['zero'] === undefined) {
      throw new Error.InvalidModifier(term);
    } else {
      state.push(opts['zero']);
    }
    return;
  }
  if ((mod == 1) && (opts['one'] !== undefined)) {
    if (opts['one'] === undefined) {
      throw new Error.InvalidModifier(term);
    } else {
      state.push(opts['one']);
    }
    return;
  }
  let arr = state.pop(mod);
  let brr = [];
  for (let i = 0; i < arr.length - 1; i++) {
    brr.push(fn(arr[i], arr[i + 1]));
  }
  state.push(brr.reduce(reduce));
}

export function scalarExtend(f) {
  function f1(x, y) {
    if ((x instanceof ArrayLit) || (y instanceof ArrayLit)) {
      if (!(x instanceof ArrayLit)) {
        x = ArrayLit.filled(y.length, x);
      }
      if (!(y instanceof ArrayLit)) {
        y = ArrayLit.filled(x.length, y);
      }
      if (x.length != y.length)
        throw new Error.IncompatibleArrayLengths();
      let z = Array(x.length);
      for (let i = 0; i < x.length; i++) {
        z[i] = f1(x.data[i], y.data[i]);
      }
      return new ArrayLit(z);
    } else {
      return f(x, y);
    }
  }
  return f1;
}
