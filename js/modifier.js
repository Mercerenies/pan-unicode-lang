export const NUMS = "⓪①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";
export class Modifier {
}
export class NumModifier extends Modifier {
    constructor(value) {
        super();
        this.value = value;
    }
    toString() {
        return NUMS.charAt(this.value);
    }
}
export class PrimeModifier extends Modifier {
    toString() {
        return "′";
    }
}
export function toNumModifier(tok) {
    if (tok.text.toString() === "") {
        return undefined;
    }
    const result = NUMS.indexOf(tok.text.toString());
    if (result >= 0) {
        return new NumModifier(result);
    }
    else {
        return undefined;
    }
}
export const MAX_NUM_MODIFIER = 20;
