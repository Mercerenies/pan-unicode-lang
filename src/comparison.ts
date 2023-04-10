
import { AST, SymbolLit, ArrayLit, LazyListLit, ArrayLikeLit, StringLit, NumberLit, Box, isTruthy, tryCall, SentinelValue } from './ast.js';
import { IncomparableValues } from './error.js';
import { Evaluator } from './eval.js';
import { arrayEqPromise } from './util.js';

export enum Ordering {
  LT = -1,
  EQ = 0,
  GT = 1,
}

export function toOrdering(n: number): Ordering {
  return Math.sign(n);
}

export function isNull(a: AST): boolean {
  return a instanceof SymbolLit && symbolCmp(a, SentinelValue.null) == Ordering.EQ;
}

// Note: Equality will never produce an error. Comparing values of
// different types simply returns false.
export async function equals(state: Evaluator, a: AST, b: AST): Promise<boolean> {
  if (a === b) {
    return true;
  }
  if (a instanceof SymbolLit && b instanceof SymbolLit) {
    if (symbolCmp(a, b) == Ordering.EQ) {
      return true;
    }
  }
  if (a instanceof ArrayLit && b instanceof ArrayLit) {
    // Fast case for eager lists
    if (await arrayEqPromise(a.data, b.data, (a, b) => equals(state, a, b))) {
      return true;
    }
  }
  if ((a instanceof ArrayLit || a instanceof LazyListLit) && (b instanceof ArrayLit || b instanceof LazyListLit)) {
    // One of the lists is lazy; slow case
    let i = 0;
    while (true) {
      const aValue = await a.getNth(state, i);
      const bValue = await b.getNth(state, i);
      if ((aValue === undefined) || (bValue === undefined)) {
        return (aValue === bValue); // True iff they both terminated at the same moment.
      } else {
        // Both lists are still going.
        if (!await equals(state, aValue, bValue)) {
          return false;
        }
      }
      i++;
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
    if (await equals(state, a.value, b.value)) {
      return true;
    }
  }
  return false;
}


// Unlike equality, comparison WILL throw an error if given
// incompatible types.
export async function compare(state: Evaluator, a: AST, b: AST): Promise<Ordering> {
  if (a instanceof NumberLit && b instanceof NumberLit) {
    return toOrdering(a.value - b.value);
  } else if (a instanceof ArrayLit && b instanceof ArrayLit) {
    // "Fast" eager list comparison
    return arrayCmpPromise(a.data, b.data, (a, b) => compare(state, a, b));
  } else if ((a instanceof ArrayLit || a instanceof LazyListLit) && (b instanceof ArrayLit || b instanceof LazyListLit)) {
    // One of the lists is lazy; slow case
    let i = 0;
    while (true) {
      const aValue = await a.getNth(state, i);
      const bValue = await b.getNth(state, i);
      if ((aValue === undefined) && (bValue === undefined)) {
        return Ordering.EQ;
      } else if (aValue === undefined) {
        return Ordering.LT;
      } else if (bValue === undefined) {
        return Ordering.GT;
      } else {
        // Both lists are still going.
        const currentCmp = await compare(state, aValue, bValue);
        if (currentCmp != Ordering.EQ) {
          return currentCmp;
        }
      }
      i++;
    }
  } else if (a instanceof SymbolLit && b instanceof SymbolLit) {
    return symbolCmp(a, b);
  } else if (a instanceof StringLit && b instanceof StringLit) {
    const a1 = a.text.toString();
    const b1 = b.text.toString();
    if (a1 < b1) {
      return Ordering.LT;
    } else if (a1 > b1) {
      return Ordering.GT;
    } else {
      return toOrdering((+a.isRegexp()) - (+b.isRegexp()));
    }
  } else if (a instanceof Box && b instanceof Box) {
    return await compare(state, a.value, b.value);
  } else {
    throw new IncomparableValues(a, b);
  }
}


function arrayCmp<A, B>(a: A[], b: B[], comparator: (a: A, b: B) => Ordering): Ordering {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const result = comparator(a[i], b[i]);
    if (result !== Ordering.EQ) {
      return result;
    }
  }
  return toOrdering(a.length - b.length);
}


async function arrayCmpPromise<A, B>(a: A[], b: B[], comparator: (a: A, b: B) => Promise<Ordering>): Promise<Ordering> {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const result = await comparator(a[i], b[i]);
    if (result !== Ordering.EQ) {
      return result;
    }
  }
  return toOrdering(a.length - b.length);
}


function symbolCmp(a: SymbolLit, b: SymbolLit): Ordering {
  if (a.token.text < b.token.text) {
    return Ordering.LT;
  } else if (a.token.text > b.token.text) {
    return Ordering.GT;
  } else {
    const numModCmp = arrayCmp(a.getAllNumMods(), b.getAllNumMods(), (a, b) => toOrdering(a - b));
    if (numModCmp != Ordering.EQ) {
      return numModCmp;
    } else {
      return toOrdering(a.getPrimeMod() - b.getPrimeMod());
    }
  }
}


export function defaultLT(state: Evaluator): (x: AST, y: AST) => Promise<boolean> {
  return async function(x, y) {
    return (await compare(state, x, y)) === Ordering.LT;
  };
}


export function customLT(state: Evaluator, fn: AST): (x: AST, y: AST) => Promise<boolean> {
  return async function(x: AST, y: AST): Promise<boolean> {
    state.push(x, y);
    await tryCall(fn, state);
    return isTruthy(state.pop());
  };
}
