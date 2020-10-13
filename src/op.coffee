
import * as Error from './error.js';
import { ArrayLit, SentinelValue } from './ast.js';
import { zip } from './util.js';

# Helper functions for producing operations on the stack

# Takes a binary function and constructs an operation which takes any
# number of arguments (determined by numerical modifier).
#
# - If given zero arguments, opts.zero is returned, and an exception
#   is thrown if opts.zero is undefined.
# - If given one argument, opts.one is returned. If opts.one is
#   undefined, then a single argument is popped and then pushed
#   unmodified.
# - If two or more are given, the arguments are folded starting
#   with the deepest on the stack.
export binaryReduce = (fn, term, state, opts = {}) ->
  mod = term.getNumMod 2
  if mod == 0
    if opts.zero?
      state.push opts.zero
    else
      throw new Error.InvalidModifier(term)
  else if mod == 1 and opts.one?
    top = state.pop()
    state.push opts.one(top)
  else
    arr = state.pop(mod)
    state.push arr.reduce(fn)

# Takes a binary function and constructs an operation which takes any
# number of arguments (determined by numerical modifier).
#
# - If given zero arguments, opts.zero is returned, and an exception
#   is thrown if opts.zero is undefined.
# - If given one argument, opts.one is returned. If opts.one is
#   undefined, then an exception is thrown.
# - If two or more are given, every adjacent pair is compared
#   using the binary function, and the results are reduced.
export mergeReduce = (fn, reduce, term, state, opts = {}) ->
  mod = term.getNumMod 2
  if mod == 0
    if opts.zero?
      state.push opts.zero
    else
      throw new Error.InvalidModifier(term)
  else if mod == 1
    if opts.one?
      state.push opts.one
    else
      throw new Error.InvalidModifier(term)
  else
    arr = state.pop(mod)
    brr = (fn(arr[i], arr[i + 1]) for i in [0..arr.length-2])
    state.push brr.reduce(reduce)

export scalarExtend = (f) ->
  f1 = (x, y) ->
    if x instanceof ArrayLit or y instanceof ArrayLit
      unless x instanceof ArrayLit
        x = ArrayLit.filled(y.length, x)
      unless y instanceof ArrayLit
        y = ArrayLit.filled(x.length, y)
      if x.length != y.length
        throw new Error.IncompatibleArrayLengths()
      new ArrayLit(f1(...curr) for curr in zip(x.data, y.data))
    else
      f(x, y)
  f1

export handleWhiteFlag = (state, term, default_, f) ->
  mod = term.getNumMod 2
  if mod > 0
    top = state.peek()
    if top instanceof SentinelValue and top.type == '⚐'
      state.pop() # Pop the sentinel
      state.push(default_)
      return
  f()
