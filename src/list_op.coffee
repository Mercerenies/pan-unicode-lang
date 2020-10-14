
import * as Error from './error.js';
import { ArrayLit, FunctionLit, tryCall } from './ast.js';
import { MAX_NUM_MODIFIER } from './modifier.js';

# Filter (⌿) always takes exactly two arguments off the stack. Its
# behavior is very general. The numerical modifier determines the
# maximum depth that we will dig into the list argument (the first
# argument). So, for instance, if our list argument is
#
# { 0 { 1 } { { 2 } 3 } }
#
# Then a modifier of ③ will operate on 0, 1, 2, 3. A modifier of ②
# will operate on 0, 1, {2}, 3. A modifier of ① (the default) will
# operate on 0, {1}, {{2} 3}. A modifier of ⓪ will operate on the list
# as a whole. Note that a modifier of ⑳ is treated as infinity and
# will nest arbitrarily deep.
#
# For each position in the original list at index (i1, i2, ..., in),
# we get the corresponding entry from the function argument. If the
# function argument is not nested as deeply, then we simply access as
# many indices as possible until we reach a non-list. The result shall
# be either a number or a function. If it's a function, it's called
# with the value as an argument and should return a number. The
# absolute value of the number, in either case, determines the number
# of times to repeat the argument.
#
# Examples: (Assume f, g, h are function literals)
#
# { 0 1 2 } f ⌿ will call f for each of 0, 1, 2
#
# { 0 1 { 2 } } f ⌿ will call f for each of 0, 1, {2}
#
# { 0 1 { 2 } } f② ⌿ will call f for each of 0, 1, 2
#
# { 0 1 { 2 } } { f g h } ⌿ will call f on 0, g on 1, h on {2}
#
# { 0 1 { 2 } } { f g h } ⌿② will call f on 0, g on 1, h on 2
#
# { 0 {1 2} } { f g } ⌿② will call f on 0, g on 1, g on 2
#
# { 0 {1 2} } { f {g h} } ⌿② will call f on 0, g on 1, h on 2
#
# In any example above, we can replace a function with a number, and
# it will be treated as a constant function which returns that number.
export filter = (term, state) ->
  depth = term.getNumMod(1)
  depth = Infinity if depth == MAX_NUM_MODIFIER
  [list, func] = state.pop(2)
  result = runFilter(depth, list, func, state)
  state.push(result...)

filterTestFunc = (value, func, state) ->
  if typeof(func) == 'number'
    throw new Error.TypeError("integer", func) unless Number.isInteger(func)
    Math.abs(func)
  else
    state.push(value)
    tryCall(func, state)
    result = state.pop()
    throw new Error.TypeError("integer", result) unless Number.isInteger(result)
    Math.abs(result)

runFilter = (depth, list, func, state) ->
  if depth <= 0 or not (list instanceof ArrayLit)
    count = filterTestFunc(list, func, state)
    Array(count).fill(list)
  else
    mask = if func instanceof ArrayLit
      throw new Error.IncompatibleArrayLengths() if func.length != list.length
      func.data
    else
      Array(list.length).fill(func)
    result = []
    for i in [0..mask.length-1]
      result = result.concat(runFilter(depth - 1, list.data[i], mask[i], state))
    [new ArrayLit(result)]

# Map (¨). Takes two arguments: a list and a function. Like filter,
# the numerical argument determines the depth. The function can be a
# function or an arbitrary nested list of functions.
#
# Examples:
#
# {1 {1} {{1}}} [1≡] ¨⓪ evaluates to 0
#
# {1 {1} {{1}}} [1≡] ¨① evaluates to {-1 0 0}
#
# {1 {1} {{1}}} [1≡] ¨② evaluates to {-1 {-1} {0}}
#
# {1 {1} {{1}}} [1≡] ¨③ evaluates to {-1 {-1} {{-1}}}
#
# Note that ¨⓪ is just $.
export map = (term, state) ->
  depth = term.getNumMod(1)
  depth = Infinity if depth == MAX_NUM_MODIFIER
  [list, func] = state.pop(2)
  result = runMap(depth, list, func, state)
  state.push(result)

runMap = (depth, list, func, state) ->
  if depth <= 0 or not (list instanceof ArrayLit)
    state.push(list)
    tryCall(func, state)
    state.pop()
  else
    mask = if func instanceof ArrayLit
      throw new Error.IncompatibleArrayLengths() if func.length != list.length
      func.data
    else
      Array(list.length).fill(func)
    result = (runMap(depth - 1, list.data[i], mask[i], state) for i in [0..list.length-1])
    new ArrayLit(result)
