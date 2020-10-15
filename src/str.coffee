
import { StrEncodingError } from './error.js'

# I want random access to individual "characters" in a string without
# worrying about UTF-16 encoding issues. This class takes a string and
# converts it to an array of individual characters, so we can get that
# behavior.
export default class Str

  constructor: (@data) ->

  @fromString: (text) ->
    data = []
    i = 0
    while i < text.length
      if text[i].charCodeAt(0) & 0xD800
        # High surrogate
        i += 1
        if i >= text.length or not (text[i].charCodeAt(0) & 0xDC00)
          throw new StrEncodingError(text)
        data.push(text.slice(i - 1, i + 1))
      else
        data.push(text[i])
      i += 1
    new Str(data)

  toString: () ->
    @data.join('')

  charAt: (n) ->
    @data[n]

  codePointAt: (n) ->
    @data[n].codePointAt(0)

  concat: (that) ->
    new Str(this.data.concat(that.data))

  @fromCodePoint: (codepoint) ->
    new Str(String.fromCodePoint(codepoint))

Object.defineProperty Str.prototype, 'length',
  get: -> @data.length
