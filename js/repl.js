import { Evaluator } from './eval.js';
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
}
