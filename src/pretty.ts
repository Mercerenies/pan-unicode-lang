
import { AST, StringLit } from './ast.js';

export function stringify(value: AST): string {
  if (value instanceof StringLit) {
    return value.text.toString();
  } else {
    return value.toString();
  }
}
