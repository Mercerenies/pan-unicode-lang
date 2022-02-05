
import * as AST from './ast.js';
import * as Error from './error.js';
import Str from './str.js';

export abstract class Evaluator {
  private stack: AST.AST[];
  private callStack: AST.AST[];
  private globalVars: { [key: string]: AST.AST };

  constructor() {
    this.stack = [];
    this.callStack = [];
    this.globalVars = {};
  }

  async eval(arg: AST.AST | AST.AST[]): Promise<void> {
    if (Array.isArray(arg)) {
      for (const x of arg) {
        await this.eval(x);
      }
    } else {
      await arg.eval(this);
    }
  }

  push(...vs: (AST.AST | number | string | Str)[]): void {
    for (const v of vs) {
      this.stack.push(wrapPrimitive(v));
    }
  }

  pop(n: number): AST.AST[];
  pop(): AST.AST;
  pop(n?: number): AST.AST | AST.AST[] {
    if (n != null) {
      const arr: AST.AST[] = [];
      for (let i = 0; i < n; i++) {
        arr.push(this.pop());
      }
      arr.reverse();
      return arr;
    } else {
      const value = this.stack.pop();
      if (value == null) {
        throw new Error.StackUnderflowError();
      } else {
        return value;
      }
    }
  }

  peek(n: number): AST.AST[];
  peek(): AST.AST;
  peek(n?: number): AST.AST | AST.AST[] {
    if (n != null) {
      if (this.stack.length < n) {
        throw new Error.StackUnderflowError();
      } else {
        return this.stack.slice(-n);
      }
    } else {
      if (this.stack.length <= 0) {
        throw new Error.StackUnderflowError();
      } else {
        return this.stack[this.stack.length - 1];
      }
    }
  }

  pushCall(v: AST.AST): void {
    this.callStack.push(v);
  }

  popCall(): AST.AST | undefined {
    return this.callStack.pop();
  }

  // n=0 gets the current stack frame. Higher arguments get deeper in
  // the call stack.
  getFromCallStack(n: number): AST.AST {
    if (n >= this.callStack.length) {
      throw new Error.CallStackUnderflowError();
    } else {
      return this.callStack[this.callStack.length - (n + 1)];
    }
  }

  print(value: AST.AST | string): void {
    // Default behavior is to simply print to console. Interactive
    // editor will override this.
    console.log(value.toString());
  }


  // Read one character from input. Returns undefined if input is
  // empty.
  abstract readInput(): Promise<string | undefined>;

  // Read one character from input but don't consume.
  abstract peekInput(): Promise<string | undefined>;

  async readLine(): Promise<Str | undefined> {
    const result: string[] = [];
    while (true) {
      const curr = await this.readInput();
      if (curr === undefined) {
        break;
      }
      result.push(curr);
      if (curr === '\n') {
        break;
      }
    }
    if (result) {
      return new Str(result);
    } else {
      return undefined;
    }
  }

  getGlobal(k: string): AST.AST {
    return this.globalVars[k] ?? AST.SentinelValue.null;
  }

  setGlobal(k: string, v: AST.AST): void {
    this.globalVars[k] = v;
  }

  stackToString(): string {
    return this.stack.join(" ");
  }

  saveStack(): SavedStack {
    return this.stack.slice() as SavedStack;
  }

  loadStack(savedStack: SavedStack): void {
    this.stack = savedStack;
  }

}


export type SavedStack = AST.AST[] & { readonly __tag: unique symbol };


function wrapPrimitive(v: AST.AST | number | string | Str): AST.AST {
  if (typeof v === 'number') {
    return new AST.NumberLit(v);
  } else if (typeof v === 'string') {
    return new AST.StringLit(Str.fromString(v));
  } else if (v instanceof Str) {
    return new AST.StringLit(v);
  } else {
    return v;
  }
}
