
import * as Error from './error.js';
import { stringify } from './pretty.js';
import * as Modifier from './modifier.js';

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

  eval(state) {
    if (this.isNumberLit()) {
      state.push(this.token.text);
    } else {
      switch (this.token.text) {
      case '.': { // Pretty print ( x -- )
        state.print(stringify(state.pop()));
        break;
      }
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
      // ARITHMETIC //
      case '+': { // Add ( x y -- z )
        let [x, y] = state.pop(2);
        state.push(x + y);
        break;
      }
      case '-': { // Subtract ( x y -- z )
        let [x, y] = state.pop(2);
        state.push(x - y);
        break;
      }
      case '×': { // Multiply ( x y -- z )
        let [x, y] = state.pop(2);
        state.push(x * y);
        break;
      }
      case '÷': { // Divide ( x y -- z )
        let [x, y] = state.pop(2);
        state.push(x / y);
        break;
      }
      case '_': { // Negate ( x -- y )
        state.push(- state.pop());
        break;
      }
      // COMPARISONS //
      // TODO For now, comparison is really just designed for numbers. Generalize.
      case '=': { // Equal ( x y -- ? )
        let [x, y] = state.pop(2);
        state.push((x == y) ? -1 : 0);
        break;
      }
      case '<': { // LT ( x y -- ? )
        let [x, y] = state.pop(2);
        state.push((x < y) ? -1 : 0);
        break;
      }
      case '>': { // GT ( x y -- ? )
        let [x, y] = state.pop(2);
        state.push((x > y) ? -1 : 0);
        break;
      }
      case '≤': { // LE ( x y -- ? )
        let [x, y] = state.pop(2);
        state.push((x <= y) ? -1 : 0);
        break;
      }
      case '≥': { // GE ( x y -- ? )
        let [x, y] = state.pop(2);
        state.push((x >= y) ? -1 : 0);
        break;
      }
      case '≠': { // Not Equal ( x y -- ? )
        let [x, y] = state.pop(2);
        state.push((x != y) ? -1 : 0);
        break;
      }
      // //
      case "s": { // Get stack frame
                  // (Numerical argument determines how deep to go; n=0 is current)
        let mod = this.getNumMod(0);
        let frame = state.getFromCallStack(mod);
        state.push(frame);
        break;
      }
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

  toString() {
    return "{ " + this.data.join(" ") + " }" + this.modifiers.join("");
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
