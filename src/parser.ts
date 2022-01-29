
import { Token, TokenType, translateEscape } from './token.js';
import { AST, SimpleCmd, FunctionLit, AssignToVar, ReadFromVar } from './ast.js';
import * as Error from './error.js';
import * as Modifier from './modifier.js';
import Str from './str.js';

export function tokenize(str: Str | string): Token[] {
  if (typeof str === 'string') {
    str = Str.fromString(str);
  }
  const arr: Token[] = [];
  let idx = 0;
  const len = str.length;
  while (idx < len) {
    const ch = str.charAt(idx);
    if (/\s/.test(ch)) {
      // Whitespace; skip
      idx += 1;
    } else if (ch === "👿") {
      arr.push(new Token(0/0));
      idx += 1;
    } else if (ch === "∞" || (ch === "-" && idx < len - 1 && str.charAt(idx + 1) === "∞")) {
      if (ch === "∞") {
        arr.push(new Token(2e308));
        idx += 1;
      } else {
        arr.push(new Token(-2e308));
        idx += 2;
      }
    } else if (/[0-9]/.test(ch) || (ch === "-" && idx < len - 1 && /[0-9]/.test(str.charAt(idx + 1)))) {
      // Number; parse whole number
      let num = ch;
      idx += 1;
      while (idx < len && /[0-9]/.test(str.charAt(idx))) {
        num += str.charAt(idx);
        idx += 1;
      }
      arr.push(new Token(parseInt(num, 10)));
    } else if (ch === '"') {
      // String literal; parse whole string
      idx += 1;
      let result = "";
      while (idx < len && str.charAt(idx) !== '"') {
        if (str.charAt(idx) === '\\') {
          idx += 1;
          if (idx >= len) {
            break;
          }
          result += translateEscape(str.charAt(idx));
        } else {
          result += str.charAt(idx);
        }
        idx += 1;
      }
      if (!(idx < len && str.charAt(idx) === '"')) {
        throw new Error.UnexpectedEOF();
      }
      arr.push(new Token(result, true));
      idx += 1;
    } else if (ch === '«') {
      // Comment; skip until next matching »
      let nested = 1;
      idx += 1;
      while (nested > 0) {
        if (idx >= len) {
          throw new Error.UnexpectedEOF();
        }
        const curr = str.charAt(idx);
        if (curr === '«') {
          nested += 1;
        } else if (curr === '»') {
          nested -= 1;
        }
        idx += 1;
      }
    } else {
      // Miscellaneous; push single character
      arr.push(new Token(ch));
      idx += 1;
    }
  }
  return arr;
}

class Parser {
  private tokens: Token[];
  private index: number;

  constructor(tokens: Token[], index: number) {
    this.tokens = tokens;
    this.index = index;
  }

  at(): Token | undefined {
    return this.tokens[this.index];
  }

  parseTermNoMod(): AST | undefined {
    const curr = this.at();
    if (curr == null) {
      return undefined;
    }
    if (curr.isString) {
      this.index += 1;
      return new SimpleCmd(curr);
    }
    switch (curr.text.toString()) {
    case '[': {
      this.index += 1;
      const inner = this.parse();
      const next = this.at();
      if ((next == null) || next.text.toString() !== ']') {
        if (next != null) {
          throw new Error.UnexpectedParseError(next);
        } else {
          throw new Error.UnexpectedEOF();
        }
      }
      this.index += 1;
      return new FunctionLit(inner);
    }
    case ']':
      return undefined;
    case '`': {
      this.index += 1;
      const inner = this.parseTerm();
      if (inner == null) {
        const next = this.at();
        if (next != null) {
          throw new Error.UnexpectedParseError(next);
        } else {
          throw new Error.UnexpectedEOF();
        }
      }
      return new FunctionLit([inner]);
    }
    case '→': {
      this.index += 1;
      const inner = this.at();
      if ((inner != null) && (inner.tokenType() === TokenType.Command)) {
        this.index += 1;
        return new AssignToVar(inner);
      } else if (inner != null) {
        throw new Error.UnexpectedParseError(inner);
      } else {
        throw new Error.UnexpectedEOF();
      }
      break;
    }
    case '←': {
      this.index += 1;
      const inner = this.at();
      if ((inner != null) && (inner.tokenType() === TokenType.Command)) {
        this.index += 1;
        return new ReadFromVar(inner);
      } else if (inner != null) {
        throw new Error.UnexpectedParseError(inner);
      } else {
        throw new Error.UnexpectedEOF();
      }
      break;
    }
    default:
      this.index += 1;
      return new SimpleCmd(curr);
    }
  }

  parseTerm(): AST | undefined {
    const result = this.parseTermNoMod();
    if (result == null) {
      return void 0;
    }
    let mod = this.tryParseMod();
    while (mod != null) {
      result.modifiers.push(mod);
      mod = this.tryParseMod();
    }
    return result;
  }

  tryParseMod(): Modifier.Modifier | undefined {
    const curr = this.at();
    if (curr == null) {
      return undefined;
    }
    const num = Modifier.toNumModifier(curr);
    if (num != null) {
      this.index += 1;
      return num;
    } else if (curr.text.toString() === "′") {
      this.index += 1;
      return new Modifier.PrimeModifier();
    } else {
      return undefined;
    }
  }

  parse(): AST[] {
    const arr: AST[] = [];
    while (!this.atEnd()) {
      const next = this.parseTerm();
      if (next == null) {
        break;
      }
      arr.push(next);
    }
    return arr;
  }

  atEnd(): boolean {
    return this.index >= this.tokens.length;
  }

}

export function parse(tokens: Token[]): AST[] {
  const parser = new Parser(tokens, 0);
  const result = parser.parse();
  if (!parser.atEnd()) {
    throw new Error.UnexpectedParseError(parser.at()!);
  }
  return result;
}

