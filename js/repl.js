import { tokenize, parse } from './parser.js';
import { Evaluator } from './eval.js';
import { Error } from './error.js';
import { FunctionLit } from './ast.js';
import { StreamReader } from './stream_reader.js';
export class REPLEvaluator extends Evaluator {
    constructor() {
        super();
        this.reader = new StreamReader();
        this.lookaheadBuffer = null;
    }
    print(value) {
        console.log(value);
    }
    readInput() {
        if (this.lookaheadBuffer != null) {
            const value = this.lookaheadBuffer;
            this.lookaheadBuffer = null;
            return Promise.resolve(value);
        }
        else {
            return this.reader.readChar().then((x) => x !== null && x !== void 0 ? x : undefined);
        }
    }
    async peekInput() {
        var _a;
        if (this.lookaheadBuffer === null) {
            this.lookaheadBuffer = await this.reader.readChar();
        }
        return (_a = this.lookaheadBuffer) !== null && _a !== void 0 ? _a : undefined;
    }
}
export async function main() {
    const evaluator = new REPLEvaluator();
    while (true) {
        try {
            const line = await evaluator.readLine();
            if (line === undefined) {
                break;
            }
            const tokens = tokenize(line);
            const parsed = parse(tokens);
            evaluator.pushCall(new FunctionLit(parsed));
            await evaluator.eval(parsed);
            evaluator.popCall();
        }
        catch (e) {
            if (e instanceof Error) {
                console.log(`ERROR ${e.id()}! ${e.toString()}`);
            }
            else {
                throw e;
            }
        }
    }
}
void main();
