
import { AST, SimpleCmd, SentinelValue, ArrayLit, StringLit, NumberLit, Box, isTruthy, tryCall } from './ast.js';
import { IncomparableValues } from './error.js';
import { Evaluator } from './eval.js';
import { arrayEq } from './util.js';

export enum Ordering {
  LT = -1,
  EQ = 0,
  GT = 1,
}

export function toOrdering(n: number): Ordering {
  return Math.sign(n);
}

// Note: Equality will never produce an error. Comparing values of
// different types simply returns false.
export function equals(a: AST, b: AST): boolean {
  if (a === b) {
    return true;
  }
  ////
  if (a instanceof SentinelValue && b instanceof SentinelValue) {
    if (a.type.toString() === b.type.toString()) {
      return true;
    }
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
export function compare(a: AST, b: AST): Ordering {
  if (a instanceof NumberLit && b instanceof NumberLit) {
    return toOrdering(a.value - b.value);
  } else if (a instanceof ArrayLit && b instanceof ArrayLit) {
    return arrayCmp(a.data, b.data, compare);
  } else if (a instanceof SimpleCmd && b instanceof SimpleCmd) {
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
    return compare(a.value, b.value);
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


function symbolCmp(a: SimpleCmd, b: SimpleCmd): Ordering {
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


export async function defaultLT(x: AST, y: AST): Promise<boolean> {
  return compare(x, y) === Ordering.LT;
}


export function customLT(state: Evaluator, fn: AST): (x: AST, y: AST) => Promise<boolean> {
  return async function(x: AST, y: AST): Promise<boolean> {
    state.push(x, y);
    await tryCall(fn, state);
    return isTruthy(state.pop());
  };
}
