
import * as Error from './error.js'
import { stringify } from './pretty.js'
import * as Modifier from './modifier.js'
import * as TypeCheck from './type_check.js'
import * as Op from './op.js'
import * as ListOp from './list_op.js'
import * as StackOp from './stack_op.js'
import { arrayEq, gcd, lcm } from './util.js'
import { Token, TokenType, escapeString } from './token.js'
import Str from './str.js'
import { equals, compare, Ordering, defaultLT, customLT } from './comparison.js'
import * as SuperSub from './super_sub.js'

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

  getPrimeMod: () ->
    n = 0
    for mod from @modifiers
      if mod instanceof Modifier.PrimeModifier
        n += 1
    n

export class SimpleCmd extends AST

  constructor: (@token) -> super()

  isNumberLit: () ->
    @token.tokenType() == TokenType.Number

  isStringLit: () ->
    @token.tokenType() == TokenType.String

  eval: (state) ->
    if this.isNumberLit()
      state.push new NumberLit(@token.text)
    else if this.isStringLit()
      state.push new StringLit(@token.text)
    else
      switch @token.text.toString()
        ### IO ###
        when '.' # Pretty print ( x -- )
          state.print stringify(state.pop());
        when ',' # Read integer from input
          state.push readAndParseInt(state)
        when '📜' # Read character from input
          char = state.readInput()
          if char?
            state.push(new StringLit(char))
          else
            state.push(SentinelValue.null)
        when '📖' # Read line from input
          result = ""
          loop
            curr = state.readInput()
            break if curr == undefined
            result += curr
            break if curr == '\n'
          if result != ""
            state.push(new StringLit(result))
          else
            state.push(SentinelValue.null)
        when "📚" # Read all remaining from input
          result = ""
          loop
            curr = state.readInput()
            break if curr == undefined
            result += curr
          if result != ""
            state.push(new StringLit(result))
          else
            state.push(SentinelValue.null)
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
        when '@' # Swap/Rotate ( x y -- y x )
                 # (Numerical modifier determines how deep to lift)
          mod = this.getNumMod(1)
          store = state.pop(mod)
          lift = state.pop()
          state.push(store...)
          state.push(lift)
        when 'ø' # Over ( x y -- x y x )
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
            function: (a, b) -> new NumberLit(a.value + b.value)
            preProcess: TypeCheck.isNumber
            zero: 0
            extension: Op.binary
            scalarExtend: true
        when '-' # Subtract ( x y -- z )
          Op.op state, this,
            function: (a, b) -> new NumberLit(a.value - b.value)
            preProcess: TypeCheck.isNumber
            one: (a) -> new NumberLit(- a.value)
            extension: Op.binary
            scalarExtend: true
        when '×' # Multiply ( x y -- z )
          Op.op state, this,
            function: (a, b) -> new NumberLit(a.value * b.value)
            preProcess: TypeCheck.isNumber
            zero: 1
            extension: Op.binary
            scalarExtend: true
        when '÷' # Divide ( x y -- z )
          Op.op state, this,
            function: (a, b) -> new NumberLit(a.value / b.value)
            preProcess: TypeCheck.isNumber
            one: (a) -> new NumberLit(1 / a.value)
            extension: Op.binary
            scalarExtend: true
        when '*' # Power ( x y -- z )
          Op.op state, this,
            function: (a, b) -> new NumberLit(a.value ** b.value)
            preProcess: TypeCheck.isNumber
            zero: 1
            extension: Op.binaryRight
            scalarExtend: true
        when 'ê' # e^x ( x -- y )
          state.push Op.scalarExtendUnary((x) -> Math.exp TypeCheck.isNumber(x).value)(state.pop())
        when '🌳' # ln(x) ( x -- y )
          # With prime modifier, it's log_b(a) ( a b -- y )
          if this.getPrimeMod() > 0
            Op.op state, this,
              function: (a, b) -> new NumberLit(Math.log(a.value) / Math.log(b.value))
              preProcess: TypeCheck.isNumber
              extension: Op.binary
              scalarExtend: true
          else
            state.push Op.scalarExtendUnary((x) -> Math.log TypeCheck.isNumber(x).value)(state.pop())
        when '√' # sqrt(x) ( x -- y )
          # With prime modifier, it's (a ** (1/b)) ( a b -- y )
          if this.getPrimeMod() > 0
            Op.op state, this,
              function: (a, b) -> new NumberLit(a.value ** (1 / b.value))
              preProcess: TypeCheck.isNumber
              extension: Op.binary
              scalarExtend: true
          else
            state.push Op.scalarExtendUnary((x) -> Math.sqrt TypeCheck.isNumber(x).value)(state.pop())
        when '|' # Remainder ( x y -- z )
          # This does not extend with modifier; it only scalar extends
          Op.op state, this,
            function: (a, b) -> new NumberLit((a.value % b.value + b.value) % b.value) # "True" mod
            preProcess: TypeCheck.isNumber
            scalarExtend: true
        when '⩑' # LCM ( x y -- z )
          Op.op state, this,
            function: (a, b) -> new NumberLit(lcm(a.value, b.value))
            preProcess: TypeCheck.isNumber
            zero: 1
            extension: Op.binary
            scalarExtend: true
        when '⩒' # GCD ( x y -- z )
          Op.op state, this,
            function: (a, b) -> new NumberLit(gcd(a.value, b.value))
            preProcess: TypeCheck.isNumber
            zero: 0
            extension: Op.binary
            scalarExtend: true
        when '_' # Negate ( x -- y )
          state.push Op.scalarExtendUnary((x) -> - TypeCheck.isNumber(x).value)(state.pop())
        when '⅟' # Reciprocal ( x -- y )
          state.push Op.scalarExtendUnary((x) -> 1 / TypeCheck.isNumber(x).value)(state.pop())
        when '⌉' # Ceiling ( x -- y )
          state.push Op.scalarExtendUnary((x) -> Math.ceil TypeCheck.isNumber(x).value)(state.pop())
        when '⌋' # Floor ( x -- y )
          state.push Op.scalarExtendUnary((x) -> Math.floor TypeCheck.isNumber(x).value)(state.pop())
        when 'A' # Absolute value ( x -- y )
          state.push Op.scalarExtendUnary((x) -> Math.abs TypeCheck.isNumber(x).value)(state.pop())
        when 'a' # Signum ( x -- y )
          state.push Op.scalarExtendUnary((x) -> Math.sign TypeCheck.isNumber(x).value)(state.pop())
        when '∧' # Bitwise Conjunction ( x y -- z )
          Op.op state, this,
            function: (a, b) -> a.value & b.value
            preProcess: TypeCheck.isNumber
            zero: -1
            extension: Op.binary
            scalarExtend: true
        when '∨' # Bitwise Disjunction ( x y -- z )
          Op.op state, this,
            function: (a, b) -> a.value | b.value
            preProcess: TypeCheck.isNumber
            zero: 0
            extension: Op.binary
            scalarExtend: true
        when '⊕' # Bitwise Exclusive Or ( x y -- z )
          Op.op state, this,
            function: (a, b) -> a.value ^ b.value
            preProcess: TypeCheck.isNumber
            zero: 0
            extension: Op.binary
            scalarExtend: true
        when '¬' # Bitwise Negate ( x -- y )
          state.push Op.scalarExtendUnary((x) -> ~ TypeCheck.isNumber(x).value)(state.pop())
        when '¿' # Defined-or ( x y -- z )
          # Returns the first argument unless it's ε, in which
          # case it returns the second.
          Op.op state, this,
            function: (a, b) -> if equals(a, SentinelValue.null) then b else a
            zero: SentinelValue.null
            extension: Op.binary
            scalarExtend: false
        ### TRIGONOMETRY ###
        when '◐'
          state.push Op.scalarExtendUnary((x) -> Math.sin TypeCheck.isNumber(x).value)(state.pop())
        when '◑'
          state.push Op.scalarExtendUnary((x) -> Math.asin TypeCheck.isNumber(x).value)(state.pop())
        when '◒'
          state.push Op.scalarExtendUnary((x) -> Math.cos TypeCheck.isNumber(x).value)(state.pop())
        when '◓'
          state.push Op.scalarExtendUnary((x) -> Math.acos TypeCheck.isNumber(x).value)(state.pop())
        when '◔'
          state.push Op.scalarExtendUnary((x) -> Math.tan TypeCheck.isNumber(x).value)(state.pop())
        when '◕'
          state.push Op.scalarExtendUnary((x) -> Math.atan TypeCheck.isNumber(x).value)(state.pop())
        when '◖'
          state.push Op.scalarExtendUnary((x) -> Math.sinh TypeCheck.isNumber(x).value)(state.pop())
        when '◗'
          state.push Op.scalarExtendUnary((x) -> Math.asinh TypeCheck.isNumber(x).value)(state.pop())
        when '◌'
          state.push Op.scalarExtendUnary((x) -> Math.cosh TypeCheck.isNumber(x).value)(state.pop())
        when '◍'
          state.push Op.scalarExtendUnary((x) -> Math.acosh TypeCheck.isNumber(x).value)(state.pop())
        when '◎'
          state.push Op.scalarExtendUnary((x) -> Math.tanh TypeCheck.isNumber(x).value)(state.pop())
        when '◉'
          state.push Op.scalarExtendUnary((x) -> Math.atanh TypeCheck.isNumber(x).value)(state.pop())
        ### NUMERICAL CONSTANTS ###
        when 'π'
          state.push Math.PI
        when 'τ'
          state.push 2 * Math.PI
        when 'e'
          state.push Math.E
        when '¼'
          state.push 1 / 4
        when '½'
          state.push 1 / 2
        when '¾'
          state.push 3 / 4
        when '⅐'
          state.push 1 / 7
        when '⅑'
          state.push 1 / 9
        when '⅒'
          state.push 1 / 10
        when '⅓'
          state.push 1 / 3
        when '⅔'
          state.push 2 / 3
        when '⅕'
          state.push 1 / 5
        when '⅖'
          state.push 2 / 5
        when '⅗'
          state.push 3 / 5
        when '⅘'
          state.push 4 / 5
        when '⅙'
          state.push 1 / 6
        when '⅚'
          state.push 5 / 6
        when '⅛'
          state.push 1 / 8
        when '⅜'
          state.push 3 / 8
        when '⅝'
          state.push 5 / 8
        when '⅞'
          state.push 7 / 8
        when '↉'
          state.push 0 / 3
        ### STRING OPERATIONS ###
        when '⋄' # Concatenate ( x y -- z )
                 # (Numerical modifier determines arity)
          # No scalar extension. Works on lists and on strings.
          Op.op state, this,
            function: catenate
            preProcess: TypeCheck.isStringOrList
            zero: new StringLit("")
            extension: Op.binary
            scalarExtend: false
        when '💬' # Chr / Ord ( x -- y )
          arg = state.pop()
          arg = new ArrayLit([arg]) if typeof(arg) == 'number'
          switch
            when arg instanceof ArrayLit
              res = new Str(String.fromCodePoint(c.value) for c in arg.data)
              state.push new StringLit(res)
            when arg instanceof StringLit
              res = (new NumberLit(arg.text.codePointAt(i)) for i in [0..arg.text.length-1])
              state.push new ArrayLit(res)
            else
              throw new Error.TypeError("string or list", arg)
        when '🍴' # Chomp ( x -- y )
          # Removes the last character if it's a newline. Subject to scalar extension.
          chomp = (x) ->
            x = x.text
            result = if x.charAt(x.length - 1) == '\n'
              Str.fromString(x.toString().slice(0, x.length - 1))
            else
              x
            new StringLit(result)
          state.push Op.scalarExtendUnary((x) -> chomp(TypeCheck.isString(x)))(state.pop())
        when 'r' # Mark as regexp ( s -- s )
          s = state.pop()
          TypeCheck.isString(s)
          state.push new StringLit(s.text).markAsRegexp()
        when '¶' # Split string ( s delim -- arr )
          # Delimiter can be either string or regexp
          [s, delim] = state.pop(2)
          TypeCheck.isString(delim)
          delim = delim.toReOrStr()
          if delim == ""
            # Awkward hack for UTF-16 support (we don't want to pass
            # empty string to split function)
            delim = new RegExp("", "u")
          TypeCheck.isString(s)
          result = s.text.toString().split(delim).map((x) -> new StringLit(Str.fromString(x)))
          state.push new ArrayLit(result)
        when '⁋' # Join string ( arr delim -- s )
          # Delimiter should be a string. Other argument should be list of strings.
          [arr, delim] = state.pop(2)
          TypeCheck.isList(arr)
          delim = stringify(delim)
          result = new StringLit(arr.data.map(stringify).join(delim))
          state.push(result)
        when 'p' # Prettify ( x -- s )
          # Converts the value to a string. No-op if given a string.
          x = state.pop()
          state.push new StringLit(stringify x)
        ### COMPARISONS ###
        when '=' # Equal ( x y -- ? )
          Op.op state, this,
            function: (a, b) -> equals(a, b)
            postProcess: Op.boolToInt
            zero: -1
            extension: Op.merge (a, b) -> a & b
            scalarExtend: true
            whiteFlag: Op.WhiteFlag.ignore
        when '<' # LT ( x y -- ? )
          Op.op state, this,
            function: (a, b) -> compare(a, b) == Ordering.LT
            postProcess: Op.boolToInt
            zero: -1
            extension: Op.merge (a, b) -> a & b
            scalarExtend: true
            whiteFlag: Op.WhiteFlag.ignore
        when '>' # GT ( x y -- ? )
          Op.op state, this,
            function: (a, b) -> compare(a, b) == Ordering.GT
            postProcess: Op.boolToInt
            zero: -1
            extension: Op.merge (a, b) -> a & b
            scalarExtend: true
            whiteFlag: Op.WhiteFlag.ignore
        when '≤' # LE ( x y -- ? )
          Op.op state, this,
            function: (a, b) -> compare(a, b) != Ordering.GT
            postProcess: Op.boolToInt
            zero: -1
            extension: Op.merge (a, b) -> a & b
            scalarExtend: true
            whiteFlag: Op.WhiteFlag.ignore
        when '≥' # GE ( x y -- ? )
          Op.op state, this,
            function: (a, b) -> compare(a, b) != Ordering.LT
            postProcess: Op.boolToInt
            zero: -1
            extension: Op.merge (a, b) -> a & b
            scalarExtend: true
            whiteFlag: Op.WhiteFlag.ignore
        when '≠' # Not Equal ( x y -- ? )
          Op.op state, this,
            function: (a, b) -> not equals(a, b)
            postProcess: Op.boolToInt
            zero: -1
            extension: Op.merge (a, b) -> a & b
            scalarExtend: true
            whiteFlag: Op.WhiteFlag.ignore
        when '≡' # Same ( x y -- ? )
          # Note: No scalar extension
          Op.op state, this,
            function: (a, b) -> equals(a, b)
            postProcess: Op.boolToInt
            zero: -1
            extension: Op.merge (a, b) -> a & b
            scalarExtend: false
            whiteFlag: Op.WhiteFlag.ignore
        when '≢' # Not Same ( x y -- ? )
          # Note: No scalar extension
          Op.op state, this,
            function: (a, b) -> not equals(a, b)
            postProcess: Op.boolToInt
            zero: -1
            extension: Op.merge (a, b) -> a & b
            scalarExtend: false
            whiteFlag: Op.WhiteFlag.ignore
        when '⌈' # Max
          # With prime, pops a function and uses it instead of
          # default less-than.
          func = if this.getPrimeMod() > 0
            customLT(state, state.pop())
          else
            defaultLT
          Op.op state, this,
            function: (a, b) -> if func(b, a) then a else b
            zero: -Infinity
            extension: Op.binary
            scalarExtend: true
        when '⌊' # Min
          # With prime, pops a function and uses it instead of
          # default less-than.
          func = if this.getPrimeMod() > 0
            customLT(state, state.pop())
          else
            defaultLT
          Op.op state, this,
            function: (a, b) -> if func(a, b) then a else b
            zero: Infinity
            extension: Op.binary
            scalarExtend: true
        ### METAPROGRAMMING ###
        when 's' # Get stack frame
                 # (Numerical argument determines how deep to go; n=0 is current)
          mod = this.getNumMod(0)
          frame = state.getFromCallStack(mod)
          state.push(frame)
        when '{', '⚐', 'ε' # Sentinel value
          state.push(new SentinelValue(@token.text))
        when '⚑' # Construct ⚐ sentinel ( fn deffn -- fn )
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
        when '}' # End array (pops until sentinel value is hit)
          arr = []
          value = state.pop()
          until equals(value, SentinelValue.arrayStart)
            arr.push(value)
            value = state.pop()
          state.push(new ArrayLit(arr.reverse()))
        ### LIST OPERATIONS ###
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
          TypeCheck.isList(list)
          if list.length <= 0
            state.push(SentinelValue.whiteFlag)
            tryCall(func, state)
          else
            acc = list.data[0]
            state.push(acc)
            for i in [1..list.length-1] by 1
              state.push(list.data[i])
              tryCall(func, state)
        when '\\' # Scan ( ..a list ( ..a x y -- ..b z ) -- ..b t )
          # This works just like fold (/) except that it returns a
          # list of all the intermediate results. The ⚐ caveat does
          # not apply, for if the empty list is given as input, then
          # the empty list is produced as output.
          [list, func] = state.pop(2)
          TypeCheck.isList(list)
          if list.length <= 0
            state.push(new ArrayLit([]))
          else
            acc = list.data[0]
            state.push(acc)
            result = []
            for i in [1..list.length-1] by 1
              result.push state.peek()
              state.push list.data[i]
              tryCall(func, state)
            result.push state.pop()
            state.push new ArrayLit(result)
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
        when 'ė' # Each ( ..a list ( ..a x -- ..a ) -- ..a )
          # Nests arbitrarily deep with a numerical argument, like
          # filter. See ListOp.each for full details.
          ListOp.each this, state
        when 'n' # Nested Query ( list index -- result )
          # Works on lists or strings. See ListOp.nestedQuery
          # for details.
          ListOp.nestedQuery this, state
        when '⊇' # Select ( list index -- result )
          # Works on lists or strings. See ListOp.select
          # for details.
          ListOp.select this, state
        when '⍋' # Grade Up
          # Sorting function. See ListOp.gradeUp for full details.
          ListOp.gradeUp this, state
        when '⍪' # Ravel / Flatten
          # Flattens lists. See ListOp.ravel for full details.
          ListOp.ravel this, state
        when '⊗' # Outer Product
          # Outer product of lists under some operation. See ListOp.outerProduct.
          ListOp.outerProduct this, state
        when '∷' # Prepend / Append
          if this.getPrimeMod() == 0
            # With no prime, prepends some number of elements to a list
            Op.op state, this,
              function: (x, list) -> new ArrayLit([x].concat(TypeCheck.isList(list).data))
              extension: Op.binaryRight
              scalarExtend: false
              defaultModifier: 1
              modifierAdjustment: (x) -> x + 1
          else
            # With prime, appends some number of elements to a list
            Op.op state, this,
              function: (x, list) -> new ArrayLit(TypeCheck.isList(list).data.concat([x]))
              extension: Op.binaryRight
              scalarExtend: false
              defaultModifier: 1
              modifierAdjustment: (x) -> x + 1
        when '⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'
          state.push(ListOp.nth(state.pop(), SuperSub.toNumber(@token.text)) ? SentinelValue.null)
        when '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'
          state.push(ListOp.nth(state.pop(), -SuperSub.toNumber(@token.text)) ? SentinelValue.null)
        when '∈' # Member ( list x -- idx )
          # List membership. See ListOp.member for details
          ListOp.member this, state
        when '#' # Length ( list -- n )
          # List length. See ListOp.length for details
          ListOp.length this, state
        when '🗋' # Empty ( list -- ? )
          # With prime modifier, flattens before checking
          if this.getPrimeMod() > 0
            newTerm = new SimpleCmd(new Token('⍪'))
            newTerm.modifiers.push(new Modifier.NumModifier(Modifier.MAX_NUM_MODIFIER))
            ListOp.ravel(newTerm, state)
          list = state.pop()
          TypeCheck.isList(list)
          state.push Op.boolToInt(list.length == 0)
        when 'ℓ' # List constructor
          # Takes as many arguments as numerical modifier (default=1) specifies
          num = this.getNumMod(1)
          arr = new ArrayLit(state.pop(num))
          state.push arr
        when '◁' # Take (left) ( list n -- list )
          [list, n] = state.pop(2)
          TypeCheck.isList(list)
          TypeCheck.isNumber(n)
          n = Math.abs(n.value)
          state.push new ArrayLit(list.data.slice(0, n))
        when '▷' # Take (right) ( list n -- list )
          [list, n] = state.pop(2)
          TypeCheck.isList(list)
          TypeCheck.isNumber(n)
          n = Math.abs(n.value)
          state.push new ArrayLit(list.data.slice(- n))
        when '⧏' # Drop (left) ( list n -- list )
          [list, n] = state.pop(2)
          TypeCheck.isList(list)
          TypeCheck.isNumber(n)
          n = Math.abs(n.value)
          state.push new ArrayLit(list.data.slice(n))
        when '⧐' # Drop (right) ( list n -- list )
          [list, n] = state.pop(2)
          TypeCheck.isList(list)
          TypeCheck.isNumber(n)
          n = Math.abs(n.value)
          state.push new ArrayLit(list.data.slice(0, - n))
        when '◂' # Take while (left) ( list f -- list )
          [list, f] = state.pop(2)
          TypeCheck.isList(list)
          result = []
          for elem in list.data
            state.push(elem)
            tryCall(f, state)
            curr = isTruthy state.pop()
            break unless curr
            result.push elem
          state.push new ArrayLit(result)
        when '▸' # Take while (right) ( list f -- list )
          [list, f] = state.pop(2)
          TypeCheck.isList(list)
          result = []
          for elem in list.data.slice().reverse()
            state.push(elem)
            tryCall(f, state)
            curr = isTruthy state.pop()
            break unless curr
            result.push elem
          state.push new ArrayLit(result.reverse())
        when '◄' # Drop while (left) ( list f -- list )
          [list, f] = state.pop(2)
          TypeCheck.isList(list)
          for elem, i in list.data
            state.push(elem)
            tryCall(f, state)
            curr = isTruthy state.pop()
            break unless curr
          state.push new ArrayLit(list.data.slice(i))
        when '►' # Drop while (right) ( list f -- list )
          [list, f] = state.pop(2)
          TypeCheck.isList(list)
          for elem, i in list.data.slice().reverse()
            state.push(elem)
            tryCall(f, state)
            curr = isTruthy state.pop()
            break unless curr
          state.push new ArrayLit(list.data.slice(0, list.length - i))
        when 'ɹ' # Reverse ( list -- list )
          list = state.pop()
          TypeCheck.isStringOrList(list)
          if list instanceof ArrayLit
            state.push new ArrayLit(list.data.slice().reverse())
          else
            state.push new StringLit(new Str(list.text.data.slice().reverse()))
        when '⍴' # Reshape ( list shape -- list )
          # See ListOp.reshape
          ListOp.reshape this, state
        ### CONTROL FLOW ###
        when 'i' # If ( ..a ? ( ..a -- ..b ) ( ..a -- ..b ) -- ..b )
          [c, t, f] = state.pop(3)
          if isTruthy(c)
            tryCall(t, state)
          else
            tryCall(f, state)
        when 'w' # While ( ..a ( ..a -- ..b ? ) ( ..b -- ..a ) -- ..b )
          [cond, body] = state.pop(2)
          loop
            tryCall(cond, state)
            result = state.pop()
            break unless isTruthy(result)
            tryCall(body, state)
        when 'W' # While ( ..a ( ..a -- ..a ? ) -- ..b )
          # Like w but with no explicit body.
          cond = state.pop()
          loop
            tryCall(cond, state)
            result = state.pop()
            break unless isTruthy(result)
        when '⍳' # Repeat N times ( ..a n ( ..a i -- ..a ) -- ..a )
          [n, body] = state.pop(2)
          for i in [0..n-1] by 1
            state.push(i)
            tryCall(body, state)
        when '⍸' # Repeat N times and accumulate ( ..a x n ( ..a x i -- ..a x ) -- ..a list )
          [n, body] = state.pop(2)
          result = [state.peek()]
          for i in [0..n-1] by 1
            state.push(i)
            tryCall(body, state)
            result.push(state.peek())
          state.pop()
          state.push new ArrayLit(result)
        when '$' # Call ( ..a ( ..a -- ..b ) -- ..b )
          fn = state.pop()
          tryCall(fn, state)
        when '😱' # Panic and throw error ( err -- )
          throw new Error.UserError(state.pop())
        when '🙏' # Catch errors ( ..a ( ..a -- ..b) ( ..a err -- ..b ) -- ..b )
          [tryBlock, recoverBlock] = state.pop(2)
          savedStack = state.saveStack()
          try
            # TODO Don't piggyback on JS error handling; implement it in our VM
            tryCall(tryBlock, state)
          catch exc
            if exc instanceof Error.Error
              state.loadStack(savedStack)
              state.push new StringLit(Str.fromString(exc.toString())) # TODO Store the exception in the string so if we re-throw it, we get the original exception back
              tryCall(recoverBlock, state)
            else
              throw exc
        ### HIGHER ORDER FUNCTIONS ###
        when 'ī' # Push identity function
          state.push(new FunctionLit([]))
        when 'c' # Make constant function ( x -- ( -- x ) )
          # Numerical argument (defaults to zero) determines number to
          # pop in resulting function.
          num = this.getNumMod(0)
          x = state.pop()
          dropCmd = new SimpleCmd(new Token("%"))
          dropCmd.modifiers.push(new Modifier.NumModifier(num))
          dropper = new FunctionLit([dropCmd])
          state.push(new ComposedFunction(dropper, new CurriedFunction(x, new FunctionLit([]))))
        when '●' # Curry ( x ( ..a x -- ..b ) -- ( ..a -- ..b ) )
          Op.op state, this,
            function: (x, f) -> new CurriedFunction(x, f)
            extension: Op.binaryRight
            scalarExtend: false
            defaultModifier: 1
            modifierAdjustment: (x) -> x + 1
        when '○' # Compose ( ( ..a -- ..b ) ( ..b -- ..c ) -- ( ..a -- ..c ) )
          Op.op state, this,
            function: (f, g) -> new ComposedFunction(f, g)
            extension: Op.binaryRight
            scalarExtend: false
            zero: () -> new FunctionLit([])
            defaultModifier: 2
        ### BOXING / UNBOXING ###
        when '⊂' # Box ( x -- box )
          value = state.pop()
          state.push new Box(value)
        when '⊃' # Unbox ( box -- x )
          # No effect if value is not boxed
          value = state.pop()
          state.push(if value instanceof Box then value.value else value)
        ### STACK COMBINATORS ###
        when 'D' # Dip ( ..a x ( ..a -- ..b ) -- ..b x )
                 # (Numerical modifier determines arity)
          mod = this.getNumMod(1)
          fn = state.pop()
          preserve = state.pop(mod)
          tryCall(fn, state)
          state.push(preserve...)
        when 'K' # Keep ( ..a x ( ..a x -- ..b ) -- ..b x )
                 # (Numerical modifier determines arity)
          mod = this.getNumMod(1)
          fn = state.pop()
          preserve = state.peek(mod)
          tryCall(fn, state)
          state.push(preserve...)
        when '⇉' # "Spread" combinator, in Factor parlance
          # See StackOp.spread for details.
          StackOp.spread this, state
        when '⤨' # "Cross" combinator
          # See StackOp.cross for details
          StackOp.cross this, state
        when '↘' # "Apply" combinator
          # See StackOp.cleave for details
          StackOp.apply this, state
        when '↗' # "Cleave" combinator
          # See StackOp.apply for details
          StackOp.cleave this, state
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

  constructor: (@text) ->
    super()
    @text = Str.fromString(@text) if typeof(@text) == 'string'
    @regexp = false

  markAsRegexp: () ->
    @regexp = true
    this

  isRegexp: () ->
    @regexp

  eval: (state) -> state.push(this)

  toReOrStr: () ->
    if this.isRegexp()
      new RegExp(this.text.toString(), "u")
    else
      this.text.toString()

  toString: () ->
    escapeString(@text) + if this.isRegexp() then "r" else ""

