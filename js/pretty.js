import { StringLit } from './ast.js';
export function stringify(value) {
    if (value instanceof StringLit) {
        return value.text.toString();
    }
    else {
        return value.toString();
    }
}
