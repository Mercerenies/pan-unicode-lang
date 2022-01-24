
import { Token, TokenType, translateEscape } from './token.js'
import { SimpleCmd, FunctionLit, AssignToVar, ReadFromVar } from './ast.js'
import * as Error from './error.js'
import * as Modifier from './modifier.js'
import Str from './str.js'

# Takes an Str
export tokenize = (str) ->
  str = Str.fromString(str) if typeof(str) == 'string'
  arr = []
  idx = 0
  len = str.length
  while idx < len
    ch = str.charAt idx
    if /\s/.test(ch)
      # Whitespace; skip
      idx += 1
    else if ch == "👿"
      arr.push(new Token(NaN))
      idx += 1
    else if ch == "∞" or (ch == "-" and idx < len - 1 and str.charAt(idx + 1) == "∞")
      if ch == "∞"
        arr.push(new Token(Infinity))
        idx += 1
      else
        arr.push(new Token(-Infinity))
        idx += 2
    else if /[0-9]/.test(ch) or (ch == "-" and idx < len - 1 and /[0-9]/.test(str.charAt(idx + 1)))
      # Number; parse whole number
      num = ch
      idx += 1
      while idx < len and /[0-9]/.test(str.charAt idx)
        num += str.charAt idx
        idx += 1
      arr.push(new Token(parseInt num, 10))
    else if ch == '"'
      # String literal; parse whole string
      idx += 1
      result = ""
      while idx < len and str.charAt(idx) != '"'
        if str.charAt(idx) == '\\'
          idx += 1
          break if idx >= len
          result += translateEscape(str.charAt(idx))
        else
          result += str.charAt(idx)
        idx += 1
      throw new Error.UnexpectedEOF() unless idx < len and str.charAt(idx) == '"'
      arr.push(new Token(result, true))
      idx += 1
    else if ch == '«'
      # Comment; skip until next matching »
      nested = 1
      idx += 1
      while nested > 0
        if idx >= len
          throw new Error.UnexpectedEOF()
        curr = str.charAt idx
        if curr == '«'
          nested += 1
        else if curr == '»'
          nested -= 1
        idx += 1
    else
      # Miscellaneous; push single character
      arr.push(new Token(ch))
      idx += 1
  arr

class Parser
  constructor: (@tokens, @index) ->

  at: () ->
    if this.atEnd()
      undefined
    else
      @tokens[@index]

  parseTermNoMod: () ->
    curr = this.at()
    return undefined unless curr?
    if curr.isString
      @index += 1
      return new SimpleCmd(curr)
    switch curr.text.toString()
      when '['
        @index += 1
        inner = this.parse()
        if not this.at()? or this.at().text.toString() != ']'
          if this.at()?
            throw new Error.UnexpectedParseError(this.at())
          else
            throw new Error.UnexpectedEOF()
        @index += 1
        new FunctionLit(inner)
      when ']'
        undefined
      when '`'
        @index += 1
        inner = this.parseTerm()
        unless inner?
          if this.at()?
            throw new Error.UnexpectedParseError(this.at())
          else
            throw new Error.UnexpectedEOF()
        new FunctionLit([inner])
      when '→'
        @index += 1
        inner = this.at()
        if inner?.tokenType() == TokenType.Command
          @index += 1
          new AssignToVar(inner)
        else if this.at()?
          throw new Error.UnexpectedParseError(this.at())
        else
          throw new Error.UnexpectedEOF()
      when '←'
        @index += 1
        inner = this.at()
        if inner?.tokenType() == TokenType.Command
          @index += 1
          new ReadFromVar(inner)
        else if this.at()?
          throw new Error.UnexpectedParseError(this.at())
        else
          throw new Error.UnexpectedEOF()
      else
        @index += 1
        new SimpleCmd(curr)

  parseTerm: () ->
    result = this.parseTermNoMod()
    return undefined unless result?
    mod = this.tryParseMod()
    while mod?
      result.modifiers.push mod
      mod = this.tryParseMod()
    result

  tryParseMod: () ->
    curr = this.at()
    return undefined unless curr?
    num = Modifier.toNumModifier curr
    if num?
      @index += 1
      num
    else if curr.text.toString() == "′"
      @index += 1
      new Modifier.PrimeModifier()
    else
      undefined

  parse: () ->
    arr = []
    while !this.atEnd()
      next = this.parseTerm()
      break unless next?
      arr.push(next)
    arr

  atEnd: () ->
    @index >= @tokens.length

export parse = (tokens) ->
  parser = new Parser(tokens, 0)
  result = parser.parse()
  unless parser.atEnd()
    throw new Error.UnexpectedParseError(parser.at())
  result
