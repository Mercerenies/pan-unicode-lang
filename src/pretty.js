
import { FunctionLit } from './ast.js';

// Pretty-printer for outputting the various types of values we'll see
// in the language.

export function stringify(value) {
  // Currently, just calls toString. We may want to change it in some cases here.
  return value.toString();
}
