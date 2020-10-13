
import * as Error from './error.js'
import { stringify } from './pretty.js'
import * as Modifier from './modifier.js'
import * as Op from './op.js'

export class AST

  constructor: () ->
    @modifiers = []

  call: (state) ->
    throw new Error.CallNonFunction(this)

  getNumMod: (default_) ->
    for mod from @modifiers
      if mod instanceof Modifier.NumModifier
        return mod.value
    default_

export class SimpleCmd extends AST

  constructor: (@token) -> super()

  isNumberLit: () ->
    typeof(@token.text) == 'number'

  eval: (state) ->
    if this.isNumberLit()
      state.push @token.text
    else
      switch @token.text
        ### IO ####
        when '.' # Pretty print ( x -- )
          state.print stringify(state.pop());
        when ',' # Read integer from input
          state.push readAndParseInt(state)
        ### STACK SHUFFLING ###
        when ':' # Duplicate ( x -- x x )
                 # (Numerical modifier determines number of things to duplicate)
          mod = this.getNumMod(1)
          x = state.pop(mod)
          state.push(x...)
          state.push(x...)
        when '%' # Pop ( x -- )
                 # (Numerical modifier determines amount to pop)
          mod = this.getNumMod(1)
          state.pop(mod)
        when "@" # Swap/Rotate ( x y -- y x )
                 # (Numerical modifier determines how deep to lift)
          mod = this.getNumMod(1)
          store = state.pop(mod)
          lift = state.pop()
          state.push(store...)
          state.push(lift)
        when "ø" # Over ( x y -- x y x )
                 # (Numerical modifier determines how deep to go)
          mod = this.getNumMod(1)
          store = state.pop(mod)
          lift = state.peek()
          state.push(store...)
          state.push(lift)
        ### ARITHMETIC ###
        when '+' # Add ( x y -- z )
                 # (Numerical modifier determines arity)
          Op.binaryReduce(Op.scalarExtend((a, b) -> a + b), this, state, {'zero': 0});
        when '-' # Subtract ( x y -- z )
          Op.binaryReduce(Op.scalarExtend((a, b) -> a - b), this, state, {'one': (x) => -x})
        when '×' # Multiply ( x y -- z )
          Op.binaryReduce(Op.scalarExtend((a, b) -> a * b), this, state, {'zero': 1});
        when '÷' # Divide ( x y -- z )
          Op.binaryReduce(Op.scalarExtend((a, b) -> a / b), this, state, {'one': (x) => 1 / x})
        when '_' # Negate ( x -- y )
          state.push(- state.pop())
        when '∧' # Bitwise Conjunction ( x y -- z )
          Op.binaryReduce(Op.scalarExtend((a, b) -> a & b), this, state, {'zero': -1})
        when '∨' # Bitwise Disjunction ( x y -- z )
          Op.binaryReduce(Op.scalarExtend((a, b) -> a | b), this, state, {'zero': 0})
        when '⊕' # Bitwise Exclusive Or ( x y -- z )
          Op.binaryReduce(Op.scalarExtend((a, b) -> a ^ b), this, state, {'zero': 0})
        ### COMPARISONS ###
        # TODO For now, comparison is really just designed for numbers. Generalize.
        when '=' # Equal ( x y -- ? )
          Op.mergeReduce(Op.scalarExtend((a, b) -> if a == b then -1 else 0), ((a, b) -> a & b), this, state, {'zero': -1})
        when '<' # LT ( x y -- ? )
          Op.mergeReduce(Op.scalarExtend((a, b) -> if a < b then -1 else 0), ((a, b) -> a & b), this, state, {'zero': -1})
        when '>' # GT ( x y -- ? )
          Op.mergeReduce(Op.scalarExtend((a, b) -> if a > b then -1 else 0), ((a, b) -> a & b), this, state, {'zero': -1})
        when '≤' # LE ( x y -- ? )
          Op.mergeReduce(Op.scalarExtend((a, b) -> if a <= b then -1 else 0), ((a, b) -> a & b), this, state, {'zero': -1})
        when '≥' # GE ( x y -- ? )
          Op.mergeReduce(Op.scalarExtend((a, b) -> if a >= b then -1 else 0), ((a, b) -> a & b), this, state, {'zero': -1})
        when '≠' # Not Equal ( x y -- ? )
          Op.mergeReduce(Op.scalarExtend((a, b) -> if a != b then -1 else 0), ((a, b) -> a & b), this, state, {'zero': -1})
        when '≡' # Same ( x y -- ? )
          # Note: No scalar extension
          Op.mergeReduce(((a, b) -> if a == b then -1 else 0), ((a, b) -> a & b), this, state, {'zero': -1})
        ### METAPROGRAMMING ###
        when "s" # Get stack frame
                 # (Numerical argument determines how deep to go; n=0 is current)
          mod = this.getNumMod(0)
          frame = state.getFromCallStack(mod)
          state.push(frame)
        ### ARRAYS ###
        when "{" # Sentinel value
          state.push(new SentinelValue("{"))
        when "}" # End array (pops until sentinel value is hit)
          arr = []
          value = state.pop()
          while not (value instanceof SentinelValue) or value.type != "{"
            arr.push(value)
            value = state.pop()
          state.push(new ArrayLit(arr.reverse()))
        ### CONTROL FLOW ###
        when "i" # If ( ..a ? ( ..a -- ..b ) ( ..a -- ..b ) -- ..b )
          [c, t, f] = state.pop(3)
          if (typeof(c) != 'number') or (c != 0)
            tryCall(t, state)
          else
            tryCall(f, state);
        when "$" # Call ( ..a ( ..a -- ..b ) -- ..b )
          fn = state.pop()
          tryCall(fn, state)
        ### STACK COMBINATORS ###
        when "D" # Dip ( ..a x ( ..a -- ..b ) -- ..b x )
                 # (Numerical modifier determines arity)
          mod = this.getNumMod(1)
          fn = state.pop()
          preserve = state.pop(mod)
          tryCall(fn, state)
          state.push(preserve...)
        when "K" # Keep ( ..a x ( ..a x -- ..b ) -- ..b x )
                 # (Numerical modifier determines arity)
          mod = this.getNumMod(1)
          fn = state.pop()
          preserve = state.peek(mod)
          tryCall(fn, state)
          state.push(preserve...)
        else
          throw new Error.UnknownCommandError(@token)

  toString: () ->
    @token.toString() + @modifiers.join("")

