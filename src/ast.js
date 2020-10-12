
import * as Error from './error.js';
import { stringify } from './pretty.js';
import * as Modifier from './modifier.js';
import * as Op from './op.js';

export class AST {

  constructor() {
    this.modifiers = [];
  }

  call(state) {
    throw new Error.CallNonFunction(this);
  }

  getNumMod(default_ = undefined) {
    for (let mod of this.modifiers) {
      if (mod instanceof Modifier.NumModifier) {
        return mod.value;
      }
    }
    return default_;
  }

}

export class SimpleCmd extends AST {

  constructor(tkn) {
    super();
    this.token = tkn;
  }

  isNumberLit() {
    return typeof(this.token.text) === 'number';
  }

  ///// Boolean ∧ and ∨, as well as generalizing arithmetic to work over lists.

  eval(state) {
    if (this.isNumberLit()) {
      state.push(this.token.text);
    } else {
      switch (this.token.text) {
      // IO //
      case '.': { // Pretty print ( x -- )
        state.print(stringify(state.pop()));
        break;
      }
      // STACK SHUFFLING //
      case ':': { // Duplicate ( x -- x x )
                  // (Numerical modifier determines number of things to duplicate)
        let mod = this.getNumMod(1);
        let x = state.pop(mod);
        state.push(...x);
        state.push(...x);
        break;
      }
      case '%': { // Pop ( x -- )
                  // (Numerical modifier determines amount to pop)
        let mod = this.getNumMod(1);
        state.pop(mod);
        break;
      }
      case "@": { // Swap/Rotate ( x y -- y x )
                  // (Numerical modifier determines how deep to lift)
        let mod = this.getNumMod(1);
        let store = state.pop(mod);
        let lift = state.pop();
        state.push(...store);
        state.push(lift);
        break;
      }
      case "ø": { // Over ( x y -- x y x )
                  // (Numerical modifier determines how deep to go)
        let mod = this.getNumMod(1);
        let store = state.pop(mod);
        let lift = state.peek();
        state.push(...store);
        state.push(lift);
        break;
      }
      // ARITHMETIC //
      case '+': { // Add ( x y -- z )
                  // (Numerical modifier determines arity)
        Op.binaryReduce(Op.scalarExtend((a, b) => a + b), this, state, {'zero': 0});
        break;
      }
      case '-': { // Subtract ( x y -- z )
        Op.binaryReduce(Op.scalarExtend((a, b) => a - b), this, state, {'one': (x) => -x});
        break;
      }
      case '×': { // Multiply ( x y -- z )
        Op.binaryReduce(Op.scalarExtend((a, b) => a * b), this, state, {'zero': 1});
        break;
      }
      case '÷': { // Divide ( x y -- z )
        Op.binaryReduce(Op.scalarExtend((a, b) => a / b), this, state, {'one': (x) => 1 / x});
        break;
      }
      case '_': { // Negate ( x -- y )
        state.push(- state.pop());
        break;
      }
      // COMPARISONS //
      // TODO For now, comparison is really just designed for numbers. Generalize.
      case '=': { // Equal ( x y -- ? )
        Op.mergeReduce(Op.scalarExtend((a, b) => a == b ? -1 : 0), (a, b) => a & b, this, state, {'zero': -1});
        break;
      }
      case '<': { // LT ( x y -- ? )
        Op.mergeReduce(Op.scalarExtend((a, b) => a < b ? -1 : 0), (a, b) => a & b, this, state, {'zero': -1});
        break;
      }
      case '>': { // GT ( x y -- ? )
        Op.mergeReduce(Op.scalarExtend((a, b) => a > b ? -1 : 0), (a, b) => a & b, this, state, {'zero': -1});
        break;
      }
      case '≤': { // LE ( x y -- ? )
        Op.mergeReduce(Op.scalarExtend((a, b) => a <= b ? -1 : 0), (a, b) => a & b, this, state, {'zero': -1});
        break;
      }
      case '≥': { // GE ( x y -- ? )
        Op.mergeReduce(Op.scalarExtend((a, b) => a >= b ? -1 : 0), (a, b) => a & b, this, state, {'zero': -1});
        break;
      }
      case '≠': { // Not Equal ( x y -- ? )
        Op.mergeReduce(Op.scalarExtend((a, b) => a != b ? -1 : 0), (a, b) => a & b, this, state, {'zero': -1});
        break;
      }
      case '≡': { // Same ( x y -- ? )
        // Note: No scalar extension
        Op.mergeReduce((a, b) => a == b ? -1 : 0, (a, b) => a & b, this, state, {'zero': -1});
        break;
      }
      // METAPROGRAMMING //
      case "s": { // Get stack frame
                  // (Numerical argument determines how deep to go; n=0 is current)
        let mod = this.getNumMod(0);
        let frame = state.getFromCallStack(mod);
        state.push(frame);
        break;
      }
      // ARRAYS //
      case "{": { // Sentinel value
        state.push(new SentinelValue("{"));
        break;
      }
      case "}": { // End array (pops until sentinel value is hit)
        let arr = [];
        let value = state.pop();
        while (!(value instanceof SentinelValue) || value.type != "{") {
          arr.push(value);
          value = state.pop();
        }
        state.push(new ArrayLit(arr.reverse()));
        break;
      }
      // CONTROL FLOW //
      case "i": { // If ( ..a ? ( ..a -- ..b ) ( ..a -- ..b ) -- ..b )
        let [c, t, f] = state.pop(3);
        if ((typeof(c) !== 'number') || (c != 0)) {
          tryCall(t, state);
        } else {
          tryCall(f, state);
        }
        break;
      }
      case "$": { // Call ( ..a ( ..a -- ..b ) -- ..b )
        let fn = state.pop();
        tryCall(fn, state);
        break;
      }
      // STACK COMBINATORS //
      case "D": { // Dip ( ..a x ( ..a -- ..b ) -- ..b x )
                  // (Numerical modifier determines arity)
        let mod = this.getNumMod(1);
        let fn = state.pop();
        let preserve = state.pop(mod);
        tryCall(fn, state);
        state.push(...preserve);
        break;
      }
      case "K": { // Keep ( ..a x ( ..a x -- ..b ) -- ..b x )
                  // (Numerical modifier determines arity)
        let mod = this.getNumMod(1);
        let fn = state.pop();
        let preserve = state.peek(mod);
        tryCall(fn, state);
        state.push(...preserve);
        break;
      }
      default: {
        throw new Error.UnknownCommandError(this.token);
        break;
      }
      }
    }
  }

  toString() {
    return this.token.toString() + this.modifiers.join("");
  }

}

export class FunctionLit extends AST {

  constructor(body) {
    super();
    this.body = body;
  }

  eval(state) {
    state.push(this);
  }

  call(state) {
    state.eval(this.body);
  }

  toString() {
    return "[ " + this.body.join(" ") + " ]" + this.modifiers.join("");
  }

}

// Types
// "{" - Array start
export class SentinelValue extends AST {

  constructor(type) {
    super();
    this.type = type;
  }

  toString() {
    return this.type + this.modifiers.join("");
  }

}

export class ArrayLit extends AST {

  constructor(arr) {
    super();
    this.data = arr;
  }

  static filled(n, x) {
    return new ArrayLit(Array(n).fill(x));
  }

  toString() {
    return "{ " + this.data.join(" ") + " }" + this.modifiers.join("");
  }

  get length() {
    return this.data.length;
  }

}

export function tryCall(fn, state) {
  if (fn instanceof AST) {
    state.pushCall(fn);
    let result = fn.call(state);
    state.popCall(fn);
    return result;
  } else {
    throw new Error.CallNonFunction(fn);
  }
}
