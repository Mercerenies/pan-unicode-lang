import Str from './str.js';
export class Token {
    constructor(text, isString) {
        if (typeof text === 'string') {
            text = Str.fromString(text);
        }
        this.text = text;
        this.isString = isString || false;
    }
    tokenType() {
        if (this.isString) {
            return TokenType.String;
        }
        else if (typeof this.text === 'number') {
            return TokenType.Number;
        }
        else {
            return TokenType.Command;
        }
    }
    toString() {
        if (this.isString) {
            let text = this.text;
            if (typeof text === 'number') {
                text = Str.fromString("" + text);
            }
            return escapeString(text);
        }
        else {
            return this.text.toString();
        }
    }
}
export var TokenType;
(function (TokenType) {
    TokenType["Number"] = "TokenType.Number";
    TokenType["String"] = "TokenType.String";
    TokenType["Command"] = "TokenType.Command";
})(TokenType || (TokenType = {}));
export function escapeString(s) {
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
export function translateEscape(ch) {
    switch (ch) {
        case 'n':
            return '\n';
        default:
            return ch;
    }
}
