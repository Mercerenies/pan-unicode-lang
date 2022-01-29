
import Str from './str.js';

export class Token {
  text: Str | number;
  isString: boolean;

  constructor(text: string | Str | number, isString?: boolean) {
    if (typeof text === 'string') {
      text = Str.fromString(text);
    }
    this.text = text;
    this.isString = isString || false;
  }

  tokenType(): TokenType {
    if (this.isString) {
      return TokenType.String;
    } else if (typeof this.text === 'number') {
      return TokenType.Number;
    } else {
      return TokenType.Command;
    }
  }

  toString(): string {
    if (this.isString) {
      let text = this.text;
      if (typeof text === 'number') {
        text = Str.fromString("" + text);
      }
      return escapeString(text);
    } else {
      return this.text.toString();
    }
  }

}

export enum TokenType {
  Number = "TokenType.Number",
  String = "TokenType.String",
  Command = "TokenType.Command",
}

export function escapeString(s: Str | string): string {
  if (s instanceof Str) {
    s = s.toString();
  }
  let contents = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    switch (ch) {
    case '"':
      contents += '\\"';
      break;
    case '\n':
      contents += '\\n';
      break;
    default:
      contents += ch;
      break;
    }
  }
  return `"${contents}"`;
}

export function translateEscape(ch: string): string {
  switch (ch) {
  case 'n':
    return '\n';
  default:
    return ch;
  }
}
