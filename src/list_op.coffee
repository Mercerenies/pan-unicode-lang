
import * as Error from './error.js';
import { ArrayLit, FunctionLit, StringLit, SentinelValue, tryCall, isTruthy } from './ast.js';
import { MAX_NUM_MODIFIER } from './modifier.js';
import Str from './str.js'
import { compare, Ordering } from './comparison.js'
import { isList } from './type_check.js'

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

# Map (¨). Takes two arguments: a list and a function. The first
# numerical argument controls the number of lists to pop (Map will
# always pop one more total argument than its first numerical
# argument, as it also pops the function). The second numerical
# argument determines the depth in the same way as filter's depth
# argument. Both numerical arguments default to 1. The function can be
# a function or an arbitrary nested list of functions.
#
# Examples:
#
# {1 {1} {{1}}} [1≡] ¨①⓪ evaluates to 0
#
# {1 {1} {{1}}} [1≡] ¨①① evaluates to {-1 0 0}
#
# {1 {1} {{1}}} [1≡] ¨①② evaluates to {-1 {-1} {0}}
#
# {1 {1} {{1}}} [1≡] ¨①③ evaluates to {-1 {-1} {{-1}}}
#
# Note that ¨①⓪ is just $ and ¨⓪① will simply pop the function and
# call it once with no arguments.
export map = (term, state) ->
  [argCount, depth] = term.getNumMod(1, 1)
  depth = Infinity if depth == MAX_NUM_MODIFIER
  [args..., func] = [state.pop(argCount + 1)...]
  result = runMap(depth, args, func, state)
  state.push(result)

getNodeLength = (args) ->
  length = undefined
  for arg in args
    if arg instanceof ArrayLit
      switch
        when not length?
          length = arg.length
        when length == arg.length
          # Pass
        else
          throw new Error.IncompatibleArrayLengths()
  length

runMap = (depth, args, func, state) ->
  len = getNodeLength(args)
  if depth <= 0 or len == undefined
    state.push(...args)
    tryCall(func, state)
    state.pop()
  else
    mask = if func instanceof ArrayLit
      throw new Error.IncompatibleArrayLengths() if func.length != len
      func.data
    else
      Array(len).fill(func)
    result = []
    for i in [0..len-1]
      newArgs = args.map((v) -> if v instanceof ArrayLit then v.data[i] else v)
      result.push runMap(depth - 1, newArgs, mask[i], state)
    new ArrayLit(result)

# Nested query (n) Takes two arguments: a list/string and an index,
# which can be either a number or a list. The index is traversed in
# order, taking the nth element of the list/string at each step.
export nestedQuery = (term, state) ->
  [list, index] = state.pop(2)
  index = switch
    when typeof(index) == 'number' then [index]
    when index instanceof ArrayLit then index.data
    else throw new Error.TypeError("number or array", index)
  result = list
  for idx in index
    result = nth(result, idx)
  if result?
    state.push(result)
  else
    state.push(new SentinelValue("ε"))

# Select (⊇) takes two arguments: a list/string and an index. The
# index can either be a number or a list. If it's a number, it's
# treated a a singleton list. A new list/string is formed by taking
# the elements at the given positions. Any invalid indices are
# ignored.
export select = (term, state) ->
  [list, index] = state.pop(2)
  index = switch
    when typeof(index) == 'number' then [index]
    when index instanceof ArrayLit then index.data
    else throw new Error.TypeError("number or array", index)
  unless (list instanceof StringLit) or (list instanceof ArrayLit)
    throw new Error.TypeError("array or string", list)
  results = []
  for idx in index
    curr = nth(list, idx)
    results.push(curr) if curr?
  state.push rebuild(list, results)

rebuild = (model, values) ->
  switch
    when model instanceof StringLit
      new StringLit(new Str(values.map((x) -> x.text.toString())))
    when model instanceof ArrayLit
      new ArrayLit(values)
    else
      new SentinelValue("ε") # Meh.

nth = (value, index) ->
  switch
    when value instanceof StringLit
      result = value.text.charAt(index)
      if result?
        new StringLit(result)
      else
        undefined
    when value instanceof ArrayLit
      value.data[index]
    else value

# By default, gradeUp takes one argument: a list. It returns a list of
# indices which indicates the permutation placing the list into
# ascending order. With a prime modifier, this will pop a function
# (before popping the list) that will be used as the "less than"
# operator for comparison. Returns a list of indices which indicate
# the permutation of the list after sorting.
export gradeUp = (term, state) ->
  [list, func] = if term.getPrimeMod() > 0
    [list, func0] = state.pop(2)
    func = (x, y) ->
      state.push(x, y)
      tryCall(func0, state)
      isTruthy(state.pop())
    [list, func]
  else
    list = state.pop()
    func = (x, y) -> compare(x, y) == Ordering.LT
    [list, func]
  isList(list)
  indices = [0..list.length-1]
  indices.sort (a, b) ->
    if func(list.data[a], list.data[b])
      -1
    else if func(list.data[b], list.data[a])
      1
    else
      0
  state.push(new ArrayLit(indices))
