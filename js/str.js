import { StrEncodingError } from './error.js';
// I want random access to individual "characters" in a string without
// worrying about UTF-16 encoding issues. This class takes a string
// and converts it to an array of individual characters, so we can get
// that behavior.
export default class Str {
    constructor(data) {
        this.data = data;
    }
    static fromString(text) {
        const data = [];
        let i = 0;
        while (i < text.length) {
            if (isHighSurrogate(text[i].charCodeAt(0))) {
                // High surrogate
                i += 1;
                if (i >= text.length || !isLowSurrogate(text[i].charCodeAt(0))) {
                    throw new StrEncodingError(text);
                }
                data.push(text.slice(i - 1, i + 1));
            }
            else {
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
        var _a;
        return (_a = this.data[n].codePointAt(0)) !== null && _a !== void 0 ? _a : 0;
    }
    codePoints() {
        return this.data.map((x) => { var _a; return (_a = x.codePointAt(0)) !== null && _a !== void 0 ? _a : 0; });
    }
    concat(that) {
        return new Str(this.data.concat(that.data));
    }
    static fromCodePoint(codepoint) {
        return Str.fromString(String.fromCodePoint(codepoint));
    }
    get length() {
        return this.data.length;
    }
    reversed() {
        return new Str(this.data.slice().reverse());
    }
    isEmpty() {
        return this.data.length == 0;
    }
}
function isHighSurrogate(n) {
    return (n & 0xFC00) === 0xD800;
}
function isLowSurrogate(n) {
    return (n & 0xFC00) === 0xDC00;
}
