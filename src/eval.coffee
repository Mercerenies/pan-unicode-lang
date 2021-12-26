
import * as AST from './ast.js'
import * as Error from './error.js'
import Str from './str.js'

export class Evaluator

  constructor: () ->
    @stack = []
    @callStack = []
    @globalVars = {}

  eval: (arg) ->
    if Array.isArray(arg)
      this.eval(elem) for elem from arg
    else if arg instanceof AST.AST
      arg.eval this
    else
      throw "Error: Attempt to eval #{arg}, which is invalid!"

  push: (vs...) ->
    for v in vs
      # Wrap any primitives
      v = switch
        when typeof(v) == 'number'
          new AST.NumberLit(v)
        when typeof(v) == 'string' or v instanceof Str
          new AST.StringLit(v)
        else
          v
      @stack.push v

  pop: (n) ->
    if n?
      arr = (this.pop() for i in [0..n-1] by 1)
      arr.reverse()
      arr
    else
      if @stack.length <= 0
        throw new Error.StackUnderflowError()
      else
        @stack.pop()

  peek: (n) ->
    if n?
      if @stack.length < n
        throw new Error.StackUnderflowError()
      else
        @stack.slice(- n)
    else
      if @stack.length <= 0
        throw new Error.StackUnderflowError()
      else
        @stack[@stack.length - 1]

  pushCall: (v) ->
    @callStack.push(v)

  popCall: () ->
    @callStack.pop()

  # n=0 gets the current stack frame. Higher arguments get deeper in
  # the call stack.
  getFromCallStack: (n) ->
    if n >= @callStack.length
      throw new Error.CallStackUnderflowError()
    else
      @callStack[@callStack.length - (n + 1)]

  print: (value) ->
    # Default behavior is to simply print to console. Interactive
    # editor will override this.
    console.log value.toString()

  readInput: () ->
    # Read one character from input. Returns undefined if input is
    # empty.
    undefined

  peekInput: () ->
    # Read one character from input but don't consume.
    undefined

  getGlobal: (k) ->
    @globalVars[k] ? new AST.SentinelValue("ε")

  setGlobal: (k, v) ->
    @globalVars[k] = v

  stackToString: () ->
    @stack.join " "
