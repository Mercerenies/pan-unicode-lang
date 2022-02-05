
import { tokenize, parse } from './parser.js';
import { Evaluator } from './eval.js';
import { BaseError } from './error.js';
import { FunctionLit, AST } from './ast.js';
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
    } catch (e) {
      if (e instanceof BaseError) {
        console.log(`ERROR ${e.id()}! ${e.toString()}`);
      } else {
        throw e;
      }
    }
  }
}

void main();
