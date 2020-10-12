
import { Token } from './token.js';
import { SimpleCmd, FunctionLit } from './ast.js';
import * as Error from './error.js';
import * as Modifier from './modifier.js';

export function tokenize(str) {
  let arr = [];
  let idx = 0;
  let len = str.length;
  while (idx < len) {
    let ch = str.charAt(idx);
    if (/\s/.test(ch)) {
      // Whitespace; skip
      idx += 1;
      continue;
    } else if (/[0-9]/.test(ch)) {
      // Number; parse whole number
      let num = ch;
      idx += 1;
      while ((idx < len) && (/[0-9]/.test(str.charAt(idx)))) {
        num += str.charAt(idx);
        idx += 1;
      }
      arr.push(new Token(parseInt(num, 10)));
    } else if (ch == '«') {
      // Comment; skip until next matching »
      let nested = 1;
      idx += 1;
      while (nested > 0) {
        if (idx >= len)
          throw new Error.UnexpectedEOF();
        let curr = str.charAt(idx);
        if (curr == '«') {
          nested += 1;
        } else if (curr == '»') {
          nested -= 1;
        }
        idx += 1;
      }
    } else {
      // Miscellaneous; single character
      arr.push(new Token(ch));
      idx += 1;
    }
  }
  return arr;
}

class Parser {

  constructor(tokens, index) {
    this.tokens = tokens;
    this.index = index;
  }

  at() {
    if (this.atEnd())
      return undefined;
    else
      return this.tokens[this.index];
  }

  parseTermNoMod() {
    let curr = this.at();
    if (curr === undefined)
      return undefined;
    if (curr.text == '[') {
      this.index += 1;
      let inner = this.parse();
      if (this.at() != ']') {
        if (this.at() === undefined) {
          throw new Error.UnexpectedEOF();
        } else {
          throw new Error.UnexpectedParseError(this.at());
        }
      }
      this.index += 1;
      return new FunctionLit(inner);
    } else if (curr.text == ']') {
      return undefined;
    } else if (curr.text == '`') {
      this.index += 1;
      let inner = this.parseTerm();
      if (inner === undefined) {
        if (this.at() === undefined) {
          throw new Error.UnexpectedEOF();
        } else {
          throw new Error.UnexpectedParseError(this.at());
        }
      }
      return new FunctionLit([inner]);
    } else {
      this.index += 1;
      return new SimpleCmd(curr);
    }
  }

  parseTerm() {
    let result = this.parseTermNoMod();
    if (result === undefined)
      return undefined;
    let mod = this.tryParseMod();
    while (mod !== undefined) {
      result.modifiers.push(mod);
      mod = this.tryParseMod();
    }
    return result;
  }

  tryParseMod() {
    let curr = this.at();
    if (curr === undefined)
      return undefined;
    let num = Modifier.toNumModifier(curr);
    if (num !== undefined) {
      this.index += 1;
      return num;
    }
    return undefined;
  }

  parse() {
    let arr = [];
    while (!this.atEnd()) {
      let next = this.parseTerm();
      if (next === undefined)
        break;
      arr.push(next);
    }
    return arr;
  }

  atEnd() {
    return this.index >= this.tokens.length;
  }

}

export function parse(tokens) {
  let parser = new Parser(tokens, 0);
  let arr = parser.parse();
  return arr;
}