export class NumberLit extends AST

  constructor: (@value) -> super()

  eval: (state) -> state.push(this)

  toString: () ->
    if @value == Infinity
      "∞"
    else if @value == -Infinity
      "-∞"
    else if @value != @value # NaN >.<
      "👿"
    else
      @value.toString()

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

export class ComposedFunction extends AST

  constructor: (@first, @second) -> super()

  eval: (state) -> state.push(this)

  call: (state) ->
    tryCall(@first, state)
    tryCall(@second, state)

  toString: () ->
    # toString "lies" a bit, in that it prints as a FunctionLit
    # quotation. If you try to read this representation back in, you
    # will get a FunctionLit, not a CurriedFunction. But it's accurate
    # enough for most purposes.
    "[ #{@first} $ #{@second} $ ]#{@modifiers.join("")}"

# Types
# "{" - Array start
# "⚐" - Empty fold argument
# "ε" - Null value
export class SentinelValue extends AST

  constructor: (@type) ->
    super()
    @type = Str.fromString(@type) if typeof(@type) == 'string'

  toString: () ->
    @type + @modifiers.join("")

  @null: new SentinelValue("ε")
  @whiteFlag: new SentinelValue("⚐")
  @arrayStart: new SentinelValue("{")

export class Box extends AST

  constructor: (@value) -> super()

  toString: () ->
    "#{@value} ⊂#{@modifiers.join("")}"

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
    try
      result = fn.call(state)
    finally
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
  return SentinelValue.null if state.peekInput() == undefined and valid == false
  throw new Error.InvalidInput() unless valid
  new NumberLit(sign(v))

export isTruthy = (c) ->
  !(c instanceof NumberLit) or (c.value != 0)

export catenate = (a, b) ->
  if a instanceof ArrayLit and b instanceof ArrayLit
    new ArrayLit(a.data.concat(b.data))
  else if a instanceof StringLit and b instanceof StringLit
    new StringLit(a.text.concat(b.text))
  else
    throw new Error.TypeError("arrays or strings", new ArrayLit([a, b]))
