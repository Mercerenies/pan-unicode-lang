import { tokenize, parse } from './parser.js';
import { Evaluator } from './eval.js';
import { Error } from './error.js';
import { FunctionLit } from './ast.js';
import { InputManager } from './unicode_input.js';
import Str from './str.js';
// Main entrypoint for the online interactive interpreter.
const DEBUG_MODE = false;
export class InteractiveEvaluator extends Evaluator {
    constructor() {
        super();
        const inputField = document.querySelector("#input");
        if ((inputField == null) || (!(inputField instanceof HTMLTextAreaElement))) {
            throw "Could not find input field";
        }
        this.input = Str.fromString(inputField.value);
        this.inputPos = 0;
    }
    print(value) {
        const outputField = document.querySelector("#output");
        if ((outputField == null) || (!(outputField instanceof HTMLElement))) {
            throw "Could not find output field";
        }
        outputField.innerText += value.toString() + "\n";
    }
    readInput() {
        var result;
        if (this.inputPos >= this.input.length) {
            return undefined;
        }
        else {
            result = this.input.charAt(this.inputPos);
            this.inputPos += 1;
            return result;
        }
    }
    peekInput() {
        if (this.inputPos >= this.input.length) {
            return undefined;
        }
        else {
            return this.input.charAt(this.inputPos);
        }
    }
}
export function run() {
    const codeField = document.querySelector("#code");
    const outputField = document.querySelector("#output");
    const stackField = document.querySelector("#stack");
    if ((codeField == null) || (!(codeField instanceof HTMLTextAreaElement))) {
        throw "Could not find code field";
    }
    if ((outputField == null) || (!(outputField instanceof HTMLElement))) {
        throw "Could not find code field";
    }
    if ((stackField == null) || (!(stackField instanceof HTMLElement))) {
        throw "Could not find stack field";
    }
    const text = codeField.value;
    const evaluator = new InteractiveEvaluator();
    try {
        outputField.innerText = "";
        stackField.innerText = "";
        const tokens = tokenize(text);
        const parsed = parse(tokens);
        evaluator.pushCall(new FunctionLit(parsed));
        evaluator.eval(parsed);
        evaluator.popCall();
    }
    catch (e) {
        if (e instanceof Error && !DEBUG_MODE) {
            outputField.innerText += "\n\n" + e.toString() + "\n";
        }
        else {
            throw e;
        }
    }
    stackField.innerText = evaluator.stackToString();
}
export function initInputMgr() {
    const inputManager = new InputManager();
    inputManager.register(document.querySelector("#code"));
}
