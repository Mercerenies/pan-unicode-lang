
import { TypeError } from './error.js';
import { AST, NumberLit, StringLit, ArrayLit } from './ast.js';

// Various typechecking functions. Unless otherwise stated, these each
// return their argument if successful and throw an Error.TypeError
// otherwise.

export type CheckedCast<A, B> = (input: A) => B;

// The predicate should check that A is an instance of B. This is very
// much not typesafe (which is why it's not exported)
function checkOrThrow<A, B extends A>(expecting: string, p: (value: A) => boolean): CheckedCast<A, B> {
  return (value: A): B => {
    if (p(value)) {
      return value as B;
    } else {
      throw new TypeError(expecting, value);
    }
  };
}


export const isNumber: CheckedCast<AST, NumberLit> = checkOrThrow("number", function(v) {
  return v instanceof NumberLit;
});


export const isString: CheckedCast<AST, StringLit> = checkOrThrow("string", function(v) {
  return v instanceof StringLit;
});


export const isList: CheckedCast<AST, ArrayLit> = checkOrThrow("list", function(v) {
  return v instanceof ArrayLit;
});


export const isStringOrList: CheckedCast<AST, StringLit | ArrayLit> = checkOrThrow("string or list", function(v) {
  return v instanceof StringLit || v instanceof ArrayLit;
});
