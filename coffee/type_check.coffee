
import { TypeError } from './error.js'
import { NumberLit, StringLit, ArrayLit } from './ast.js'

# Various typechecking functions. Unless otherwise stated, these each
# return their argument if successful and throw an Error.TypeError
# otherwise.

export checkOrThrow = (expecting, p) ->
  (value) ->
    if p value
      value
    else
      throw new TypeError(expecting, value)

export isNumber = checkOrThrow "number", (v) -> v instanceof NumberLit

export isString = checkOrThrow "string", (v) -> v instanceof StringLit

export isList =
  checkOrThrow "list", (v) -> v instanceof ArrayLit

export isStringOrList =
  checkOrThrow "string or list", (v) -> v instanceof StringLit or v instanceof ArrayLit
