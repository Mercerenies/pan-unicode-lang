
import {
  Token,
  TokenType,
  translateEscape
} from './token.js';

import {
  SimpleCmd,
  FunctionLit,
  AssignToVar,
  ReadFromVar
} from './ast.js';

import * as Error from './error.js';

import * as Modifier from './modifier.js';

import Str from './str.js';

// Takes an Str
export var tokenize = function(str) {
  var arr, ch, curr, idx, len, nested, num, result;
  if (typeof str === 'string') {
    str = Str.fromString(str);
  }
  arr = [];
  idx = 0;
  len = str.length;
  while (idx < len) {
    ch = str.charAt(idx);
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
      num = ch;
      idx += 1;
      while (idx < len && /[0-9]/.test(str.charAt(idx))) {
        num += str.charAt(idx);
        idx += 1;
      }
      arr.push(new Token(parseInt(num, 10)));
    } else if (ch === '"') {
      // String literal; parse whole string
      idx += 1;
      result = "";
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
      nested = 1;
      idx += 1;
      while (nested > 0) {
        if (idx >= len) {
          throw new Error.UnexpectedEOF();
        }
        curr = str.charAt(idx);
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
};

class Parser {
  private tokens: Token[];
  private index: number;

  constructor(tokens, index) {
    this.tokens = tokens;
    this.index = index;
  }

  at() {
    if (this.atEnd()) {
      return void 0;
    } else {
      return this.tokens[this.index];
    }
  }

  parseTermNoMod() {
    var curr, inner;
    curr = this.at();
    if (curr == null) {
      return void 0;
    }
    if (curr.isString) {
      this.index += 1;
      return new SimpleCmd(curr);
    }
    switch (curr.text.toString()) {
      case '[':
        this.index += 1;
        inner = this.parse();
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
      case ']':
        return void 0;
      case '`':
        this.index += 1;
        inner = this.parseTerm();
        if (inner == null) {
          const next = this.at();
          if (next != null) {
            throw new Error.UnexpectedParseError(next);
          } else {
            throw new Error.UnexpectedEOF();
          }
        }
        return new FunctionLit([inner]);
      case '→':
        this.index += 1;
        inner = this.at();
        if ((inner != null ? inner.tokenType() : void 0) === TokenType.Command) {
          this.index += 1;
          return new AssignToVar(inner);
        } else if (this.at() != null) {
          throw new Error.UnexpectedParseError(this.at());
        } else {
          throw new Error.UnexpectedEOF();
        }
        break;
      case '←':
        this.index += 1;
        inner = this.at();
        if ((inner != null ? inner.tokenType() : void 0) === TokenType.Command) {
          this.index += 1;
          return new ReadFromVar(inner);
        } else if (this.at() != null) {
          throw new Error.UnexpectedParseError(this.at());
        } else {
          throw new Error.UnexpectedEOF();
        }
        break;
      default:
        this.index += 1;
        return new SimpleCmd(curr);
    }
  }

  parseTerm() {
    var mod, result;
    result = this.parseTermNoMod();
    if (result == null) {
      return void 0;
    }
    mod = this.tryParseMod();
    while (mod != null) {
      result.modifiers.push(mod);
      mod = this.tryParseMod();
    }
    return result;
  }

  tryParseMod() {
    var curr, num;
    curr = this.at();
    if (curr == null) {
      return void 0;
    }
    num = Modifier.toNumModifier(curr);
    if (num != null) {
      this.index += 1;
      return num;
    } else if (curr.text.toString() === "′") {
      this.index += 1;
      return new Modifier.PrimeModifier();
    } else {
      return void 0;
    }
  }

  parse() {
    var arr, next;
    arr = [];
    while (!this.atEnd()) {
      next = this.parseTerm();
      if (next == null) {
        break;
      }
      arr.push(next);
    }
    return arr;
  }

  atEnd() {
    return this.index >= this.tokens.length;
  }

};

export var parse = function(tokens) {
  var parser, result;
  parser = new Parser(tokens, 0);
  result = parser.parse();
  if (!parser.atEnd()) {
    throw new Error.UnexpectedParseError(parser.at());
  }
  return result;
};

//# sourceMappingURL=parser.js.map
