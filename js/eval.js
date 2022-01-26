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
            arg.forEach((x) => this.eval(x));
        }
        else {
            arg.eval(this);
        }
    }
    push(...vs) {
        for (const v of vs) {
            this.stack.push(wrapPrimitive(v));
        }
    }
    pop(n) {
        if (n != null) {
            const arr = [];
            for (let i = 0; i < n; i++) {
                arr.push(this.pop());
            }
            arr.reverse();
            return arr;
        }
        else {
            const value = this.stack.pop();
            if (value == null) {
                throw new Error.StackUnderflowError();
            }
            else {
                return value;
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
        this.callStack.push(v);
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
        console.log(value.toString());
    }
    getGlobal(k) {
        var _a;
        return (_a = this.globalVars[k]) !== null && _a !== void 0 ? _a : new AST.SentinelValue("ε");
    }
    setGlobal(k, v) {
        this.globalVars[k] = v;
    }
    stackToString() {
        return this.stack.join(" ");
    }
    saveStack() {
        return this.stack.slice();
    }
    loadStack(savedStack) {
        this.stack = savedStack;
    }
}
;
function wrapPrimitive(v) {
    if (typeof v === 'number') {
        return new AST.NumberLit(v);
    }
    else if (typeof v === 'string') {
        return new AST.StringLit(Str.fromString(v));
    }
    else if (v instanceof Str) {
        return new AST.StringLit(v);
    }
    else {
        return v;
    }
}
