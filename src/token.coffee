
export class Token
  constructor: (@text) ->

  tokenType: () ->
    if typeof(@text) == 'number'
      TokenType.Number
    else
      TokenType.Command

  toString: ->
    @text.toString()

export TokenType =
  Number: "TokenType.Number"
  Command: "TokenType.Command"
