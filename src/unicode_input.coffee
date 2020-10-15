
import { spliceStr } from './util.js'

export class InputManager

  constructor: () ->
    @element = null
    @handler = null
    @downHandler = null
    @translations = compileTranslationTable DEFAULT_TRANSLATION_TABLE
    @currentTranslation = null
    @currentString = ""
    @currentPosition = 0

  register: (element) ->
    if @element?
      this.unregister()
    @element = element
    @handler = (event) => this.onInput(event)
    @downHandler = (event) => this.onKeyDown(event)
    element.addEventListener('input', @handler)
    element.addEventListener('keypress', @downHandler)
    element.addEventListener('keydown', @downHandler)

  unregister: () ->
    if @element?
      @element.removeEventListener('input', @handler)
      @element.removeEventListener('keypress', @downHandler)
      @element.removeEventListener('keydown', @downHandler)
      @element = null
      @handler = null
      @downHandler = null

  onKeyDown: (event) ->
    if event.isComposing or event.keyCode == 229
      # MDN says to do this :)
      return
    if event.keyCode == 13 and event.shiftKey
      document.querySelector("#run-button").click()
      event.preventDefault()

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
  ".1": "¨"
  "\\\"": "¨"
  "\\\"{}": "¨"
  "\\cib": "●"
  "\\r-2": "⇉"
  "\\rightrightarrows": "⇉"
  "\\r\\/": "⤨"
  "\\r/\\": "⤨"
  "\\udr": "⤨"
  "\\dur": "⤨"
  "\\ur": "↗"
  "\\ur-": "↗"
  "\\nearrow": "↗"
  "\\dr": "↘"
  "\\dr-": "↘"
  "\\searrow": "↘"
  ".`": "⋄"
  "\\dio": "⋄"
  "\\diamond": "⋄"
  "\\\\": "\\"
  "\\flqq": "«"
  "\\\"<": "«"
  "\\frqq": "»"
  "\\\">": "»"
  "\\(0)": "⓪"
  "\\(1)": "①"
  "\\(2)": "②"
  "\\(3)": "③"
  "\\(4)": "④"
  "\\(5)": "⑤"
  "\\(6)": "⑥"
  "\\(7)": "⑦"
  "\\(8)": "⑧"
  "\\(9)": "⑨"
  "\\(10)": "⑩"
  "\\(11)": "⑪"
  "\\(12)": "⑫"
  "\\(13)": "⑬"
  "\\(14)": "⑭"
  "\\(15)": "⑮"
  "\\(16)": "⑯"
  "\\(17)": "⑰"
  "\\(18)": "⑱"
  "\\(19)": "⑲"
  "\\(20)": "⑳"
