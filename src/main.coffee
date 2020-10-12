
import { tokenize, parse } from './parser.js'
import { Evaluator } from './eval.js'
import { Error } from './error.js'
import { FunctionLit } from './ast.js'

export class InteractiveEvaluator extends Evaluator

  print: (value) ->
    document.querySelector("#output").innerText += value.toString() + "\n"

export run = ->
  text = document.querySelector("#code").value
  evaluator = new InteractiveEvaluator()
  try
    tokens = tokenize text
    parsed = parse tokens
    document.querySelector("#output").innerText = ""
    document.querySelector("#stack").innerText = ""
    evaluator.pushCall new FunctionLit(parsed)
    evaluator.eval parsed
    evaluator.popCall()
  catch e
    if e instanceof Error
      document.querySelector("#output").innerText += "\n\n" + e.toString() + "\n"
    else
      throw e
  document.querySelector("#stack").innerText = evaluator.stackToString()
