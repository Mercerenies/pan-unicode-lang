
import * as Error from './error.js'
import { stringify } from './pretty.js'
import * as Modifier from './modifier.js'
import * as Op from './op.js'
import * as ListOp from './list_op.js'
import * as StackOp from './stack_op.js'
import { arrayEq } from './util.js'
import { Token, TokenType, escapeString } from './token.js'

export class AST

  constructor: () ->
    @modifiers = []

  call: (state) ->
    throw new Error.CallNonFunction(this)

  getNumMod: (args...) ->
    args = [undefined] if args.length == 0
    result = []
    for mod from @modifiers
      if mod instanceof Modifier.NumModifier
        result.push(mod.value)
        break if result.length >= args.length
    while result.length < args.length
      result.push args[result.length]
    if result.length == 1
      result[0]
    else
      result

export class SimpleCmd extends AST

  constructor: (@token) -> super()

  isNumberLit: () ->
    @token.tokenType() == TokenType.Number

  isStringLit: () ->
    @token.tokenType() == TokenType.String

  eval: (state) ->
    if this.isNumberLit()
      state.push @token.text
    else if this.isStringLit()
      state.push new StringLit(@token.text)
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
          Op.op state, this,
            function: (a, b) -> a + b
            zero: 0
            extension: Op.binary
            scalarExtend: true
        when '-' # Subtract ( x y -- z )
          Op.op state, this,
            function: (a, b) -> a - b
            one: (a) -> - a
            extension: Op.binary
            scalarExtend: true
        when '×' # Multiply ( x y -- z )
          Op.op state, this,
            function: (a, b) -> a * b
            zero: 1
            extension: Op.binary
            scalarExtend: true
        when '÷' # Divide ( x y -- z )
          Op.op state, this,
            function: (a, b) -> a / b
            one: (a) -> 1 / a
            extension: Op.binary
            scalarExtend: true
        when '|' # Remainder ( x y -- z )
          # This does not extend with modifier; it only scalar extends
          Op.op state, this,
            function: (a, b) -> (a % b + b) % b # "True" mod
            scalarExtend: true
        when '_' # Negate ( x -- y )
          state.push Op.scalarExtendUnary((x) -> - x)(state.pop())
        when '∧' # Bitwise Conjunction ( x y -- z )
          Op.op state, this,
            function: (a, b) -> a & b
            zero: -1
            extension: Op.binary
            scalarExtend: true
        when '∨' # Bitwise Disjunction ( x y -- z )
          Op.op state, this,
            function: (a, b) -> a | b
            zero: 0
            extension: Op.binary
            scalarExtend: true
        when '⊕' # Bitwise Exclusive Or ( x y -- z )
          Op.op state, this,
            function: (a, b) -> a ^ b
            zero: -1
            extension: Op.binary
            scalarExtend: true
        ### COMPARISONS ###
        # TODO For now, comparison is really just designed for numbers. Generalize.
        when '=' # Equal ( x y -- ? )
          Op.op state, this,
            function: (a, b) -> equals(a, b)
            postProcess: Op.boolToInt
            zero: -1
            extension: Op.merge (a, b) -> a & b
            scalarExtend: true
        when '<' # LT ( x y -- ? )
          Op.op state, this,
            function: (a, b) -> a < b
            postProcess: Op.boolToInt
            zero: -1
            extension: Op.merge (a, b) -> a & b
            scalarExtend: true
        when '>' # GT ( x y -- ? )
          Op.op state, this,
            function: (a, b) -> a > b
            postProcess: Op.boolToInt
            zero: -1
            extension: Op.merge (a, b) -> a & b
            scalarExtend: true
        when '≤' # LE ( x y -- ? )
          Op.op state, this,
            function: (a, b) -> a <= b
            postProcess: Op.boolToInt
            zero: -1
            extension: Op.merge (a, b) -> a & b
            scalarExtend: true
        when '≥' # GE ( x y -- ? )
          Op.op state, this,
            function: (a, b) -> a >= b
            postProcess: Op.boolToInt
            zero: -1
            extension: Op.merge (a, b) -> a & b
            scalarExtend: true
        when '≠' # Not Equal ( x y -- ? )
          Op.op state, this,
            function: (a, b) -> not equals(a, b)
            postProcess: Op.boolToInt
            zero: -1
            extension: Op.merge (a, b) -> a & b
            scalarExtend: true
        when '≡' # Same ( x y -- ? )
          # Note: No scalar extension
          Op.op state, this,
            function: (a, b) -> equals(a, b)
            postProcess: Op.boolToInt
            zero: -1
            extension: Op.merge (a, b) -> a & b
            scalarExtend: false
        ### METAPROGRAMMING ###
        when "s" # Get stack frame
                 # (Numerical argument determines how deep to go; n=0 is current)
          mod = this.getNumMod(0)
          frame = state.getFromCallStack(mod)
          state.push(frame)
        when "{", "⚐", "ε" # Sentinel value
          state.push(new SentinelValue(@token.text))
        when "⚑" # Construct ⚐ sentinel ( fn deffn -- fn )
          # Constructs a handler for the ⚐ sentinel. The resulting
          # function will call deffn if the top value of the stack is
          # ⚐ (popping ⚐), or will call fn otherwise (without popping
          # anything off the stack a priori). This is useful for
          # providing a "default" value to fold (/) in the case of an
          # empty list.
          #
          # For instance, [`+ `999 ⚑ /] is a function which sums a
          # list, but returns 999 rather than 0 if the list is empty.
          [fn, deffn] = state.pop(2)
          state.push(
            new FunctionLit([
              new SimpleCmd(new Token(":")),
              new SimpleCmd(new Token("⚐")),
              new SimpleCmd(new Token("≡")),
              new FunctionLit([
                new SimpleCmd(new Token('%')),
                deffn,
                new SimpleCmd(new Token('$')),
              ]),
              fn,
              new SimpleCmd(new Token("i")),
            ])
          )
        ### ARRAY LITERALS ###
        when "}" # End array (pops until sentinel value is hit)
          arr = []
          value = state.pop()
          while not (value instanceof SentinelValue) or value.type != "{"
            arr.push(value)
            value = state.pop()
          state.push(new ArrayLit(arr.reverse()))
        ### ARRAY OPERATIONS ###
        when '/' # Fold ( ..a list ( ..a x y -- ..b z ) -- ..b t )
          # This one bears a bit of explanation. If the list is
          # nonempty, it acts like a traditional fold, applying the
          # binary operation between all elements of the list,
          # associating to the left. If the list is empty, it pushes
          # the special sentinel value ⚐ to the stack then calls the
          # function once. Built-in functions like + and × know to
          # check for the ⚐ and will return their identity (0 and 1,
          # resp.) in that case. If you provide your own function, you
          # can deal with the empty case by checking for ⚐.
          [list, func] = state.pop(2)
          throw new TypeError("Array", list) unless list instanceof ArrayLit
          if list.length <= 0
            state.push(new SentinelValue("⚐"))
            tryCall(func, state)
          else
            acc = list.data[0]
            state.push(acc)
            for i in [1..list.length-1] by 1
              state.push(list.data[i])
              tryCall(func, state)
        when '⌿' # Filter ( ..a list ( ..a x -- ..a ? ) -- ..a list )
          # The filter "function" can either be a function or a list
          # with the same length as the list, which acts as a mask. In
          # either case, the absolute value of the result at each
          # position is used to determine the number of times to
          # repeat the value. Numerical argument (default=1)
          # determines how many nested lists to go. See documentation
          # for ListOp.filter for more specific details.
          ListOp.filter this, state
        when '¨' # Map ( ..a list ( ..a x -- ..a y ) -- ..a list )
          # Nests arbitrarily deep with a numerical argument, like
          # filter. See ListOp.map for full details.
          ListOp.map this, state
        ### CONTROL FLOW ###
        when "i" # If ( ..a ? ( ..a -- ..b ) ( ..a -- ..b ) -- ..b )
          [c, t, f] = state.pop(3)
          if isTruthy(c)
            tryCall(t, state)
          else
            tryCall(f, state)
        when "w" # While ( ..a ( ..a -- ..b ? ) ( ..b -- ..a ) -- ..b )
          [cond, body] = state.pop(2)
          loop
            tryCall(cond, state)
            result = state.pop()
            break unless isTruthy(result)
            tryCall(body, state)
        when "⍳" # Repeat N times ( ..a n ( ..a i -- ..a ) -- ..a )
          [n, body] = state.pop(2)
          for i in [0..n-1] by 1
            state.push(i)
            tryCall(body, state)
        when "$" # Call ( ..a ( ..a -- ..b ) -- ..b )
          fn = state.pop()
          tryCall(fn, state)
        ### HIGHER ORDER FUNCTIONS ###
        when "●" # Curry ( ..a x ( ..a x -- ..b ) -- ( ..a -- ..b ) )
          Op.op state, this,
            function: (x, f) -> new CurriedFunction(x, f)
            extension: Op.binaryRight
            scalarExtend: false
            defaultModifier: 1
            modifierAdjustment: (x) -> x + 1
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
        when "⇉" # "Spread" combinator, in Factor parlance
          # See StackOp.spread for details.
          StackOp.spread this, state
        when "⤨" # "Cross" combinator
          # See StackOp.cross for details
          StackOp.cross this, state
        when "↘" # "Cleave" combinator
          # See StackOp.cleave for details
          StackOp.cleave this, state
        when "↗" # "Apply" combinator
          # See StackOp.apply for details
          StackOp.apply this, state
        else
          throw new Error.UnknownCommandError(@token)

  toString: () ->
    @token.toString() + @modifiers.join("")

