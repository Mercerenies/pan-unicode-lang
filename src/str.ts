
import { StrEncodingError } from './error.js';

// I want random access to individual "characters" in a string without
// worrying about UTF-16 encoding issues. This class takes a string
// and converts it to an array of individual characters, so we can get
// that behavior.
export default class Str {
  private readonly data: string[];

  constructor(data: string[]) {
    this.data = data;
  }

  static fromString(text: string): Str {
    const data: string[] = [];
    let i = 0;
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

  toString(): string {
    return this.data.join('');
  }

  charAt(n: number): string {
    return this.data[n];
  }

  codePointAt(n: number): number {
    return this.data[n].codePointAt(0)!;
  }

  codePoints(): number[] {
    return this.data.map((x) => x.codePointAt(0)!);
  }

  concat(that: Str): Str {
    return new Str(this.data.concat(that.data));
  }

  static fromCodePoint(codepoint: number): Str {
    return Str.fromString(String.fromCodePoint(codepoint));
  }

  get length(): number {
    return this.data.length;
  }

  reversed(): Str {
    return new Str(this.data.slice().reverse());
  }

};

function isHighSurrogate(n: number): boolean {
  return (n & 0xFC00) === 0xD800;
};

function isLowSurrogate(n: number): boolean {
  return (n & 0xFC00) === 0xDC00;
};
