
import { tokenize, parse } from './parser.js';
import { Evaluator } from './eval.js';
import { Error } from './error.js';
import { FunctionLit, AST } from './ast.js';
import { InputManager } from './unicode_input.js';
import Str from './str.js';
import { StreamReader } from './stream_reader.js';


export class REPLEvaluator extends Evaluator {
  private reader: StreamReader;
  private lookaheadBuffer: string | null;

  constructor() {
    super();
    this.reader = new StreamReader();
    this.lookaheadBuffer = null;
  }

  print(value: AST | string): void {
    console.log(value);
  }

  readInput(): Promise<string | undefined> {
    if (this.lookaheadBuffer != null) {
      const value = this.lookaheadBuffer;
      this.lookaheadBuffer = null;
      return Promise.resolve(value);
    } else {
      return this.reader.readChar().then((x) => x ?? undefined);
    }
  }

  async peekInput(): Promise<string | undefined> {
    if (this.lookaheadBuffer === null) {
      this.lookaheadBuffer = await this.reader.readChar();
    }
    return this.lookaheadBuffer ?? undefined;
  }

}

export async function main() {
  const evaluator = new REPLEvaluator();
  
}
