
import { tokenize, parse } from './parser.js'
import { Evaluator } from './eval.js'
import { Error } from './error.js'
import { FunctionLit } from './ast.js'
import { InputManager } from './unicode_input.js'
import Str from './str.js'

DEBUG_MODE = false

inputManager = null

export class InteractiveEvaluator extends Evaluator

  constructor: () ->
    super()
    @input = Str.fromString(document.querySelector("#input").value)
    @inputPos = 0

  print: (value) ->
    document.querySelector("#output").innerText += value.toString() + "\n"

  readInput: () ->
    if @inputPos >= @input.length
      undefined
    else
      result = @input.charAt @inputPos
      @inputPos += 1
      result

  peekInput: () ->
    if @inputPos >= @input.length
      undefined
    else
      @input.charAt @inputPos

export run = ->
  text = document.querySelector("#code").value
  evaluator = new InteractiveEvaluator()
  try
    document.querySelector("#output").innerText = ""
    document.querySelector("#stack").innerText = ""
    tokens = tokenize text
    parsed = parse tokens
    evaluator.pushCall new FunctionLit(parsed)
    evaluator.eval parsed
    evaluator.popCall()
  catch e
    if e instanceof Error and not DEBUG_MODE
      document.querySelector("#output").innerText += "\n\n" + e.toString() + "\n"
    else
      throw e
  document.querySelector("#stack").innerText = evaluator.stackToString()

export initInputMgr = ->
  inputManager = new InputManager()
  inputManager.register(document.querySelector("#code"))

