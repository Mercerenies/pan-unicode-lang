
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
      case "$": { // Call ( ..a ( ..a -- ..b ) -- ..b )
        let fn = state.pop();
        fn.call(state);
        break;
      }
      case "D": { // Dip ( ..a x ( ..a -- ..b ) -- ..b x )
                  // (Numerical modifier determines arity)
        let mod = this.getNumMod(1);
        let fn = state.pop();
        let preserve = state.pop(mod);
        fn.call(state);
        state.push(...preserve);
        break;
      }
      case "K": { // Keep ( ..a x ( ..a x -- ..b ) -- ..b x )
                  // (Numerical modifier determines arity)
        let mod = this.getNumMod(1);
        let fn = state.pop();
        let preserve = state.peek(mod);
        fn.call(state);
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
    return this.token.toString();
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
    return "[ " + this.body.join(" ") + " ]";
  }

}
