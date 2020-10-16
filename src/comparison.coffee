
import { SentinelValue, ArrayLit, StringLit, Box, isTruthy, tryCall } from './ast.js'
import { IncomparableValues } from './error.js'

export Ordering =
  LT: -1
  EQ:  0
  GT:  1

export toOrdering = (n) ->
  Math.sign(n)

# Note: Equality will never produce an error. Comparing values of
# different types simply returns false.
export equals = (a, b) ->
  return true if a == b
  if a instanceof SentinelValue and b instanceof SentinelValue
    return true if a.type.toString() == b.type.toString()
  if a instanceof ArrayLit and b instanceof ArrayLit
    return true if arrayEq(a.data, b.data, equals)
  if a instanceof StringLit and b instanceof StringLit
    return true if a.text.toString() == b.text.toString()
  if a instanceof Box and b instanceof Box
    return true if equals(a.value, b.value)
  false

# Unlike equality, comparison WILL throw an error if given
# incompatible types.
export compare = (a, b) ->
  switch
    when typeof(a) == 'number' and typeof(b) == 'number'
      toOrdering(a - b)
    when a instanceof ArrayLit and b instanceof ArrayLit
      for i in [0..Math.min(a.length, b.length)-1]
        result = compare(a.data[i], b.data[i])
        return result if result != Ordering.EQ
      compare(a.length. b.length)
    when a instanceof StringLit and b instanceof StringLit
      a = a.text.toString()
      b = b.text.toString()
      switch
        when a < b then Ordering.LT
        when a > b then Ordering.GT
        else            Ordering.EQ
    when a instanceof Box and b instanceof Box
      compare(a.value, b.value)
    else
      throw new IncomparableValues(a, b)

export defaultLT = (x, y) ->
  compare(x, y) == Ordering.LT

export customLT = (state, fn) ->
  (x, y) ->
    state.push(x, y)
    tryCall(fn, state)
    isTruthy(state.pop())
