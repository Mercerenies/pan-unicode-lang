
import { spliceStr } from './util.js';


export class InputManager {
  private element: HTMLElement | null;
  private handler: ((this: HTMLElement, event: Event) => void) | null;
  private downHandler: ((this: HTMLElement, event: KeyboardEvent) => void) | null;
  private readonly translations: CompiledTable;
  private currentTranslation: CompiledTable | null;
  private currentString: string;
  private currentPosition: number;

  constructor() {
    this.element = null;
    this.handler = null;
    this.downHandler = null;
    this.translations = compileTranslationTable(DEFAULT_TRANSLATION_TABLE);
    this.currentTranslation = null;
    this.currentString = "";
    this.currentPosition = 0;
  }

  register(element: HTMLElement): void {
    if (this.element != null) {
      this.unregister();
    }
    this.element = element;
    this.handler = (event: Event) => {
      return this.onInput(event as InputEvent);
    };
    this.downHandler = (event: KeyboardEvent) => {
      return this.onKeyDown(event);
    };
    element.addEventListener('input', this.handler);
    element.addEventListener('keypress', this.downHandler);
    element.addEventListener('keydown', this.downHandler);
  }

  unregister(): void {
    if (this.element != null) {
      this.element.removeEventListener('input', this.handler as ((this: HTMLElement, event: Event) => void));
      this.element.removeEventListener('keypress', this.downHandler as ((this: HTMLElement, event: KeyboardEvent) => void));
      this.element.removeEventListener('keydown', this.downHandler as ((this: HTMLElement, event: KeyboardEvent) => void));
      this.element = null;
      this.handler = null;
      this.downHandler = null;
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    // MDN says to do this :)
    if (event.isComposing || event.keyCode === 229) {
      return;
    }
    if (event.keyCode === 13 && event.shiftKey) {
      (document.querySelector("#run-button") as HTMLInputElement).click();
      event.preventDefault();
    }
  }

  onInput(event: InputEvent): void {
    if (event.inputType === "insertText") {
      const target = event.target as HTMLTextAreaElement;
      let resolution = 0;
      const tryToResolve = (): void => {
        if (resolution > 2) {
          return;
        }
        resolution += 1;
        if (this.currentTranslation === null) {
          this.currentTranslation = this.translations;
          this.currentPosition = target.selectionStart - 1;
        }
        const next = this.currentTranslation[event.data!];
        this.currentString += event.data;
        if (this.currentPosition !== target.selectionStart - 1) {
          this.currentTranslation = null;
          this.currentString = "";
          tryToResolve();
        } else if (typeof next === 'object') {
          const terminal = next[END];
          if (terminal != null) {
            this.currentPosition = target.selectionStart;
            target.value = spliceStr(target.value, terminal, this.currentPosition - this.currentString.length, this.currentPosition);
            target.selectionStart = this.currentPosition - this.currentString.length + terminal.length;
            target.selectionEnd = target.selectionStart;
            this.currentString = terminal;
          }
          this.currentTranslation = next;
        } else {
          this.currentTranslation = null;
          this.currentString = "";
          tryToResolve();
        }
        this.currentPosition = target.selectionStart;
      };
      tryToResolve();
    } else {
      // In any other case, cancel the current translation
      this.currentTranslation = null;
      this.currentString = "";
    }
  }

}


export const END: unique symbol = Symbol("END");


export function compileTranslationTable(table: TranslationTable): CompiledTable {
  const result: CompiledTable = {};
  for (const k in table) {
    const v = table[k];
    let curr: CompiledTable = result;
    [...k].forEach((ch, i) => {
      if (curr[ch] == null) {
        curr[ch] = {};
      }
      curr = curr[ch];
    });
    curr[END] = v;
  }
  return result;
}


export type TranslationTable = {
  [key: string]: string;
}


export interface CompiledTable {
  [key: string]: CompiledTable;
  [END]?: string;
}


export const DEFAULT_TRANSLATION_TABLE: TranslationTable = {
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
  "0/3": "↉",
};
