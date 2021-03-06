// Generated by CoffeeScript 2.5.1
var Str, isHighSurrogate, isLowSurrogate;

import {
  StrEncodingError
} from './error.js';

// I want random access to individual "characters" in a string without
// worrying about UTF-16 encoding issues. This class takes a string and
// converts it to an array of individual characters, so we can get that
// behavior.
export default Str = class Str {
  constructor(data1) {
    this.data = data1;
  }

  static fromString(text) {
    var data, i;
    data = [];
    i = 0;
    while (i < text.length) {
      if (isHighSurrogate(text[i].charCodeAt(0))) {
        // High surrogate
        i += 1;
        if (i >= text.length || !isLowSurrogate(text[i].charCodeAt(0))) {
          throw new StrEncodingError(text);
        }
        data.push(text.slice(i - 1, i + 1));
      } else {
        data.push(text[i]);
      }
      i += 1;
    }
    return new Str(data);
  }

  toString() {
    return this.data.join('');
  }

  charAt(n) {
    return this.data[n];
  }

  codePointAt(n) {
    return this.data[n].codePointAt(0);
  }

  concat(that) {
    return new Str(this.data.concat(that.data));
  }

  static fromCodePoint(codepoint) {
    return new Str(String.fromCodePoint(codepoint));
  }

};

Object.defineProperty(Str.prototype, 'length', {
  get: function() {
    return this.data.length;
  }
});

isHighSurrogate = function(n) {
  return (n & 0xFC00) === 0xD800;
};

isLowSurrogate = function(n) {
  return (n & 0xFC00) === 0xDC00;
};

//# sourceMappingURL=str.js.map
