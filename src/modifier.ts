
import { Token } from './token.js';

export const NUMS: string = "⓪①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";

export class Modifier {}


export class NumModifier extends Modifier {
  readonly value: number;

  constructor(value: number) {
    super();
    this.value = value;
  }

  toString(): string {
    return NUMS.charAt(this.value);
  }

}


export class PrimeModifier extends Modifier {

  toString(): string {
    return "′";
  }

}


export function toNumModifier(tok: Token): NumModifier | undefined {
  if (tok.text.toString() === "") {
    return undefined;
  }
  const result = NUMS.indexOf(tok.text.toString());
  if (result >= 0) {
    return new NumModifier(result);
  } else {
    return undefined;
  }
}


export const MAX_NUM_MODIFIER: number = 20;
