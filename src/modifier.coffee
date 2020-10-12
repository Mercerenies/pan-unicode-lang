
NUMS = "⓪①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳"

export class Modifier

export class NumModifier extends Modifier
  constructor: (@value) ->
    super()

  toString: ->
    NUMS.charAt @value

export toNumModifier = (tok) ->
  result = NUMS.indexOf(tok.text)
  if result >= 0
    new NumModifier(result)
  else
    undefined