export class FunctionLit extends AST

  constructor: (@body) -> super()

  eval: (state) -> state.push(this)

  call: (state) ->
    state.eval(@body)

  toString: () ->
    "[ #{@body.join(" ")} ]#{@modifiers.join("")}"

# Types
# "{" - Array start
export class SentinelValue extends AST

  constructor: (@type) -> super()

  toString: () ->
    @type + @modifiers.join("")

export class ArrayLit extends AST

  constructor: (@data) -> super()

  @filled: (n, x) ->
    new ArrayLit(Array(n).fill(x))

  toString: () ->
    "{ #{@data.join(" ")} }#{@modifiers.join("")}"

Object.defineProperty ArrayLit.prototype, 'length',
  get: -> @data.length

export tryCall = (fn, state) ->
  if fn instanceof AST
    state.pushCall(fn)
    result = fn.call(state)
    state.popCall(fn)
    result
  else
    throw new Error.CallNonFunction(fn)

readAndParseInt = (state) ->
  # Skip to the next number
  while state.peekInput()? and /[^-+0-9]/.test(state.peekInput())
    state.readInput()
  # Start reading
  valid = false
  sign = (x) -> x
  if state.peekInput()? and /[-+]/.test(state.peekInput())
    ch = state.readInput()
    sign = ((x) -> - x) if ch == '-'
    valid = true
  v = 0
  next = state.peekInput()
  while next? and /[0-9]/.test(next)
    valid = true
    state.readInput()
    v = v * 10 + parseInt(next, 10)
    next = state.peekInput()
  throw new Error.InvalidInput() unless valid
  sign(v)
