
import * as AST from './ast.js';
import * as Error from './error.js';

export class Evaluator {

  constructor() {
    this.stack = [];
  }

  eval(arg) {
    if (Array.isArray(arg)) {
      for (const elem of arg) {
        this.eval(elem);
      }
    } else if (arg instanceof AST.AST) {
      arg.eval(this);
    }
  }

  push(...vs) {
    this.stack.push(...vs);
  }

  pop(n) {
    if (n === undefined) {
      if (this.stack.length <= 0) {
        throw new Error.StackUnderflowError();
      } else {
        return this.stack.pop();
      }
    } else {
      let arr = [];
      for (let i = 0; i < n; i++) {
        arr.push(this.pop());
      }
      arr.reverse();
      return arr;
    }
  }

  peek(n) {
    if (n === undefined) {
      if (this.stack.length <= 0) {
        throw new Error.StackUnderflowError();
      } else {
        return this.stack[this.stack.length - 1];
      }
    } else {
      if (this.stack.length < n) {
        throw new Error.StackUnderflowError();
      } else {
        return this.stack.slice(- n);
      }
    }
  }

  print(value) {
    // Default behavior is to simply print to console. Interactive
    // editor will override this.
    console.log(value.toString());
  }

  stackToString() {
    return this.stack.join(" ");
  }

}
