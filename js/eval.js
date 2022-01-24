import * as AST from './ast.js';
import * as Error from './error.js';
import Str from './str.js';
export class Evaluator {
    constructor() {
        this.stack = [];
        this.callStack = [];
        this.globalVars = {};
    }
    eval(arg) {
        var elem, results;
        if (Array.isArray(arg)) {
            results = [];
            for (elem of arg) {
                results.push(this.eval(elem));
            }
            return results;
        }
        else if (arg instanceof AST.AST) {
            return arg.eval(this);
        }
        else {
            throw `Error: Attempt to eval ${arg}, which is invalid!`;
        }
    }
    push(...vs) {
        var j, len, results, v;
        results = [];
        for (j = 0, len = vs.length; j < len; j++) {
            v = vs[j];
            // Wrap any primitives
            v = (function () {
                switch (false) {
                    case typeof v !== 'number':
                        return new AST.NumberLit(v);
                    case !(typeof v === 'string' || v instanceof Str):
                        return new AST.StringLit(v);
                    default:
                        return v;
                }
            })();
            results.push(this.stack.push(v));
        }
        return results;
    }
    pop(n) {
        var arr, i;
        if (n != null) {
            arr = (() => {
                var j, ref, results;
                results = [];
                for (i = j = 0, ref = n - 1; j <= ref; i = j += 1) {
                    results.push(this.pop());
                }
                return results;
            })();
            arr.reverse();
            return arr;
        }
        else {
            if (this.stack.length <= 0) {
                throw new Error.StackUnderflowError();
            }
            else {
                return this.stack.pop();
            }
        }
    }
    peek(n) {
        if (n != null) {
            if (this.stack.length < n) {
                throw new Error.StackUnderflowError();
            }
            else {
                return this.stack.slice(-n);
            }
        }
        else {
            if (this.stack.length <= 0) {
                throw new Error.StackUnderflowError();
            }
            else {
                return this.stack[this.stack.length - 1];
            }
        }
    }
    pushCall(v) {
        return this.callStack.push(v);
    }
    popCall() {
        return this.callStack.pop();
    }
    // n=0 gets the current stack frame. Higher arguments get deeper in
    // the call stack.
    getFromCallStack(n) {
        if (n >= this.callStack.length) {
            throw new Error.CallStackUnderflowError();
        }
        else {
            return this.callStack[this.callStack.length - (n + 1)];
        }
    }
    print(value) {
        // Default behavior is to simply print to console. Interactive
        // editor will override this.
        return console.log(value.toString());
    }
    getGlobal(k) {
        var ref;
        return (ref = this.globalVars[k]) != null ? ref : new AST.SentinelValue("ε");
    }
    setGlobal(k, v) {
        return this.globalVars[k] = v;
    }
    stackToString() {
        return this.stack.join(" ");
    }
    saveStack() {
        return new SavedStack(this.stack.slice());
    }
    loadStack(savedStack) {
        return this.stack = savedStack.stack;
    }
}
;
// Wrapper around the value stack at a given point. Can only be passed
// to/from Evaluator. The constructor should be treated as private and
// local to this module.
export class SavedStack {
    constructor(stack) {
        this.stack = stack;
    }
}
;
