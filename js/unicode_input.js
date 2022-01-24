import { spliceStr } from './util.js';
export class InputManager {
    constructor() {
        this.element = null;
        this.handler = null;
        this.downHandler = null;
        this.translations = compileTranslationTable(DEFAULT_TRANSLATION_TABLE);
        this.currentTranslation = null;
        this.currentString = "";
        this.currentPosition = 0;
    }
    register(element) {
        if (this.element != null) {
            this.unregister();
        }
        this.element = element;
        this.handler = (event) => {
            return this.onInput(event);
        };
        this.downHandler = (event) => {
            return this.onKeyDown(event);
        };
        element.addEventListener('input', this.handler);
        element.addEventListener('keypress', this.downHandler);
        return element.addEventListener('keydown', this.downHandler);
    }
    unregister() {
        if (this.element != null) {
            this.element.removeEventListener('input', this.handler);
            this.element.removeEventListener('keypress', this.downHandler);
            this.element.removeEventListener('keydown', this.downHandler);
            this.element = null;
            this.handler = null;
            return this.downHandler = null;
        }
    }
    onKeyDown(event) {
        if (event.isComposing || event.keyCode === 229) {
            return;
        }
        // MDN says to do this :)
        if (event.keyCode === 13 && event.shiftKey) {
            document.querySelector("#run-button").click();
            return event.preventDefault();
        }
    }
    onInput(event) {
        var resolution, tryToResolve;
        if (event.inputType === "insertText") {
            resolution = 0;
            tryToResolve = () => {
                var next, term;
                if (resolution > 2) {
                    return;
                }
                resolution += 1;
                if (this.currentTranslation === null) {
                    this.currentTranslation = this.translations;
                    this.currentPosition = event.target.selectionStart - 1;
                }
                next = this.currentTranslation[event.data];
                this.currentString += event.data;
                switch (false) {
                    case this.currentPosition === event.target.selectionStart - 1:
                        this.currentTranslation = null;
                        this.currentString = "";
                        tryToResolve();
                        break;
                    case typeof next !== 'object':
                        if (next[END] != null) {
                            term = next[END];
                            this.currentPosition = event.target.selectionStart;
                            event.target.value = spliceStr(event.target.value, term, this.currentPosition - this.currentString.length, this.currentPosition);
                            event.target.selectionStart = this.currentPosition - this.currentString.length + term.length;
                            event.target.selectionEnd = event.target.selectionStart;
                            this.currentString = term;
                        }
                        this.currentTranslation = next;
                        break;
                    default:
                        this.currentTranslation = null;
                        this.currentString = "";
                        tryToResolve();
                }
                return this.currentPosition = event.target.selectionStart;
            };
            return tryToResolve();
        }
        else {
            // In any other case, cancel the current translation
            this.currentTranslation = null;
            return this.currentString = "";
        }
    }
}
;
export var END = Symbol("END");
export var compileTranslationTable = function (table) {
    var ch, curr, i, k, len, result, v;
    result = {};
    for (k in table) {
        v = table[k];
        curr = result;
        for (i = 0, len = k.length; i < len; i++) {
            ch = k[i];
            if (curr[ch] == null) {
                curr[ch] = {};
            }
            curr = curr[ch];
        }
        curr[END] = v;
    }
    return result;
};
export var DEFAULT_TRANSLATION_TABLE = {
    "\\o": "ø",
    ".-": "×",
    "\\times": "×",
    "\\x": "×",
    ".=": "÷",
    "\\div": "÷",
    "\\division": "÷",
    ".0": "∧",
    "\\and": "∧",
    "\\wedge": "∧",
    ".9": "∨",
    "\\or": "∨",
    "\\vee": "∨",
    "\\.and": "⩑",
    "\\.wedge": "⩑",
    "\\lcm": "⩑",
    "\\.or": "⩒",
    "\\.vee": "⩒",
    "\\gcd": "⩒",
    "\\neg": "¬",
    "\\lnot": "¬",
    "\\o+": "⊕",
    "\\oplus": "⊕",
    "\\ox": "⊗",
    "\\otimes": "⊗",
    ".7": "<",
    ".3": ">",
    ".4": "≤",
    "\\le": "≤",
    "\\leq": "≤",
    ".6": "≥",
    "\\ge": "≥",
    "\\geq": "≥",
    ".8": "≠",
    "\\ne": "≠",
    "\\neq": "≠",
    "._": "≡",
    "\\equiv": "≡",
    "\\eq": "≡",
    "\\==": "≡",
    ".\"": "≢",
    "\\nequiv": "≢",
    "\\eqn": "≢",
    "\\==n": "≢",
    "\\fw": "⚐",
    "\\epsilon": "ε",
    "\\Ge": "ε",
    "\\fb": "⚑",
    ".i": "⍳",
    "\\iota": "⍳",
    "\\Gi": "⍳",
    ".I": "⍸",
    "\\iota_": "⍸",
    "\\Gi_": "⍸",
    ".r": "⍴",
    "\\rho": "⍴",
    "\\Gr": "⍴",
    ".[": "←",
    "\\<-": "←",
    "\\leftarrow": "←",
    "\\l-": "←",
    "\\l": "←",
    ".]": "→",
    "\\->": "→",
    "\\rightarrow": "→",
    "\\r-": "→",
    "\\r": "→",
    "\\to": "→",
    "./": "⌿",
    "\\filter": "⌿",
    ".1": "¨",
    "\\map": "¨",
    "\\\"": "¨",
    "\\\"{}": "¨",
    ".e": "∈",
    "\\in": "∈",
    "\\member": "∈",
    "\\ell": "ℓ",
    "\\.e": "ė",
    "\\.{e}": "ė",
    "\\^e": "ê",
    "\\^{e}": "ê",
    "\\=i": "ī",
    "\\id": "ī",
    "\\nop": "ī",
    "\\={i}": "ī",
    "\\tree": "🌳",
    "\\log": "🌳",
    "\\ln": "🌳",
    "\\surd": "√",
    "\\sqrt": "√",
    "\\cib": "●",
    "\\curry": "●",
    "\\ciw": "○",
    "\\compose": "○",
    "\\cis": "◐",
    "\\sin": "◐",
    "\\cias": "◑",
    "\\asin": "◑",
    "\\cic": "◒",
    "\\cos": "◒",
    "\\ciac": "◓",
    "\\acos": "◓",
    "\\cit": "◔",
    "\\tan": "◔",
    "\\ciat": "◕",
    "\\atan": "◕",
    "\\cish": "◖",
    "\\sinh": "◖",
    "\\ciash": "◗",
    "\\asinh": "◗",
    "\\cich": "◌",
    "\\cosh": "◌",
    "\\ciach": "◍",
    "\\acosh": "◍",
    "\\cith": "◎",
    "\\tanh": "◎",
    "\\ciath": "◉",
    "\\atanh": "◉",
    "\\r-2": "⇉",
    "\\rightrightarrows": "⇉",
    "\\r\\/": "⤨",
    "\\r/\\": "⤨",
    "\\udr": "⤨",
    "\\dur": "⤨",
    "\\ur": "↗",
    "\\ur-": "↗",
    "\\nearrow": "↗",
    "\\dr": "↘",
    "\\dr-": "↘",
    "\\searrow": "↘",
    ".`": "⋄",
    "\\dio": "⋄",
    "\\diamond": "⋄",
    "\\speech": "💬",
    "\\chr": "💬",
    "\\ord": "💬",
    "\\scroll": "📜",
    "\\read": "📜",
    "\\book": "📖",
    "\\readln": "📖",
    "\\books": "📚",
    "\\readall": "📚",
    "\\slurp": "📚",
    ".X": "⊇",
    "\\sup=": "⊇",
    "\\supseteq": "⊇",
    "\\supseteqq": "⊇",
    ".Z": "⊆",
    "\\sub=": "⊆",
    "\\subseteq": "⊆",
    "\\subseteqq": "⊆",
    ".x": "⊃",
    "\\sup": "⊃",
    "\\supset": "⊃",
    ".z": "⊂",
    "\\sub": "⊂",
    "\\subset": "⊂",
    ".$": "⍋",
    "\\gradeup": "⍋",
    "\\sort": "⍋",
    "\\forkandknife": "🍴",
    "\\chomp": "🍴",
    ".<": "⍪",
    "\\ravel": "⍪",
    "\\flatten": "⍪",
    "\\?": "¿",
    "?`": "¿",
    "r`": "ɹ",
    "\\r`": "ɹ",
    "\\rev": "ɹ",
    "\\reverse": "ɹ",
    "\\::": "∷",
    ".s": "⌈",
    "\\lceil": "⌈",
    "\\cul": "⌉",
    "\\rceil": "⌉",
    "\\cur": "⌉",
    ".d": "⌊",
    "\\lfloor": "⌊",
    "\\cll": "⌊",
    "\\cl": "⌊",
    "\\rfloor": "⌋",
    "\\clr": "⌋",
    "\\cr": "⌋",
    "\\inf": "∞",
    "\\infty": "∞",
    "\\infinity": "∞",
    "\\nan": "👿",
    "\\devil": "👿",
    "\\pi": "π",
    "\\tau": "τ",
    "\\Gt": "τ",
    "\\Tl": "◁",
    "\\triangleleft": "◁",
    "\\take": "◁",
    "\\takel": "◁",
    "\\Tr": "▷",
    "\\triangleright": "▷",
    "\\taker": "▷",
    "\\Tlb": "⧏",
    "\\triangleleftbar": "⧏",
    "\\drop": "⧏",
    "\\dropl": "⧏",
    "\\Trb": "⧐",
    "\\dropr": "⧐",
    "\\Trianglerightbar": "⧐",
    "\\triangleleftblack": "◂",
    "\\takew": "◂",
    "\\takewl": "◂",
    "\\tr": "▸",
    "\\trianglerightblack": "▸",
    "\\takewr": "▸",
    "\\tlb": "◄",
    "\\Triangleleftblack": "◄",
    "\\dropw": "◄",
    "\\dropwl": "◄",
    "\\trb": "►",
    "\\dropwr": "►",
    "\\Trianglerightblack": "►",
    "\\scream": "😱",
    "\\throw": "😱",
    "\\panic": "😱",
    "\\error": "😱",
    "\\pray": "🙏",
    "\\prayer": "🙏",
    "\\catch": "🙏",
    "\\except": "🙏",
    "\\handle": "🙏",
    "\\empty": "🗋",
    "\\blank": "🗋",
    "\\paragraph": "¶",
    "\\P": "¶",
    "\\pilcrow": "¶",
    "\\split": "¶",
    "\\P`": "⁋",
    "\\rpilcrow": "⁋",
    "\\worclip": "⁋",
    "\\join": "⁋",
    "\\\\": "\\",
    "\\flqq": "«",
    "\\\"<": "«",
    "\\frqq": "»",
    "\\\">": "»",
    "\\varprime": "′",
    "\\prime": "′",
    "\\'": "′",
    "\\(0)": "⓪",
    "\\(1)": "①",
    "\\(2)": "②",
    "\\(3)": "③",
    "\\(4)": "④",
    "\\(5)": "⑤",
    "\\(6)": "⑥",
    "\\(7)": "⑦",
    "\\(8)": "⑧",
    "\\(9)": "⑨",
    "\\(10)": "⑩",
    "\\(11)": "⑪",
    "\\(12)": "⑫",
    "\\(13)": "⑬",
    "\\(14)": "⑭",
    "\\(15)": "⑮",
    "\\(16)": "⑯",
    "\\(17)": "⑰",
    "\\(18)": "⑱",
    "\\(19)": "⑲",
    "\\(20)": "⑳",
    "_0": "₀",
    "_1": "₁",
    "_2": "₂",
    "_3": "₃",
    "_4": "₄",
    "_5": "₅",
    "_6": "₆",
    "_7": "₇",
    "_8": "₈",
    "_9": "₉",
    "^0": "⁰",
    "^1": "¹",
    "^2": "²",
    "^3": "³",
    "^4": "⁴",
    "^5": "⁵",
    "^6": "⁶",
    "^7": "⁷",
    "^8": "⁸",
    "^9": "⁹",
    "1/": "⅟",
    "1/4": "¼",
    "1/2": "½",
    "3/4": "¾",
    "1/7": "⅐",
    "1/9": "⅑",
    "1/10 ": "⅒",
    "1/3": "⅓",
    "2/3": "⅔",
    "1/5": "⅕",
    "2/5": "⅖",
    "3/5": "⅗",
    "4/5": "⅘",
    "1/6": "⅙",
    "5/6": "⅚",
    "1/8": "⅛",
    "3/8": "⅜",
    "5/8": "⅝",
    "7/8": "⅞",
    "0/3": "↉"
};
//# sourceMappingURL=unicode_input.js.map
