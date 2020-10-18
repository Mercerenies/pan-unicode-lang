
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
  "\\.and": "⩑"
  "\\.wedge": "⩑"
  "\\lcm": "⩑"
  "\\.or": "⩒"
  "\\.vee": "⩒"
  "\\gcd": "⩒"
  "\\neg": "¬"
  "\\lnot": "¬"
  "\\o+": "⊕"
  "\\oplus": "⊕"
  "\\ox": "⊗"
  "\\otimes": "⊗"
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
  ".\"": "≢"
  "\\nequiv": "≢"
  "\\eqn": "≢"
  "\\==n": "≢"
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
  "\\filter": "⌿"
  ".1": "¨"
  "\\map": "¨"
  "\\\"": "¨"
  "\\\"{}": "¨"
  ".e": "∈"
  "\\in": "∈"
  "\\member": "∈"
  "\\.e": "ė"
  "\\.{e}": "ė"
  "\\^e": "ê"
  "\\^{e}": "ê"
  "\\tree": "🌳"
  "\\log": "🌳"
  "\\ln": "🌳"
  "\\surd": "√"
  "\\sqrt": "√"
  "\\cib": "●"
  "\\curry": "●"
  "\\ciw": "○"
  "\\compose": "○"
  "\\cis": "◐"
  "\\sin": "◐"
  "\\cias": "◑"
  "\\asin": "◑"
  "\\cic": "◒"
  "\\cos": "◒"
  "\\ciac": "◓"
  "\\acos": "◓"
  "\\cit": "◔"
  "\\tan": "◔"
  "\\ciat": "◕"
  "\\atan": "◕"
  "\\cish": "◖"
  "\\sinh": "◖"
  "\\ciash": "◗"
  "\\asinh": "◗"
  "\\cich": "◌"
  "\\cosh": "◌"
  "\\ciach": "◍"
  "\\acosh": "◍"
  "\\cith": "◎"
  "\\tanh": "◎"
  "\\ciath": "◉"
  "\\atanh": "◉"
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
  "\\speech": "💬"
  "\\chr": "💬"
  "\\ord": "💬"
  "\\scroll": "📜"
  "\\read": "📜"
  "\\book": "📖"
  "\\readln": "📖"
  ".X": "⊇"
  "\\sup=": "⊇"
  "\\supseteq": "⊇"
  "\\supseteqq": "⊇"
  ".Z": "⊆"
  "\\sub=": "⊆"
  "\\subseteq": "⊆"
  "\\subseteqq": "⊆"
  ".x": "⊃"
  "\\sup": "⊃"
  "\\supset": "⊃"
  "\\supset": "⊃"
  ".z": "⊂"
  "\\sub": "⊂"
  "\\subset": "⊂"
  "\\subset": "⊂"
  ".$": "⍋"
  "\\gradeup": "⍋"
  "\\sort": "⍋"
  "\\forkandknife": "🍴"
  "\\chomp": "🍴"
  ".<": "⍪"
  "\\ravel": "⍪"
  "\\flatten": "⍪"
  "\\?": "¿"
  "?`": "¿"
  "\\::": "∷"
  ".s": "⌈"
  "\\lceil": "⌈"
  "\\cul": "⌉"
  "\\rceil": "⌉"
  "\\cur": "⌉"
  ".d": "⌊"
  "\\lfloor": "⌊"
  "\\cll": "⌊"
  "\\cl": "⌊"
  "\\rfloor": "⌋"
  "\\clr": "⌋"
  "\\cr": "⌋"
  "\\inf": "∞"
  "\\infty": "∞"
  "\\infinity": "∞"
  "\\nan": "👿"
  "\\devil": "👿"
  "\\pi": "π"
  "\\tau": "τ"
  "\\Gt": "τ"
  "\\\\": "\\"
  "\\flqq": "«"
  "\\\"<": "«"
  "\\frqq": "»"
  "\\\">": "»"
  "\\varprime": "′"
  "\\prime": "′"
  "\\'": "′"
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
  "_0": "₀"
  "_1": "₁"
  "_2": "₂"
  "_3": "₃"
  "_4": "₄"
  "_5": "₅"
  "_6": "₆"
  "_7": "₇"
  "_8": "₈"
  "_9": "₉"
  "^0": "⁰"
  "^1": "¹"
  "^2": "²"
  "^3": "³"
  "^4": "⁴"
  "^5": "⁵"
  "^6": "⁶"
  "^7": "⁷"
  "^8": "⁸"
  "^9": "⁹"
  "1/": "⅟"
  "1/4": "¼"
  "1/2": "½"
  "3/4": "¾"
  "1/7": "⅐"
  "1/9": "⅑"
  "1/10 ": "⅒"
  "1/3": "⅓"
  "2/3": "⅔"
  "1/5": "⅕"
  "2/5": "⅖"
  "3/5": "⅗"
  "4/5": "⅘"
  "1/6": "⅙"
  "5/6": "⅚"
  "1/8": "⅛"
  "3/8": "⅜"
  "5/8": "⅝"
  "7/8": "⅞"
  "0/3": "↉"
