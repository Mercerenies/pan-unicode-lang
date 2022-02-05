
import { Token } from './token.js';
import { AST } from './ast.js';

export class BaseError extends Error {

  id(): number {
    return -1;
  }

  get message(): string {
    return "Error";
  }

  toString(): string {
    return this.message;
  }

}

export class UnknownCommandError extends BaseError {
  readonly token: Token;

  constructor(token: Token) {
    super();
    this.token = token;
  }

  id(): number {
    return 1;
  }

  get message(): string {
    return `Unknown command ${this.token}`;
  }

}

export class StackUnderflowError extends BaseError {

  id(): number {
    return 2;
  }

  get message(): string {
    return "Stack underflow";
  }

}

export class CallStackUnderflowError extends BaseError {

  id(): number {
    return 3;
  }

  get message(): string {
    return "Call stack underflow";
  }

}

export class UnexpectedEOF extends BaseError {

  id(): number {
    return 4;
  }

  get message(): string {
    return "Unexpected EOF";
  }

}

export class UnexpectedParseError extends BaseError {
  readonly token: Token;

  constructor(token: Token) {
    super();
    this.token = token;
  }

  id(): number {
    return 5;
  }

  get message(): string {
    return `Unexpected token ${this.token}`;
  }

}

export class CallNonFunction extends BaseError {
  readonly object: AST;

  constructor(object: AST) {
    super();
    this.object = object;
  }

  id(): number {
    return 6;
  }

  get message(): string {
    return `Attempt to call non-function ${this.object}`;
  }

}

export class InvalidModifier extends BaseError {
  readonly token: Token | AST;

  constructor(token: Token | AST) {
    super();
    this.token = token;
  }

  id(): number {
    return 7;
  }

  get message(): string {
    return `Invalid modifier(s) on ${this.token}`;
  }

}

export class IncompatibleArrayLengths extends BaseError {

  id(): number {
    return 8;
  }

  get message(): string {
    return "Incompatible array lengths";
  }

}

export class InvalidInput extends BaseError {

  id(): number {
    return 9;
  }

  get message(): string {
    return "Invalid input";
  }

}

export class TypeError<T> extends BaseError {
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

  get message(): string {
    return `Type error (Expected ${this.expected} got ${this.value})`;
  }

}

export class StrEncodingError extends BaseError {
  readonly str: string;

  constructor(str: string) {
    super();
    this.str = str;
  }

  id(): number {
    return 11;
  }

  get message(): string {
    return `String encoding error (${this.str})`;
  }

}

export class IncomparableValues extends BaseError {
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

  get message(): string {
    return `Attempt to compare ${this.lhs} and ${this.rhs}`;
  }

}

export class UserError extends BaseError {
  readonly value: AST

  constructor(value: AST) {
    super();
    this.value = value;
  }

  id(): number {
    return 13;
  }

  get message(): string {
    return `User error ${this.value}`;
  }

}
