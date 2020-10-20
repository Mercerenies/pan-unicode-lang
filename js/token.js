// Generated by CoffeeScript 2.5.1
import Str from './str.js';

export var Token = class Token {
  constructor(text, isString) {
    this.text = text;
    if (typeof this.text === 'string') {
      this.text = Str.fromString(this.text);
    }
    // Normalize to Boolean
    this.isString = !!isString;
  }

  tokenType() {
    switch (false) {
      case !this.isString:
        return TokenType.String;
      case typeof this.text !== 'number':
        return TokenType.Number;
      default:
        return TokenType.Command;
    }
  }

  toString() {
    if (this.isString) {
      return escapeString(this.text);
    } else {
      return this.text.toString();
    }
  }

};

export var TokenType = {
  Number: "TokenType.Number",
  String: "TokenType.String",
  Command: "TokenType.Command"
};

export var escapeString = function(s) {
  var ch, contents, i, len;
  s = s.toString();
  contents = "";
  for (i = 0, len = s.length; i < len; i++) {
    ch = s[i];
    contents += (function() {
      switch (ch) {
        case '"':
          return '\\"';
        case '\n':
          return '\\n';
        default:
          return ch;
      }
    })();
  }
  return `\"${contents}\"`;
};

export var translateEscape = function(ch) {
  switch (ch) {
    case 'n':
      return '\n';
    default:
      return ch;
  }
};

//# sourceMappingURL=token.js.map