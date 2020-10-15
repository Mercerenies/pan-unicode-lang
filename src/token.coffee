
import Str from './str.js'

export class Token
  constructor: (@text, isString) ->
    @text = Str.fromString(@text) if typeof(@text) == 'string'
    # Normalize to Boolean
    @isString = !!isString

  tokenType: () ->
    switch
      when @isString then TokenType.String
      when typeof(@text) == 'number' then TokenType.Number
      else TokenType.Command

  toString: ->
    if @isString
      escapeString(@text)
    else
      @text.toString()

export TokenType =
  Number: "TokenType.Number"
  String: "TokenType.String"
  Command: "TokenType.Command"

export escapeString = (s) ->
  s = s.toString()
  contents = ""
  for ch in s
    if ch == '"'
      contents += '\\"'
    else
      contents += ch
  "\"#{contents}\""

