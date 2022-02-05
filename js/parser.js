import { Token, TokenType, translateEscape } from './token.js';
import { SymbolLit, FunctionLit, StringLit, NumberLit, AssignToVar, ReadFromVar } from './ast.js';
import * as Error from './error.js';
import * as Modifier from './modifier.js';
import Str from './str.js';
export function tokenize(str) {
    if (typeof str === 'string') {
        str = Str.fromString(str);
    }
    const arr = [];
    let idx = 0;
    const len = str.length;
    while (idx < len) {
        const ch = str.charAt(idx);
        if (/\s/.test(ch)) {
            // Whitespace; skip
            idx += 1;
        }
        else if (ch === "👿") {
            arr.push(new Token(NaN));
            idx += 1;
        }
        else if (ch === "∞" || (ch === "-" && idx < len - 1 && str.charAt(idx + 1) === "∞")) {
            if (ch === "∞") {
                arr.push(new Token(Infinity));
                idx += 1;
            }
            else {
                arr.push(new Token(-Infinity));
                idx += 2;
            }
        }
        else if (/[0-9]/.test(ch) || (ch === "-" && idx < len - 1 && /[0-9]/.test(str.charAt(idx + 1)))) {
            // Number; parse whole number
            let num = ch;
            idx += 1;
            while (idx < len && /[0-9]/.test(str.charAt(idx))) {
                num += str.charAt(idx);
                idx += 1;
            }
            arr.push(new Token(parseInt(num, 10)));
        }
        else if (ch === '"') {
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
                }
                else {
                    result += str.charAt(idx);
                }
                idx += 1;
            }
            if (!(idx < len && str.charAt(idx) === '"')) {
                throw new Error.UnexpectedEOF();
            }
            arr.push(new Token(result, true));
            idx += 1;
        }
        else if (ch === '«') {
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
                }
                else if (curr === '»') {
                    nested -= 1;
                }
                idx += 1;
            }
        }
        else {
            // Miscellaneous; push single character
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
        return this.tokens[this.index];
    }
    parseTerm() {
        const curr = this.at();
        if (curr == null) {
            return undefined;
        }
        if ((curr.text instanceof Str) && (curr.isString)) {
            this.index += 1;
            return new StringLit(curr.text);
        }
        if (typeof curr.text === 'number') {
            this.index += 1;
            return new NumberLit(curr.text);
        }
        switch (curr.text.toString()) {
            case '[': {
                this.index += 1;
                const inner = this.parse();
                const next = this.at();
                if ((next == null) || next.text.toString() !== ']') {
                    if (next != null) {
                        throw new Error.UnexpectedParseError(next);
                    }
                    else {
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
                    }
                    else {
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
                }
                else if (inner != null) {
                    throw new Error.UnexpectedParseError(inner);
                }
                else {
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
                }
                else if (inner != null) {
                    throw new Error.UnexpectedParseError(inner);
                }
                else {
                    throw new Error.UnexpectedEOF();
                }
                break;
            }
            default: {
                this.index += 1;
                const modifiers = [];
                let mod = this.tryParseMod();
                while (mod != null) {
                    modifiers.push(mod);
                    mod = this.tryParseMod();
                }
                return new SymbolLit(curr, modifiers);
            }
        }
    }
    tryParseMod() {
        const curr = this.at();
        if (curr == null) {
            return undefined;
        }
        const num = Modifier.toNumModifier(curr);
        if (num != null) {
            this.index += 1;
            return num;
        }
        else if (curr.text.toString() === "′") {
            this.index += 1;
            return new Modifier.PrimeModifier();
        }
        else {
            return undefined;
        }
    }
    parse() {
        const arr = [];
        while (!this.atEnd()) {
            const next = this.parseTerm();
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
}
export function parse(tokens) {
    const parser = new Parser(tokens, 0);
    const result = parser.parse();
    if (!parser.atEnd()) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        throw new Error.UnexpectedParseError(parser.at());
    }
    return result;
}
