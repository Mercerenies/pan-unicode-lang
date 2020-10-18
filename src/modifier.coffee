
NUMS = "⓪①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳"

export class Modifier

export class NumModifier extends Modifier
  constructor: (@value) ->
    super()

  toString: ->
    NUMS.charAt @value

export class PrimeModifier extends Modifier
  toString: -> "′"

export toNumModifier = (tok) ->
  return undefined if tok.text.toString() == ""
  result = NUMS.indexOf(tok.text.toString())
  if result >= 0
    new NumModifier(result)
  else
    undefined

export MAX_NUM_MODIFIER = 20
