
const NUMS = "⓪①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";

export class Modifier {}

export class NumModifier extends Modifier {
  constructor(n) {
    super();
    this.value = n;
  }
  toString() {
    return NUMS.charAt(this.value);
  }
}

export function toNumModifier(tok) {
  let result = NUMS.indexOf(tok.text);
  if (result >= 0)
    return new NumModifier(result);
  else
    return undefined;
}
