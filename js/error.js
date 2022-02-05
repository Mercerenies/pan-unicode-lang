export class BaseError extends Error {
    id() {
        return -1;
    }
    get message() {
        return "Error";
    }
    toString() {
        return this.message;
    }
}
export class UnknownCommandError extends BaseError {
    constructor(token) {
        super();
        this.token = token;
    }
    id() {
        return 1;
    }
    get message() {
        return `Unknown command ${this.token}`;
    }
}
export class StackUnderflowError extends BaseError {
    id() {
        return 2;
    }
    get message() {
        return "Stack underflow";
    }
}
export class CallStackUnderflowError extends BaseError {
    id() {
        return 3;
    }
    get message() {
        return "Call stack underflow";
    }
}
export class UnexpectedEOF extends BaseError {
    id() {
        return 4;
    }
    get message() {
        return "Unexpected EOF";
    }
}
export class UnexpectedParseError extends BaseError {
    constructor(token) {
        super();
        this.token = token;
    }
    id() {
        return 5;
    }
    get message() {
        return `Unexpected token ${this.token}`;
    }
}
export class CallNonFunction extends BaseError {
    constructor(object) {
        super();
        this.object = object;
    }
    id() {
        return 6;
    }
    get message() {
        return `Attempt to call non-function ${this.object}`;
    }
}
export class InvalidModifier extends BaseError {
    constructor(token) {
        super();
        this.token = token;
    }
    id() {
        return 7;
    }
    get message() {
        return `Invalid modifier(s) on ${this.token}`;
    }
}
export class IncompatibleArrayLengths extends BaseError {
    id() {
        return 8;
    }
    get message() {
        return "Incompatible array lengths";
    }
}
export class InvalidInput extends BaseError {
    id() {
        return 9;
    }
    get message() {
        return "Invalid input";
    }
}
export class TypeError extends BaseError {
    constructor(expected, value) {
        super();
        this.expected = expected;
        this.value = value;
    }
    id() {
        return 10;
    }
    get message() {
        return `Type error (Expected ${this.expected} got ${this.value})`;
    }
}
export class StrEncodingError extends BaseError {
    constructor(str) {
        super();
        this.str = str;
    }
    id() {
        return 11;
    }
    get message() {
        return `String encoding error (${this.str})`;
    }
}
export class IncomparableValues extends BaseError {
    constructor(lhs, rhs) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
    }
    id() {
        return 12;
    }
    get message() {
        return `Attempt to compare ${this.lhs} and ${this.rhs}`;
    }
}
export class UserError extends BaseError {
    constructor(value) {
        super();
        this.value = value;
    }
    id() {
        return 13;
    }
    get message() {
        return `User error ${this.value}`;
    }
}
