export class Error {
    constructor() { }
    id() {
        return -1;
    }
    message() {
        return "Error";
    }
    toString() {
        return this.message();
    }
}
export class UnknownCommandError extends Error {
    constructor(token) {
        super();
        this.token = token;
    }
    id() {
        return 1;
    }
    message() {
        return `Unknown command ${this.token}`;
    }
}
export class StackUnderflowError extends Error {
    id() {
        return 2;
    }
    message() {
        return "Stack underflow";
    }
}
export class CallStackUnderflowError extends Error {
    id() {
        return 3;
    }
    message() {
        return "Call stack underflow";
    }
}
export class UnexpectedEOF extends Error {
    id() {
        return 4;
    }
    message() {
        return "Unexpected EOF";
    }
}
export class UnexpectedParseError extends Error {
    constructor(token) {
        super();
        this.token = token;
    }
    id() {
        return 5;
    }
    message() {
        return `Unexpected token ${this.token}`;
    }
}
export class CallNonFunction extends Error {
    constructor(object) {
        super();
        this.object = object;
    }
    id() {
        return 6;
    }
    message() {
        return `Attempt to call non-function ${this.object}`;
    }
}
export class InvalidModifier extends Error {
    constructor(token) {
        super();
        this.token = token;
    }
    id() {
        return 7;
    }
    message() {
        return `Invalid modifier(s) on ${this.token}`;
    }
}
export class IncompatibleArrayLengths extends Error {
    id() {
        return 8;
    }
    message() {
        return "Incompatible array lengths";
    }
}
export class InvalidInput extends Error {
    id() {
        return 9;
    }
    message() {
        return "Invalid input";
    }
}
export class TypeError extends Error {
    constructor(expected, value) {
        super();
        this.expected = expected;
        this.value = value;
    }
    id() {
        return 10;
    }
    message() {
        return `Type error (Expected ${this.expected} got ${this.value})`;
    }
}
export class StrEncodingError extends Error {
    constructor(str) {
        super();
        this.str = str;
    }
    id() {
        return 11;
    }
    message() {
        return `String encoding error (${this.str})`;
    }
}
export class IncomparableValues extends Error {
    constructor(lhs, rhs) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
    }
    id() {
        return 12;
    }
    message() {
        return `Attempt to compare ${this.lhs} and ${this.rhs}`;
    }
}
export class UserError extends Error {
    constructor(value) {
        super();
        this.value = value;
    }
    id() {
        return 13;
    }
    message() {
        return `User error ${this.value}`;
    }
}