export class AssignToVar extends AST

  constructor: (@target) -> super()

  eval: (state) ->
    state.setGlobal @target, state.pop()

  toString: () ->
    "→" + @target

export class ReadFromVar extends AST

  constructor: (@target) -> super()

  eval: (state) ->
    state.push state.getGlobal(@target)

  toString: () ->
    "←" + @target

export class StringLit extends AST

  constructor: (@text) -> super()

  eval: (state) -> state.push(this)

  toString: () ->
    escapeString @text

export class FunctionLit extends AST

  constructor: (@body) -> super()

  eval: (state) -> state.push(this)

  call: (state) ->
    state.eval(@body)

  toString: () ->
    "[ #{@body.join(" ")} ]#{@modifiers.join("")}"

export class CurriedFunction extends AST

  constructor: (@arg, @function) -> super()

  eval: (state) -> state.push(this)

  call: (state) ->
    state.push(@arg)
    tryCall(@function, state)

  toString: () ->
    # toString "lies" a bit, in that it prints as a FunctionLit
    # quotation. If you try to read this representation back in, you
    # will get a FunctionLit, not a CurriedFunction. But it's accurate
    # enough for most purposes.
    "[ #{@arg} #{@function} $ ]#{@modifiers.join("")}"

# Types
# "{" - Array start
# "⚐" - Empty fold argument
# "ε" - Null value
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

export equals = (a, b) ->
  return true if a == b
  if a instanceof SentinelValue and b instanceof SentinelValue
    return true if a.type == b.type
  if a instanceof ArrayLit and b instanceof ArrayLit
    return true if arrayEq(a.data, b.data, equals)
  false

export isTruthy = (c) ->
  (typeof(c) != 'number') or (c != 0)
