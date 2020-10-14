
import { spliceStr } from './util.js'

export class InputManager

  constructor: () ->
    @element = null
    @handler = null
    @translations = compileTranslationTable DEFAULT_TRANSLATION_TABLE
    @currentTranslation = null
    @currentString = ""
    @currentPosition = 0

  register: (element) ->
    if @element?
      this.unregister()
    @element = element
    @handler = (event) => this.onInput(event)
    element.addEventListener('input', @handler)

  unregister: () ->
    if @element?
      @element.removeEventListener('input', @handler)
      @element = null
      @handler = null

  onInput: (event) ->
    if event.inputType == "insertText"
      resolution = 0
      tryToResolve = =>
        return if resolution > 2
        resolution += 1
        if @currentTranslation == null
          @currentTranslation = @translations
          @currentPosition = event.target.selectionStart - 1
        next = @currentTranslation[event.data]
        @currentString += event.data
        switch
          when @currentPosition != event.target.selectionStart - 1
            @currentTranslation = null
            @currentString = ""
            tryToResolve()
          when typeof(next) == 'object'
            if next[END]?
              term = next[END]
              @currentPosition = event.target.selectionStart
              event.target.value =
                spliceStr(event.target.value, term, @currentPosition - @currentString.length, @currentPosition)
              event.target.selectionStart = @currentPosition - @currentString.length + term.length
              event.target.selectionEnd = event.target.selectionStart
              @currentString = term
            @currentTranslation = next
          else
            @currentTranslation = null
            @currentString = ""
            tryToResolve()
        @currentPosition = event.target.selectionStart
      tryToResolve()
    else
      # In any other case, cancel the current translation
      @currentTranslation = null
      @currentString = ""

export END = Symbol("END")

export compileTranslationTable = (table) ->
  result = {}
  for k, v of table
    curr = result
    for ch in k
      curr[ch] ?= {}
      curr = curr[ch]
    curr[ END ] = v
  result

export DEFAULT_TRANSLATION_TABLE =
  "\\o": "ø"
  ".-": "×"
  "\\times": "×"
  "\\x": "×"
  ".=": "÷"
  "\\div": "÷"
  "\\division": "÷"
  ".0": "∧"
  "\\and": "∧"
  "\\wedge": "∧"
  ".9": "∨"
  "\\or": "∨"
  "\\vee": "∨"
  "\\o+": "⊕"
  "\\oplus": "⊕"
  ".7": "<"
  ".3": ">"
  ".4": "≤"
  "\\le": "≤"
  "\\leq": "≤"
  ".6": "≥"
  "\\ge": "≥"
  "\\geq": "≥"
  ".8": "≠"
  "\\ne": "≠"
  "\\neq": "≠"
  "._": "≡"
  "\\equiv": "≡"
  "\\eq": "≡"
  "\\==": "≡"
  "\\fw": "⚐"
  "\\epsilon": "ε"
  "\\Ge": "ε"
  "\\fb": "⚑"
  ".i": "⍳"
  "\\iota": "⍳"
  "\\Gi": "⍳"
  ".[": "←"
  "\\<-": "←"
  "\\leftarrow": "←"
  "\\l-": "←"
  "\\l": "←"
  ".]": "→"
  "\\->": "→"
  "\\rightarrow": "→"
  "\\r-": "→"
  "\\r": "→"
  "\\to": "→"
  "./": "⌿"
  "\\flqq": "«"
  "\\\"<": "«"
  "\\frqq": "»"
  "\\\">": "»"
