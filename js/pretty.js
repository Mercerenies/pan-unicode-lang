// Generated by CoffeeScript 2.5.1
import {
  StringLit
} from './ast.js';

export var stringify = function(value) {
  switch (false) {
    case !(value instanceof StringLit):
      return value.text.toString();
    default:
      return value.toString();
  }
};

//# sourceMappingURL=pretty.js.map