
import { Token } from './token.js';
import { AST } from './ast.js';

export class Error {
  constructor() {}

  id() {
    return -1;
  }

  message() {
    return "Error";
  }

  toString() {
    return this.message();
  }

};

export var UnknownCommandError = class UnknownCommandError extends Error {
  readonly token: Token;

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

};

export var StackUnderflowError = class StackUnderflowError extends Error {
  id() {
    return 2;
  }

  message() {
    return "Stack underflow";
  }

};

export var CallStackUnderflowError = class CallStackUnderflowError extends Error {
  id() {
    return 3;
  }

  message() {
    return "Call stack underflow";
  }

};

export var UnexpectedEOF = class UnexpectedEOF extends Error {
  id() {
    return 4;
  }

  message() {
    return "Unexpected EOF";
  }

};

export var UnexpectedParseError = class UnexpectedParseError extends Error {
  readonly token: Token;

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

};

export var CallNonFunction = class CallNonFunction extends Error {
  readonly object: AST;

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

};

export var InvalidModifier = class InvalidModifier extends Error {
  readonly token: Token

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

};

export var IncompatibleArrayLengths = class IncompatibleArrayLengths extends Error {
  id() {
    return 8;
  }

  message() {
    return "Incompatible array lengths";
  }

};

export var InvalidInput = class InvalidInput extends Error {
  id() {
    return 9;
  }

  message() {
    return "Invalid input";
  }

};

export var TypeError = class TypeError extends Error {
  readonly expected: string; // TODO Refine?
  readonly value: AST;

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

};

export var StrEncodingError = class StrEncodingError extends Error {
  readonly str: string;

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

};

export var IncomparableValues = class IncomparableValues extends Error {
  readonly lhs: AST;
  readonly rhs: AST;

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

};

export var UserError = class UserError extends Error {
  readonly value: AST

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

};
