
import * as Error from './error.js';
import { AST, SymbolLit, NumberLit, ArrayLit } from './ast.js';
import { zip, reduceM } from './util.js';
import { Evaluator } from './eval.js';
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
export async function binaryReduce(
  fn: (a: AST, b: AST) => Promise<AST>,
  term: SymbolLit,
  state: Evaluator,
  opts: Partial<BinaryReduceOptions> = {},
): Promise<void> {
  const defaultModifier = opts.defaultModifier ?? 2;
  let mod = term.getNumMod(defaultModifier);

  if (opts.modifierAdjustment) {
    mod = opts.modifierAdjustment(mod);
  }

  if (mod === 0) {
    if (opts.zero != null) {
      state.push(opts.zero());
    } else {
      throw new Error.InvalidModifier(term);
    }
  } else if ((mod === 1) && (opts.one != null)) {
    const top = state.pop();
    let one = opts.one(top);
    if (one instanceof Promise) {
      one = await one;
    }
    state.push(one);
  } else {
    const arr = state.pop(mod);
    state.push(await reduceM(arr, fn));
  }
}


// TODO Common superfunction to this and binaryReduce
export async function binaryReduceRight(
  fn: (a: AST, b: AST) => Promise<AST>,
  term: SymbolLit,
  state: Evaluator,
  opts: Partial<BinaryReduceOptions> = {},
): Promise<void> {
  const defaultModifier = opts.defaultModifier ?? 2;
  let mod = term.getNumMod(defaultModifier);

  if (opts.modifierAdjustment) {
    mod = opts.modifierAdjustment(mod);
  }

  if (mod === 0) {
    if (opts.zero != null) {
      state.push(opts.zero());
    } else {
      throw new Error.InvalidModifier(term);
    }
  } else if ((mod === 1) && (opts.one != null)) {
    const top = state.pop();
    let one = opts.one(top);
    if (one instanceof Promise) {
      one = await one;
    }
    state.push(one);
  } else {
    const arr = state.pop(mod);
    state.push(await reduceM(arr.slice().reverse(), (x, y) => fn(y, x)));
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
export async function mergeReduce(
  fn: (a: AST, b: AST) => Promise<AST>,
  reduce: (a: AST, b: AST) => Promise<AST>,
  term: SymbolLit,
  state: Evaluator,
  opts: Partial<BinaryReduceOptions> = {},
): Promise<void> {
  const defaultModifier = opts.defaultModifier ?? 2;
  let mod = term.getNumMod(defaultModifier);

  if (opts.modifierAdjustment) {
    mod = opts.modifierAdjustment(mod);
  }

  if (mod === 0) {
    if (opts.zero != null) {
      state.push(opts.zero());
    } else {
      throw new Error.InvalidModifier(term);
    }
  } else if (mod === 1) {
    if (opts.one != null) {
      const top = state.pop();
      let one = opts.one(top);
      if (one instanceof Promise) {
        one = await one;
      }
      state.push(one);
    } else {
      throw new Error.InvalidModifier(term);
    }
  } else {
    const arr = state.pop(mod);
    const brr: AST[] = [];
    for (let i = 0; i < arr.length - 1; i++) {
      brr.push(await fn(arr[i], arr[i + 1]));
    }
    state.push(await reduceM(brr, reduce));
  }
}


export function scalarExtend(f: (x: AST, y: AST) => Promise<AST>) {
  const f1 = async function(x: AST, y: AST): Promise<AST> {
    if (x instanceof ArrayLit || y instanceof ArrayLit) {
      if (!(x instanceof ArrayLit)) {
        x = ArrayLit.filled((y as ArrayLit).data.length, x);
      }
      if (!(y instanceof ArrayLit)) {
        y = ArrayLit.filled((x as ArrayLit).data.length, y);
      }
      const x1 = x as ArrayLit;
      const y1 = y as ArrayLit;
      if (x1.data.length !== y1.data.length) {
        throw new Error.IncompatibleArrayLengths();
      }

      const arr: AST[] = [];
      for (const [x1arg, y1arg] of zip(x1.data, y1.data)) {
        arr.push(await f1(x1arg, y1arg));
      }
      return new ArrayLit(arr);
    } else {
      return await f(x, y);
    }
  };
  return f1;
}


export function scalarExtendUnary(f: (x: AST) => Promise<AST | number>): (x: AST) => Promise<AST> {
  const f1 = async function(x: AST): Promise<AST> {
    if (x instanceof ArrayLit) {
      const arr: AST[] = [];
      for (const xArg of x.data) {
        arr.push(await f1(xArg));
      }
      return new ArrayLit(arr);
    } else {
      const result = await f(x);
      if (typeof result === 'number') {
        return new NumberLit(result);
      } else {
        return result;
      }
    }
  };
  return f1;
}


export async function handleWhiteFlag(state: Evaluator, term: SymbolLit, default_: ASTOrNilad | number, f: () => Promise<void>): Promise<void> {
  if (typeof default_ === 'number') {
    default_ = new NumberLit(default_);
  }
  const mod = term.getNumMod(2);
  if (mod > 0) {
    const top = state.peek();
    if (top instanceof SymbolLit && top.token.text.toString() === '⚐' && top.modifiers.length == 0) {
      state.pop(); // Pop the sentinel
      if (typeof default_ === 'function') {
        state.push(default_());
      } else {
        state.push(default_);
      }
      return;
    }
  }
  await f();
}


export async function noExtension(fn: (a: AST, b: AST) => Promise<AST>, term: SymbolLit, state: Evaluator): Promise<void> {
  const [a, b] = state.pop(2);
  state.push(await fn(a, b));
}


export const binary: ExtensionFunction =
  async function(fn: (a: AST, b: AST) => Promise<AST>, term: SymbolLit, state: Evaluator, opts: Partial<BinaryReduceExtOptions> = {}): Promise<void> {
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
      const originalOne = one;
      one = scalarExtendUnary(async (x) => originalOne(x));
    }
    await binaryReduce(fn, term, state, {
      zero: zero,
      one: one,
      modifierAdjustment: opts.modifierAdjustment,
      defaultModifier: opts.defaultModifier
    });
  };


// binary but associate to the right
export const binaryRight: ExtensionFunction =
  async function(fn: (a: AST, b: AST) => Promise<AST>, term: SymbolLit, state: Evaluator, opts: Partial<BinaryReduceExtOptions> = {}): Promise<void> {
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
      const originalOne = one;
      one = scalarExtendUnary(async (x) => originalOne(x));
    }
    await binaryReduceRight(fn, term, state, {
      zero: zero,
      one: one,
      modifierAdjustment: opts.modifierAdjustment,
      defaultModifier: opts.defaultModifier
    });
  };

