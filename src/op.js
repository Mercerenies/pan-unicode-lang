
import * as Error from './error.js';
import { ArrayLit } from './ast.js';

// Helper functions for producing operations on the stack

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
  }
  let arr = state.pop(mod);
  state.push(arr.reduce(fn));
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
