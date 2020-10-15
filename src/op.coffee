
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
  adjustment = opts.modifierAdjustment ? (x) -> x
  mod = adjustment(term.getNumMod(opts.defaultModifier ? 2))
  if mod == 0
    if opts.zero?
      state.push opts.zero()
    else
      throw new Error.InvalidModifier(term)
  else if mod == 1 and opts.one?
    top = state.pop()
    state.push opts.one(top)
  else
    arr = state.pop(mod)
    state.push arr.reduce(fn)

export binaryReduceRight = (fn, term, state, opts = {}) ->
  adjustment = opts.modifierAdjustment ? (x) -> x
  mod = adjustment(term.getNumMod(opts.defaultModifier ? 2))
  if mod == 0
    if opts.zero?
      state.push opts.zero()
    else
      throw new Error.InvalidModifier(term)
  else if mod == 1 and opts.one?
    top = state.pop()
    state.push opts.one(top)
  else
    arr = state.pop(mod)
    state.push arr.slice().reverse().reduce((x, y) -> fn(y, x))

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
  adjustment = opts.modifierAdjustment ? (x) -> x
  mod = adjustment(term.getNumMod(opts.defaultModifier ? 2))
  if mod == 0
    if opts.zero?
      state.push opts.zero
    else
      throw new Error.InvalidModifier(term)
  else if mod == 1
    if opts.one?
      top = state.pop()
      state.push opts.one(top)
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

export scalarExtendUnary = (f) ->
  f1 = (x) ->
    if x instanceof ArrayLit
      new ArrayLit(f1(curr) for curr in x.data)
    else
      f(x)
  f1

export handleWhiteFlag = (state, term, default_, f) ->
  mod = term.getNumMod(2)
  if mod > 0
    top = state.peek()
    if top instanceof SentinelValue and top.type.toString() == '⚐'
      state.pop() # Pop the sentinel
      if typeof default_ == 'function'
        state.push(default_())
      else
        state.push(default_)
      return
  f()

export noExtension = (fn, term, state, opts = {}) ->
  [a, b] = state.pop(2)
  state.push fn(a, b)

export binary = (fn, term, state, opts = {}) ->
  zero = opts.zero
  one = opts.one
  zero = (() -> opts.zero) if zero? and typeof zero != 'function'
  one = ((_) -> opts.one) if one? and typeof one != 'function'
  one = scalarExtendUnary(one) if opts.scalarExtend and one?
  binaryReduce fn, term, state,
    zero: zero
    one: one
    modifierAdjustment: opts.modifierAdjustment
    defaultModifier: opts.defaultModifier

# binary but associate to the right
export binaryRight = (fn, term, state, opts = {}) ->
  zero = opts.zero
  one = opts.one
  zero = (() -> opts.zero) if zero? and typeof zero != 'function'
  one = ((_) -> opts.one) if one? and typeof one != 'function'
  one = scalarExtendUnary(one) if opts.scalarExtend and one?
  binaryReduceRight fn, term, state,
    zero: zero
    one: one
    modifierAdjustment: opts.modifierAdjustment
    defaultModifier: opts.defaultModifier

export merge = (reduce) -> (fn, term, state, opts = {}) ->
  if opts.scalarExtend
    reduce = scalarExtend(reduce)
  zero = opts.zero
  one = opts.one
  zero = (() -> opts.zero) if zero? and typeof zero != 'function'
  one = ((_) -> opts.one) if one? and typeof one != 'function'
  one = scalarExtendUnary(one) if opts.scalarExtend and one?
  mergeReduce fn, reduce, term, state,
    zero: zero
    one: one
    modifierAdjustment: opts.modifierAdjustment
    defaultModifier: opts.defaultModifier

export WhiteFlag =
  # Inherit from the zero argument, if provided. If not, behaves like
  # ignore.
  inherit: (opts) -> opts.zero
  # Use a constant value.
  value: (n) -> (opts) -> n
  # Perform no special handling.
  ignore: (opts) -> undefined

export boolToInt = (x) ->
  if x then -1 else 0

# This function is an attempt to summarize all of the above, providing
# all of that functionality as keyword arguments. The available
# keyword arguments are listed below.
#
# - function (required) - The function to apply.
#
# - postProcess (optional) - Unary function; runs after the original
#   function. Defaults to the identity function.
#
# - extension (optional) - If provided, this should be one of Op.none,
#   Op.binary, or Op.merge(...). It determines how to reduce the
#   function along more arguments.
#
# - scalarExtend (optional) - Boolean which defaults to false. If
#   true, the function will extend if at least one of the arguments is
#   a list.
#
# - zero (optional) - If provided, this will be used as the
#   zero-argument result after extension.
#
# - one (optional) - If provided, this will be used as the
#   one-argument result after extension.
#
# - whiteFlag (optional) - How to handle the white flag, usually one
#   of the WhiteFlag.* constants. Defaults to WhiteFlag.inherit.
#
# - modifierAdjustment (optional) - A unary function to apply to the
#   numerical modifier before interpreting it as arity. Defaults to
#   the identity function.
#
# - defaultModifier (optional) - Default modifier. Defaults to 2.
export op = (state, term, opts = {}) ->
  func = opts.function
  if opts.postProcess
    unprocessedFunc = func
    func = (a, b) -> opts.postProcess(unprocessedFunc(a, b))
  if opts.scalarExtend
    func = scalarExtend(func)
  operation = -> (opts.extension ? noExtension)(func, term, state, opts)
  whiteFlag = (opts.whiteFlag ? WhiteFlag.inherit)(opts)
  if whiteFlag?
    oldOperation = operation
    operation = -> handleWhiteFlag state, term, whiteFlag, oldOperation
  operation()
