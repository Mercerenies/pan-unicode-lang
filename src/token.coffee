
export class Token
  constructor: (@text, isString) ->
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
  contents = ""
  for ch in s
    if ch == '"'
      contents += '\\"'
    else
      contents += ch
  "\"#{contents}\""

