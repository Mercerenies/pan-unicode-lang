
import { Token } from './token.js';
import { AST } from './ast.js';

export class Error {

  constructor() {}

  id(): number {
    return -1;
  }

  message(): string {
    return "Error";
  }

  toString(): string {
    return this.message();
  }

}

export class UnknownCommandError extends Error {
  readonly token: Token;

  constructor(token: Token) {
    super();
    this.token = token;
  }

  id(): number {
    return 1;
  }

  message(): string {
    return `Unknown command ${this.token}`;
  }

}

export class StackUnderflowError extends Error {

  id(): number {
    return 2;
  }

  message(): string {
    return "Stack underflow";
  }

}

export class CallStackUnderflowError extends Error {

  id(): number {
    return 3;
  }

  message(): string {
    return "Call stack underflow";
  }

}

export class UnexpectedEOF extends Error {

  id(): number {
    return 4;
  }

  message(): string {
    return "Unexpected EOF";
  }

}

export class UnexpectedParseError extends Error {
  readonly token: Token;

  constructor(token: Token) {
    super();
    this.token = token;
  }

  id(): number {
    return 5;
  }

  message(): string {
    return `Unexpected token ${this.token}`;
  }

}

export class CallNonFunction extends Error {
  readonly object: AST;

  constructor(object: AST) {
    super();
    this.object = object;
  }

  id(): number {
    return 6;
  }

  message(): string {
    return `Attempt to call non-function ${this.object}`;
  }

}

export class InvalidModifier extends Error {
  readonly token: Token | AST;

  constructor(token: Token | AST) {
    super();
    this.token = token;
  }

  id(): number {
    return 7;
  }

  message(): string {
    return `Invalid modifier(s) on ${this.token}`;
  }

}

export class IncompatibleArrayLengths extends Error {

  id(): number {
    return 8;
  }

  message(): string {
    return "Incompatible array lengths";
  }

}

export class InvalidInput extends Error {

  id(): number {
    return 9;
  }

  message(): string {
    return "Invalid input";
  }

}

export class TypeError<T> extends Error {
  readonly expected: string; // TODO Refine?
  readonly value: T;

  constructor(expected: string, value: T) {
    super();
    this.expected = expected;
    this.value = value;
  }

  id(): number {
    return 10;
  }

  message(): string {
    return `Type error (Expected ${this.expected} got ${this.value})`;
  }

}

export class StrEncodingError extends Error {
  readonly str: string;

  constructor(str: string) {
    super();
    this.str = str;
  }

  id(): number {
    return 11;
  }

  message(): string {
    return `String encoding error (${this.str})`;
  }

}

export class IncomparableValues extends Error {
  readonly lhs: AST;
  readonly rhs: AST;

  constructor(lhs: AST, rhs: AST) {
    super();
    this.lhs = lhs;
    this.rhs = rhs;
  }

  id(): number {
    return 12;
  }

  message(): string {
    return `Attempt to compare ${this.lhs} and ${this.rhs}`;
  }

}

export class UserError extends Error {
  readonly value: AST

  constructor(value: AST) {
    super();
    this.value = value;
  }

  id(): number {
    return 13;
  }

  message(): string {
    return `User error ${this.value}`;
  }

}