export function merge(reduce: (a: AST, b: AST) => Promise<AST>): ExtensionFunction {
  return async function(fn: (a: AST, b: AST) => Promise<AST>, term: SymbolLit, state: Evaluator, opts: Partial<BinaryReduceExtOptions> = {}): Promise<void> {
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
      const originalOne = one;
      one = scalarExtendUnary(async (x) => originalOne(x));
    }
    await mergeReduce(fn, reduce, term, state, {
      zero: zero,
      one: one,
      modifierAdjustment: opts.modifierAdjustment,
      defaultModifier: opts.defaultModifier
    });
  };
}

export const mergeAnd: ExtensionFunction =
  merge(async function(a, b) {
    return new NumberLit(isNumber(a).value & isNumber(b).value);
  });

export const WhiteFlag = {
  // Inherit from the zero argument, if provided. If not, behaves like
  // ignore.
  inherit: function(opts: { zero?: number | AST | (() => AST) }): number | AST | (() => AST) | undefined {
    return opts.zero;
  },
  // Use a constant value.
  value: function(n: AST): () => AST {
    return function() {
      return n;
    };
  },
  // Perform no special handling.
  ignore: function(): undefined {
    return undefined;
  }
};

export function boolToInt(x: boolean): NumberLit {
  return new NumberLit(x ? -1 : 0);
}

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
export async function op<A, B>(state: Evaluator, term: SymbolLit, opts: OpOptions<A, B>): Promise<void> {
  const postprocessor: ((x: B) => Promise<AST>) = async function(x: B): Promise<AST> {
    const result = opts.postProcess(x);
    if (result instanceof Promise) {
      return await result;
    } else {
      return result;
    }
  };
  const preprocessor: ((x: AST) => A) = opts.preProcess;
  let func = (a: AST, b: AST) => postprocessor(opts.function(preprocessor(a), preprocessor(b)));
  if (opts.scalarExtend) {
    func = scalarExtend(func);
  }
  let operation = function(): Promise<void> {
    const f = opts.extension ?? noExtension;
    return f(func, term, state, opts);
  };
  const whiteFlag = (opts.whiteFlag ?? WhiteFlag.inherit)(opts);
  if (whiteFlag != null) {
    const oldOperation = operation;
    operation = function(): Promise<void> {
      return handleWhiteFlag(state, term, whiteFlag, oldOperation);
    };
  }
  await operation();
}


export interface BinaryReduceOptions {
  defaultModifier: number;
  modifierAdjustment(mod: number): number;
  zero(): AST;
  one(top: AST): AST | Promise<AST>;
}


export interface ExtensionFunction {
  (fn: (a: AST, b: AST) => Promise<AST>, term: SymbolLit, state: Evaluator, opts: Partial<BinaryReduceExtOptions>): Promise<void>;
}


// Will be converted into a BinaryReduceOptions but allows more
// flexibility for use in our DSL.
export interface BinaryReduceExtOptions {
  defaultModifier: number;
  modifierAdjustment(mod: number): number;
  scalarExtend: boolean;
  zero: number | AST | (() => AST);
  one: number | AST | ((top: AST) => AST | Promise<AST>);
}


interface OpOptions<A, B> {
  function: (x: A, y: A) => B;
  preProcess: (x: AST) => A;
  postProcess: (y: B) => AST | Promise<AST>;
  extension?: ExtensionFunction;
  scalarExtend?: boolean;
  zero?: number | AST | (() => AST);
  one?: number | AST | ((top: AST) => AST);
  whiteFlag?: (opts: OpOptions<A, B>) => number | ASTOrNilad | undefined;
  modifierAdjustment?: (n: number) => number;
  defaultModifier?: number;
}


export type ASTOrNilad = AST | (() => AST);
