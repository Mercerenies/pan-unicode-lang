
export class Modifier {}

export class NumModifier extends Modifier {
  constructor(n) {
    super();
    this.value = n;
  }
}

export function toNumModifier(tok) {
  let result = "⓪①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳".indexOf(tok.text);
  if (result >= 0)
    return new NumModifier(result);
  else
    return undefined;
}
