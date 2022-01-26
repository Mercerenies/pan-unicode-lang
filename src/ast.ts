
import * as Error from './error.js';
import { stringify } from './pretty.js';
import * as Modifier from './modifier.js';
import * as TypeCheck from './type_check.js';
import * as Op from './op.js';
import * as ListOp from './list_op.js';
import * as StackOp from './stack_op.js';
import { arrayEq, gcd, lcm } from './util.js';
import { Token, TokenType, escapeString } from './token.js';
import Str from './str.js';
import { equals, compare, Ordering, defaultLT, customLT } from './comparison.js';
import * as SuperSub from './super_sub.js';

export abstract class AST {
  readonly modifiers: Modifier.Modifier[];

  constructor() {
    this.modifiers = [];
  }

  call(state) {
    throw new Error.CallNonFunction(this);
  }

  abstract eval(state);

  toException(): Error.Error {
    return new Error.UserError(this);
  }

  getNumMod(...args) {
    var mod, ref, result;
    if (args.length === 0) {
      args = [void 0];
    }
    result = [];
    ref = this.modifiers;
    for (mod of ref) {
      if (mod instanceof Modifier.NumModifier) {
        result.push(mod.value);
        if (result.length >= args.length) {
          break;
        }
      }
    }
    while (result.length < args.length) {
      result.push(args[result.length]);
    }
    if (result.length === 1) {
      return result[0];
    } else {
      return result;
    }
  }

  getPrimeMod() {
    var mod, n, ref;
    n = 0;
    ref = this.modifiers;
    for (mod of ref) {
      if (mod instanceof Modifier.PrimeModifier) {
        n += 1;
      }
    }
    return n;
  }

};

export class SimpleCmd extends AST {
  readonly token: Token;

  constructor(token) {
    super();
    this.token = token;
  }

  isNumberLit() {
    return this.token.tokenType() === TokenType.Number;
  }

  isStringLit() {
    return this.token.tokenType() === TokenType.String;
  }

  eval(state) {
    var acc, arg, arr, body, c, char, chomp, cond, curr, deffn, delim, dropCmd, dropper, elem, exc, f, fn, frame, func, i, j, k, l, len, len1, len2, len3, lift, list, m, mod, n, newTerm, num, o, p, preserve, q, r, recoverBlock, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, res, result, results, results1, results2, results3, s, savedStack, store, t, tryBlock, value, x;
    if (this.isNumberLit()) {
      return state.push(new NumberLit(this.token.text as number));
    } else if (this.isStringLit()) {
      return state.push(new StringLit(this.token.text as Str));
    } else {
      switch (this.token.text.toString()) {
      /* IO */
      case '.': // Pretty print ( x -- )
        return state.print(stringify(state.pop()));
      case ',': // Read integer from input
        return state.push(readAndParseInt(state));
      case '📜': // Read character from input
        char = state.readInput();
        if (char != null) {
          return state.push(new StringLit(char));
        } else {
          return state.push(SentinelValue.null);
        }
        break;
      case '📖': // Read line from input
        result = "";
        while (true) {
          curr = state.readInput();
          if (curr === void 0) {
            break;
          }
          result += curr;
          if (curr === '\n') {
            break;
          }
        }
        if (result !== "") {
          return state.push(new StringLit(result));
        } else {
          return state.push(SentinelValue.null);
        }
        break;
      case "📚": // Read all remaining from input
        result = "";
        while (true) {
          curr = state.readInput();
          if (curr === void 0) {
            break;
          }
          result += curr;
        }
        if (result !== "") {
          return state.push(new StringLit(result));
        } else {
          return state.push(SentinelValue.null);
        }
        break;
        /* STACK SHUFFLING */
      case ':': // Duplicate ( x -- x x )
        // (Numerical modifier determines number of things to duplicate)
        mod = this.getNumMod(1);
        x = state.pop(mod);
        state.push(...x);
        return state.push(...x);
      case '%': // Pop ( x -- )
        // (Numerical modifier determines amount to pop)
        mod = this.getNumMod(1);
        return state.pop(mod);
      case '@': // Swap/Rotate ( x y -- y x )
        // (Numerical modifier determines how deep to lift)
        mod = this.getNumMod(1);
        store = state.pop(mod);
        lift = state.pop();
        state.push(...store);
        return state.push(lift);
      case 'ø': // Over ( x y -- x y x )
        // (Numerical modifier determines how deep to go)
        mod = this.getNumMod(1);
        store = state.pop(mod);
        lift = state.peek();
        state.push(...store);
        return state.push(lift);
        /* ARITHMETIC */
      case '+': // Add ( x y -- z )
        // (Numerical modifier determines arity)
        return Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(a.value + b.value);
          },
          preProcess: TypeCheck.isNumber,
          zero: 0,
          extension: Op.binary,
          scalarExtend: true
        });
      case '-': // Subtract ( x y -- z )
        return Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(a.value - b.value);
          },
          preProcess: TypeCheck.isNumber,
          one: function(a) {
            return new NumberLit(-a.value);
          },
          extension: Op.binary,
          scalarExtend: true
        });
      case '×': // Multiply ( x y -- z )
        return Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(a.value * b.value);
          },
          preProcess: TypeCheck.isNumber,
          zero: 1,
          extension: Op.binary,
          scalarExtend: true
        });
      case '÷': // Divide ( x y -- z )
        return Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(a.value / b.value);
          },
          preProcess: TypeCheck.isNumber,
          one: function(a) {
            return new NumberLit(1 / a.value);
          },
          extension: Op.binary,
          scalarExtend: true
        });
      case '*': // Power ( x y -- z )
        return Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(a.value ** b.value);
          },
          preProcess: TypeCheck.isNumber,
          zero: 1,
          extension: Op.binaryRight,
          scalarExtend: true
        });
      case 'ê': // e^x ( x -- y )
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.exp(TypeCheck.isNumber(x).value);
        })(state.pop()));
      case '🌳': // ln(x) ( x -- y )
        // With prime modifier, it's log_b(a) ( a b -- y )
        if (this.getPrimeMod() > 0) {
          return Op.op(state, this, {
            function: function(a, b) {
              return new NumberLit(Math.log(a.value) / Math.log(b.value));
            },
            preProcess: TypeCheck.isNumber,
            extension: Op.binary,
            scalarExtend: true
          });
        } else {
          return state.push(Op.scalarExtendUnary(function(x) {
            return Math.log(TypeCheck.isNumber(x).value);
          })(state.pop()));
        }
        break;
      case '√': // sqrt(x) ( x -- y )
        // With prime modifier, it's (a ** (1/b)) ( a b -- y )
        if (this.getPrimeMod() > 0) {
          return Op.op(state, this, {
            function: function(a, b) {
              return new NumberLit(a.value ** (1 / b.value));
            },
            preProcess: TypeCheck.isNumber,
            extension: Op.binary,
            scalarExtend: true
          });
        } else {
          return state.push(Op.scalarExtendUnary(function(x) {
            return Math.sqrt(TypeCheck.isNumber(x).value);
          })(state.pop()));
        }
        break;
      case '|': // Remainder ( x y -- z )
        // This does not extend with modifier; it only scalar extends
        return Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit((a.value % b.value + b.value) % b.value); // "True" mod
          },
          preProcess: TypeCheck.isNumber,
          scalarExtend: true
        });
      case '⩑': // LCM ( x y -- z )
        return Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(lcm(a.value, b.value));
          },
          preProcess: TypeCheck.isNumber,
          zero: 1,
          extension: Op.binary,
          scalarExtend: true
        });
      case '⩒': // GCD ( x y -- z )
        return Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(gcd(a.value, b.value));
          },
          preProcess: TypeCheck.isNumber,
          zero: 0,
          extension: Op.binary,
          scalarExtend: true
        });
      case '_': // Negate ( x -- y )
        return state.push(Op.scalarExtendUnary(function(x) {
          return -TypeCheck.isNumber(x).value;
        })(state.pop()));
      case '⅟': // Reciprocal ( x -- y )
        return state.push(Op.scalarExtendUnary(function(x) {
          return 1 / TypeCheck.isNumber(x).value;
        })(state.pop()));
      case '⌉': // Ceiling ( x -- y )
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.ceil(TypeCheck.isNumber(x).value);
        })(state.pop()));
      case '⌋': // Floor ( x -- y )
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.floor(TypeCheck.isNumber(x).value);
        })(state.pop()));
      case 'A': // Absolute value ( x -- y )
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.abs(TypeCheck.isNumber(x).value);
        })(state.pop()));
      case 'a': // Signum ( x -- y )
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.sign(TypeCheck.isNumber(x).value);
        })(state.pop()));
      case '∧': // Bitwise Conjunction ( x y -- z )
        return Op.op(state, this, {
          function: function(a, b) {
            return a.value & b.value;
          },
          preProcess: TypeCheck.isNumber,
          zero: -1,
          extension: Op.binary,
          scalarExtend: true
        });
      case '∨': // Bitwise Disjunction ( x y -- z )
        return Op.op(state, this, {
          function: function(a, b) {
            return a.value | b.value;
          },
          preProcess: TypeCheck.isNumber,
          zero: 0,
          extension: Op.binary,
          scalarExtend: true
        });
      case '⊕': // Bitwise Exclusive Or ( x y -- z )
        return Op.op(state, this, {
          function: function(a, b) {
            return a.value ^ b.value;
          },
          preProcess: TypeCheck.isNumber,
          zero: 0,
          extension: Op.binary,
          scalarExtend: true
        });
      case '¬': // Bitwise Negate ( x -- y )
        return state.push(Op.scalarExtendUnary(function(x) {
          return ~TypeCheck.isNumber(x).value;
        })(state.pop()));
      case '¿': // Defined-or ( x y -- z )
        // Returns the first argument unless it's ε, in which
        // case it returns the second.
        return Op.op(state, this, {
          function: function(a, b) {
            if (equals(a, SentinelValue.null)) {
              return b;
            } else {
              return a;
            }
          },
          zero: SentinelValue.null,
          extension: Op.binary,
          scalarExtend: false
        });
        /* TRIGONOMETRY */
      case '◐':
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.sin(TypeCheck.isNumber(x).value);
        })(state.pop()));
      case '◑':
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.asin(TypeCheck.isNumber(x).value);
        })(state.pop()));
      case '◒':
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.cos(TypeCheck.isNumber(x).value);
        })(state.pop()));
      case '◓':
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.acos(TypeCheck.isNumber(x).value);
        })(state.pop()));
      case '◔':
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.tan(TypeCheck.isNumber(x).value);
        })(state.pop()));
      case '◕':
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.atan(TypeCheck.isNumber(x).value);
        })(state.pop()));
      case '◖':
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.sinh(TypeCheck.isNumber(x).value);
        })(state.pop()));
      case '◗':
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.asinh(TypeCheck.isNumber(x).value);
        })(state.pop()));
      case '◌':
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.cosh(TypeCheck.isNumber(x).value);
        })(state.pop()));
      case '◍':
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.acosh(TypeCheck.isNumber(x).value);
        })(state.pop()));
      case '◎':
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.tanh(TypeCheck.isNumber(x).value);
        })(state.pop()));
      case '◉':
        return state.push(Op.scalarExtendUnary(function(x) {
          return Math.atanh(TypeCheck.isNumber(x).value);
        })(state.pop()));
        /* NUMERICAL CONSTANTS */
      case 'π':
        return state.push(Math.PI);
      case 'τ':
        return state.push(2 * Math.PI);
      case 'e':
        return state.push(Math.E);
      case '¼':
        return state.push(1 / 4);
      case '½':
        return state.push(1 / 2);
      case '¾':
        return state.push(3 / 4);
      case '⅐':
        return state.push(1 / 7);
      case '⅑':
        return state.push(1 / 9);
      case '⅒':
        return state.push(1 / 10);
      case '⅓':
        return state.push(1 / 3);
      case '⅔':
        return state.push(2 / 3);
      case '⅕':
        return state.push(1 / 5);
      case '⅖':
        return state.push(2 / 5);
      case '⅗':
        return state.push(3 / 5);
      case '⅘':
        return state.push(4 / 5);
      case '⅙':
        return state.push(1 / 6);
      case '⅚':
        return state.push(5 / 6);
      case '⅛':
        return state.push(1 / 8);
      case '⅜':
        return state.push(3 / 8);
      case '⅝':
        return state.push(5 / 8);
      case '⅞':
        return state.push(7 / 8);
      case '↉':
        return state.push(0 / 3);
        /* STRING OPERATIONS */
      case '⋄': // Concatenate ( x y -- z )
        // (Numerical modifier determines arity)
        // No scalar extension. Works on lists and on strings.
        return Op.op(state, this, {
          function: catenate,
          preProcess: TypeCheck.isStringOrList,
          zero: new StringLit(""),
          extension: Op.binary,
          scalarExtend: false
        });
      case '💬': // Chr / Ord ( x -- y )
        arg = state.pop();
        if (typeof arg === 'number') {
          arg = new ArrayLit([arg]);
        }
        switch (false) {
        case !(arg instanceof ArrayLit):
          res = new Str((function() {
            var j, len, ref, results;
            ref = arg.data;
            results = [];
            for (j = 0, len = ref.length; j < len; j++) {
              c = ref[j];
              results.push(String.fromCodePoint(c.value));
            }
            return results;
          })());
          return state.push(new StringLit(res));
        case !(arg instanceof StringLit):
          res = (function() {
            var j, ref, results;
            results = [];
            for (i = j = 0, ref = arg.text.length - 1; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
              results.push(new NumberLit(arg.text.codePointAt(i)));
            }
            return results;
          })();
          return state.push(new ArrayLit(res));
        default:
          throw new Error.TypeError("string or list", arg);
        }
        break;
      case '🍴': // Chomp ( x -- y )
        // Removes the last character if it's a newline. Subject to scalar extension.
        chomp = function(x) {
          x = x.text;
          result = x.charAt(x.length - 1) === '\n' ? Str.fromString(x.toString().slice(0, x.length - 1)) : x;
          return new StringLit(result);
        };
        return state.push(Op.scalarExtendUnary(function(x) {
          return chomp(TypeCheck.isString(x));
        })(state.pop()));
      case 'r': // Mark as regexp ( s -- s )
        s = state.pop();
        TypeCheck.isString(s);
        return state.push(new StringLit(s.text).markAsRegexp());
      case '¶': // Split string ( s delim -- arr )
        // Delimiter can be either string or regexp
        [s, delim] = state.pop(2);
        TypeCheck.isString(delim);
        delim = delim.toReOrStr();
        if (delim === "") {
          // Awkward hack for UTF-16 support (we don't want to pass
          // empty string to split function)
          delim = new RegExp("", "u");
        }
        TypeCheck.isString(s);
        result = s.text.toString().split(delim).map(function(x) {
          return new StringLit(Str.fromString(x));
        });
        return state.push(new ArrayLit(result));
      case '⁋': // Join string ( arr delim -- s )
        // Delimiter should be a string. Other argument should be list of strings.
        [arr, delim] = state.pop(2);
        TypeCheck.isList(arr);
        delim = stringify(delim);
        result = new StringLit(arr.data.map(stringify).join(delim));
        return state.push(result);
      case 'p': // Prettify ( x -- s )
        // Converts the value to a string. No-op if given a string.
        x = state.pop();
        return state.push(new StringLit(stringify(x)));
        /* COMPARISONS */
      case '=': // Equal ( x y -- ? )
        return Op.op(state, this, {
          function: function(a, b) {
            return equals(a, b);
          },
          postProcess: Op.boolToInt,
          zero: -1,
          extension: Op.merge(function(a, b) {
            return a & b;
          }),
          scalarExtend: true,
          whiteFlag: Op.WhiteFlag.ignore
        });
      case '<': // LT ( x y -- ? )
        return Op.op(state, this, {
          function: function(a, b) {
            return compare(a, b) === Ordering.LT;
          },
          postProcess: Op.boolToInt,
          zero: -1,
          extension: Op.merge(function(a, b) {
            return a & b;
          }),
          scalarExtend: true,
          whiteFlag: Op.WhiteFlag.ignore
        });
      case '>': // GT ( x y -- ? )
        return Op.op(state, this, {
          function: function(a, b) {
            return compare(a, b) === Ordering.GT;
          },
          postProcess: Op.boolToInt,
          zero: -1,
          extension: Op.merge(function(a, b) {
            return a & b;
          }),
          scalarExtend: true,
          whiteFlag: Op.WhiteFlag.ignore
        });
      case '≤': // LE ( x y -- ? )
        return Op.op(state, this, {
          function: function(a, b) {
            return compare(a, b) !== Ordering.GT;
          },
          postProcess: Op.boolToInt,
          zero: -1,
          extension: Op.merge(function(a, b) {
            return a & b;
          }),
          scalarExtend: true,
          whiteFlag: Op.WhiteFlag.ignore
        });
      case '≥': // GE ( x y -- ? )
        return Op.op(state, this, {
          function: function(a, b) {
            return compare(a, b) !== Ordering.LT;
          },
          postProcess: Op.boolToInt,
          zero: -1,
          extension: Op.merge(function(a, b) {
            return a & b;
          }),
          scalarExtend: true,
          whiteFlag: Op.WhiteFlag.ignore
        });
      case '≠': // Not Equal ( x y -- ? )
        return Op.op(state, this, {
          function: function(a, b) {
            return !equals(a, b);
          },
          postProcess: Op.boolToInt,
          zero: -1,
          extension: Op.merge(function(a, b) {
            return a & b;
          }),
          scalarExtend: true,
          whiteFlag: Op.WhiteFlag.ignore
        });
      case '≡': // Same ( x y -- ? )
        // Note: No scalar extension
        return Op.op(state, this, {
          function: function(a, b) {
            return equals(a, b);
          },
          postProcess: Op.boolToInt,
          zero: -1,
          extension: Op.merge(function(a, b) {
            return a & b;
          }),
          scalarExtend: false,
          whiteFlag: Op.WhiteFlag.ignore
        });
      case '≢': // Not Same ( x y -- ? )
        // Note: No scalar extension
        return Op.op(state, this, {
          function: function(a, b) {
            return !equals(a, b);
          },
          postProcess: Op.boolToInt,
          zero: -1,
          extension: Op.merge(function(a, b) {
            return a & b;
          }),
          scalarExtend: false,
          whiteFlag: Op.WhiteFlag.ignore
        });
      case '⌈': // Max
        // With prime, pops a function and uses it instead of
        // default less-than.
        func = this.getPrimeMod() > 0 ? customLT(state, state.pop()) : defaultLT;
        return Op.op(state, this, {
          function: function(a, b) {
            if (func(b, a)) {
              return a;
            } else {
              return b;
            }
          },
          zero: -2e308,
          extension: Op.binary,
          scalarExtend: true
        });
      case '⌊': // Min
        // With prime, pops a function and uses it instead of
        // default less-than.
        func = this.getPrimeMod() > 0 ? customLT(state, state.pop()) : defaultLT;
        return Op.op(state, this, {
          function: function(a, b) {
            if (func(a, b)) {
              return a;
            } else {
              return b;
            }
          },
          zero: 2e308,
          extension: Op.binary,
          scalarExtend: true
        });
        /* METAPROGRAMMING */
      case 's': // Get stack frame
        // (Numerical argument determines how deep to go; n=0 is current)
        mod = this.getNumMod(0);
        frame = state.getFromCallStack(mod);
        return state.push(frame);
      case '{':
      case '⚐':
      case 'ε': // Sentinel value
        return state.push(new SentinelValue(this.token.text));
      case '⚑': // Construct ⚐ sentinel ( fn deffn -- fn )
        // Constructs a handler for the ⚐ sentinel. The resulting
        // function will call deffn if the top value of the stack is
        // ⚐ (popping ⚐), or will call fn otherwise (without popping
        // anything off the stack a priori). This is useful for
        // providing a "default" value to fold (/) in the case of an
        // empty list.

        // For instance, [`+ `999 ⚑ /] is a function which sums a
        // list, but returns 999 rather than 0 if the list is empty.
        [fn, deffn] = state.pop(2);
        return state.push(new FunctionLit([
          new SimpleCmd(new Token(":")),
          new SimpleCmd(new Token("⚐")),
          new SimpleCmd(new Token("≡")),
          new FunctionLit([
            new SimpleCmd(new Token('%')),
            deffn,
            new SimpleCmd(new Token('$')),
          ]),
          fn,
          new SimpleCmd(new Token("i")),
        ]));
        /* ARRAY LITERALS */
      case '}': // End array (pops until sentinel value is hit)
        arr = [];
        value = state.pop();
        while (!equals(value, SentinelValue.arrayStart)) {
          arr.push(value);
          value = state.pop();
        }
        return state.push(new ArrayLit(arr.reverse()));
        /* LIST OPERATIONS */
      case '/': // Fold ( ..a list ( ..a x y -- ..b z ) -- ..b t )
        // This one bears a bit of explanation. If the list is
        // nonempty, it acts like a traditional fold, applying the
        // binary operation between all elements of the list,
        // associating to the left. If the list is empty, it pushes
        // the special sentinel value ⚐ to the stack then calls the
        // function once. Built-in functions like + and × know to
        // check for the ⚐ and will return their identity (0 and 1,
        // resp.) in that case. If you provide your own function, you
        // can deal with the empty case by checking for ⚐.
        [list, func] = state.pop(2);
        TypeCheck.isList(list);
        if (list.length <= 0) {
          state.push(SentinelValue.whiteFlag);
          return tryCall(func, state);
        } else {
          acc = list.data[0];
          state.push(acc);
          results = [];
          for (i = j = 1, ref = list.length - 1; j <= ref; i = j += 1) {
            state.push(list.data[i]);
            results.push(tryCall(func, state));
          }
          return results;
        }
        break;
      case '\\': // Scan ( ..a list ( ..a x y -- ..b z ) -- ..b t )
        // This works just like fold (/) except that it returns a
        // list of all the intermediate results. The ⚐ caveat does
        // not apply, for if the empty list is given as input, then
        // the empty list is produced as output.
        [list, func] = state.pop(2);
        TypeCheck.isList(list);
        if (list.length <= 0) {
          return state.push(new ArrayLit([]));
        } else {
          acc = list.data[0];
          state.push(acc);
          result = [];
          for (i = k = 1, ref1 = list.length - 1; k <= ref1; i = k += 1) {
            result.push(state.peek());
            state.push(list.data[i]);
            tryCall(func, state);
          }
          result.push(state.pop());
          return state.push(new ArrayLit(result));
        }
        break;
      case '⌿': // Filter ( ..a list ( ..a x -- ..a ? ) -- ..a list )
        // The filter "function" can either be a function or a list
        // with the same length as the list, which acts as a mask. In
        // either case, the absolute value of the result at each
        // position is used to determine the number of times to
        // repeat the value. Numerical argument (default=1)
        // determines how many nested lists to go. See documentation
        // for ListOp.filter for more specific details.
        return ListOp.filter(this, state);
      case '¨': // Map ( ..a list ( ..a x -- ..a y ) -- ..a list )
        // Nests arbitrarily deep with a numerical argument, like
        // filter. See ListOp.map for full details.
        return ListOp.map(this, state);
      case 'ė': // Each ( ..a list ( ..a x -- ..a ) -- ..a )
        // Nests arbitrarily deep with a numerical argument, like
        // filter. See ListOp.each for full details.
        return ListOp.each(this, state);
      case 'n': // Nested Query ( list index -- result )
        // Works on lists or strings. See ListOp.nestedQuery
        // for details.
        return ListOp.nestedQuery(this, state);
      case '⊇': // Select ( list index -- result )
        // Works on lists or strings. See ListOp.select
        // for details.
        return ListOp.select(this, state);
      case '⍋': // Grade Up
        // Sorting function. See ListOp.gradeUp for full details.
        return ListOp.gradeUp(this, state);
      case '⍪': // Ravel / Flatten
        // Flattens lists. See ListOp.ravel for full details.
        return ListOp.ravel(this, state);
      case '⊗': // Outer Product
        // Outer product of lists under some operation. See ListOp.outerProduct.
        return ListOp.outerProduct(this, state);
      case '∷': // Prepend / Append
        if (this.getPrimeMod() === 0) {
          // With no prime, prepends some number of elements to a list
          return Op.op(state, this, {
            function: function(x, list) {
              return new ArrayLit([x].concat(TypeCheck.isList(list).data));
            },
            extension: Op.binaryRight,
            scalarExtend: false,
            defaultModifier: 1,
            modifierAdjustment: function(x) {
              return x + 1;
            }
          });
        } else {
          // With prime, appends some number of elements to a list
          return Op.op(state, this, {
            function: function(x, list) {
              return new ArrayLit(TypeCheck.isList(list).data.concat([x]));
            },
            extension: Op.binaryRight,
            scalarExtend: false,
            defaultModifier: 1,
            modifierAdjustment: function(x) {
              return x + 1;
            }
          });
        }
        break;
      case '⁰':
      case '¹':
      case '²':
      case '³':
      case '⁴':
      case '⁵':
      case '⁶':
      case '⁷':
      case '⁸':
      case '⁹': {
        const value = SuperSub.toNumber(this.token.text as Str);
        if (value === undefined) {
          throw `Internal error in superscript with ${this.token.text}`;
        }
        return state.push((ref2 = ListOp.nth(state.pop(), value)) != null ? ref2 : SentinelValue.null);
      }
      case '₁':
      case '₂':
      case '₃':
      case '₄':
      case '₅':
      case '₆':
      case '₇':
      case '₈':
      case '₉': {
        const value = SuperSub.toNumber(this.token.text as Str);
        if (value === undefined) {
          throw `Internal error in subscript with ${this.token.text}`;
        }
        return state.push((ref3 = ListOp.nth(state.pop(), -value)) != null ? ref3 : SentinelValue.null);
      }
      case '∈': // Member ( list x -- idx )
        // List membership. See ListOp.member for details
        return ListOp.member(this, state);
      case '#': // Length ( list -- n )
        // List length. See ListOp.length for details
        return ListOp.length(this, state);
      case '🗋': // Empty ( list -- ? )
        // With prime modifier, flattens before checking
        if (this.getPrimeMod() > 0) {
          newTerm = new SimpleCmd(new Token('⍪'));
          newTerm.modifiers.push(new Modifier.NumModifier(Modifier.MAX_NUM_MODIFIER));
          ListOp.ravel(newTerm, state);
        }
        list = state.pop();
        TypeCheck.isList(list);
        return state.push(Op.boolToInt(list.length === 0));
      case 'ℓ': // List constructor
        // Takes as many arguments as numerical modifier (default=1) specifies
        num = this.getNumMod(1);
        arr = new ArrayLit(state.pop(num));
        return state.push(arr);
      case '◁': // Take (left) ( list n -- list )
        [list, n] = state.pop(2);
        TypeCheck.isList(list);
        TypeCheck.isNumber(n);
        n = Math.abs(n.value);
        return state.push(new ArrayLit(list.data.slice(0, n)));
      case '▷': // Take (right) ( list n -- list )
        [list, n] = state.pop(2);
        TypeCheck.isList(list);
        TypeCheck.isNumber(n);
        n = Math.abs(n.value);
        return state.push(new ArrayLit(list.data.slice(-n)));
      case '⧏': // Drop (left) ( list n -- list )
        [list, n] = state.pop(2);
        TypeCheck.isList(list);
        TypeCheck.isNumber(n);
        n = Math.abs(n.value);
        return state.push(new ArrayLit(list.data.slice(n)));
      case '⧐': // Drop (right) ( list n -- list )
        [list, n] = state.pop(2);
        TypeCheck.isList(list);
        TypeCheck.isNumber(n);
        n = Math.abs(n.value);
        return state.push(new ArrayLit(list.data.slice(0, -n)));
      case '◂': // Take while (left) ( list f -- list )
        [list, f] = state.pop(2);
        TypeCheck.isList(list);
        result = [];
        ref4 = list.data;
        for (l = 0, len = ref4.length; l < len; l++) {
          elem = ref4[l];
          state.push(elem);
          tryCall(f, state);
          curr = isTruthy(state.pop());
          if (!curr) {
            break;
          }
          result.push(elem);
        }
        return state.push(new ArrayLit(result));
      case '▸': // Take while (right) ( list f -- list )
        [list, f] = state.pop(2);
        TypeCheck.isList(list);
        result = [];
        ref5 = list.data.slice().reverse();
        for (m = 0, len1 = ref5.length; m < len1; m++) {
          elem = ref5[m];
          state.push(elem);
          tryCall(f, state);
          curr = isTruthy(state.pop());
          if (!curr) {
            break;
          }
          result.push(elem);
        }
        return state.push(new ArrayLit(result.reverse()));
      case '◄': // Drop while (left) ( list f -- list )
        [list, f] = state.pop(2);
        TypeCheck.isList(list);
        ref6 = list.data;
        for (i = o = 0, len2 = ref6.length; o < len2; i = ++o) {
          elem = ref6[i];
          state.push(elem);
          tryCall(f, state);
          curr = isTruthy(state.pop());
          if (!curr) {
            break;
          }
        }
        return state.push(new ArrayLit(list.data.slice(i)));
      case '►': // Drop while (right) ( list f -- list )
        [list, f] = state.pop(2);
        TypeCheck.isList(list);
        ref7 = list.data.slice().reverse();
        for (i = p = 0, len3 = ref7.length; p < len3; i = ++p) {
          elem = ref7[i];
          state.push(elem);
          tryCall(f, state);
          curr = isTruthy(state.pop());
          if (!curr) {
            break;
          }
        }
        return state.push(new ArrayLit(list.data.slice(0, list.length - i)));
      case 'ɹ': // Reverse ( list -- list )
        list = state.pop();
        TypeCheck.isStringOrList(list);
        if (list instanceof ArrayLit) {
          return state.push(new ArrayLit(list.data.slice().reverse()));
        } else {
          return state.push(new StringLit(new Str(list.text.data.slice().reverse())));
        }
        break;
      case '⍴': // Reshape ( list shape -- list )
        // See ListOp.reshape
        return ListOp.reshape(this, state);
        /* CONTROL FLOW */
      case 'i': // If ( ..a ? ( ..a -- ..b ) ( ..a -- ..b ) -- ..b )
        [c, t, f] = state.pop(3);
        if (isTruthy(c)) {
          return tryCall(t, state);
        } else {
          return tryCall(f, state);
        }
        break;
      case 'w': // While ( ..a ( ..a -- ..b ? ) ( ..b -- ..a ) -- ..b )
        [cond, body] = state.pop(2);
        results1 = [];
        while (true) {
          tryCall(cond, state);
          result = state.pop();
          if (!isTruthy(result)) {
            break;
          }
          results1.push(tryCall(body, state));
        }
        return results1;
        break;
      case 'W': // While ( ..a ( ..a -- ..a ? ) -- ..b )
        // Like w but with no explicit body.
        cond = state.pop();
        results2 = [];
        while (true) {
          tryCall(cond, state);
          result = state.pop();
          if (!isTruthy(result)) {
            break;
          } else {
            results2.push(void 0);
          }
        }
        return results2;
        break;
      case '⍳': // Repeat N times ( ..a n ( ..a i -- ..a ) -- ..a )
        [n, body] = state.pop(2);
        results3 = [];
        for (i = q = 0, ref8 = n - 1; q <= ref8; i = q += 1) {
          state.push(i);
          results3.push(tryCall(body, state));
        }
        return results3;
        break;
      case '⍸': // Repeat N times and accumulate ( ..a x n ( ..a x i -- ..a x ) -- ..a list )
        [n, body] = state.pop(2);
        result = [state.peek()];
        for (i = r = 0, ref9 = n - 1; r <= ref9; i = r += 1) {
          state.push(i);
          tryCall(body, state);
          result.push(state.peek());
        }
        state.pop();
        return state.push(new ArrayLit(result));
      case '$': // Call ( ..a ( ..a -- ..b ) -- ..b )
        fn = state.pop();
        return tryCall(fn, state);
      case '😱': // Panic and throw error ( err -- )
        throw state.pop().toException();
      case '🙏': // Catch errors ( ..a ( ..a -- ..b) ( ..a err -- ..b ) -- ..b )
        [tryBlock, recoverBlock] = state.pop(2);
        savedStack = state.saveStack();
        try {
          // TODO Don't piggyback on JS error handling; implement it in our VM
          return tryCall(tryBlock, state);
        } catch (error) {
          exc = error;
          if (exc instanceof Error.Error) {
            state.loadStack(savedStack);
            state.push(StringLit.fromException(exc));
            return tryCall(recoverBlock, state);
          } else {
            throw exc;
          }
        }
        break;
        /* HIGHER ORDER FUNCTIONS */
      case 'ī': // Push identity function
        return state.push(new FunctionLit([]));
      case 'c': // Make constant function ( x -- ( -- x ) )
        // Numerical argument (defaults to zero) determines number to
        // pop in resulting function.
        num = this.getNumMod(0);
        x = state.pop();
        dropCmd = new SimpleCmd(new Token("%"));
        dropCmd.modifiers.push(new Modifier.NumModifier(num));
        dropper = new FunctionLit([dropCmd]);
        return state.push(new ComposedFunction(dropper, new CurriedFunction(x, new FunctionLit([]))));
      case '●': // Curry ( x ( ..a x -- ..b ) -- ( ..a -- ..b ) )
        return Op.op(state, this, {
          function: function(x, f) {
            return new CurriedFunction(x, f);
          },
          extension: Op.binaryRight,
          scalarExtend: false,
          defaultModifier: 1,
          modifierAdjustment: function(x) {
            return x + 1;
          }
        });
      case '○': // Compose ( ( ..a -- ..b ) ( ..b -- ..c ) -- ( ..a -- ..c ) )
        return Op.op(state, this, {
          function: function(f, g) {
            return new ComposedFunction(f, g);
          },
          extension: Op.binaryRight,
          scalarExtend: false,
          zero: function() {
            return new FunctionLit([]);
          },
          defaultModifier: 2
        });
        /* BOXING / UNBOXING */
      case '⊂': // Box ( x -- box )
        value = state.pop();
        return state.push(new Box(value));
      case '⊃': // Unbox ( box -- x )
        // No effect if value is not boxed
        value = state.pop();
        return state.push(value instanceof Box ? value.value : value);
        /* STACK COMBINATORS */
      case 'D': // Dip ( ..a x ( ..a -- ..b ) -- ..b x )
        // (Numerical modifier determines arity)
        mod = this.getNumMod(1);
        fn = state.pop();
        preserve = state.pop(mod);
        tryCall(fn, state);
        return state.push(...preserve);
      case 'K': // Keep ( ..a x ( ..a x -- ..b ) -- ..b x )
        // (Numerical modifier determines arity)
        mod = this.getNumMod(1);
        fn = state.pop();
        preserve = state.peek(mod);
        tryCall(fn, state);
        return state.push(...preserve);
      case '⇉': // "Spread" combinator, in Factor parlance
        // See StackOp.spread for details.
        return StackOp.spread(this, state);
      case '⤨': // "Cross" combinator
        // See StackOp.cross for details
        return StackOp.cross(this, state);
      case '↘': // "Apply" combinator
        // See StackOp.cleave for details
        return StackOp.apply(this, state);
      case '↗': // "Cleave" combinator
        // See StackOp.apply for details
        return StackOp.cleave(this, state);
      default:
        throw new Error.UnknownCommandError(this.token);
      }
    }
  }

  toString() {
    return this.token.toString() + this.modifiers.join("");
  }

};

export class AssignToVar extends AST {
  readonly target: string;

  constructor(target) {
    super();
    this.target = target;
  }

  eval(state) {
    return state.setGlobal(this.target, state.pop());
  }

  toString() {
    return "→" + this.target;
  }

};

export var ReadFromVar = class ReadFromVar extends AST {
  readonly target: string;

  constructor(target) {
    super();
    this.target = target;
  }

  eval(state) {
    return state.push(state.getGlobal(this.target));
  }

  toString() {
    return "←" + this.target;
  }

};

// StringLit actually encompasses a few things here. A string literal
// consists of, obviously, a sequence of characters. Additionally, a
// string literal can consist of a regex flag (Boolean) which specifies
// that it is to be treated as a regex, not a literal string, when used
// as an argument to search/replace functions. A string literal can
// also contain an exception object from which it was constructed. If a
// string literal is thrown and has an exception associated to it, then
// that exception will be thrown. Otherwise, the string will be wrapped
// in a new UserError exception.
export class StringLit extends AST {
  readonly text: Str;
  readonly regexp: boolean;
  readonly exception: Error.Error | undefined;

  constructor(text: string | Str, regexp?: boolean, exception?: Error.Error) {
    super();
    if (typeof text === 'string') {
      text = Str.fromString(text);
    }
    this.text = text;
    this.regexp = regexp ?? false;
    this.exception = exception; // TODO How does this fit in with equality? Are two strings with different exceptions equal?
  }

  markAsRegexp(): StringLit {
    return new StringLit(this.text, true, this.exception);
  }

  markWithException(exc) {
    return new StringLit(this.text, this.regexp, exc);
  }

  isRegexp(): boolean {
    return this.regexp;
  }

  hasException(): boolean {
    return this.exception != null;
  }

  eval(state) {
    return state.push(this);
  }

  toReOrStr() {
    if (this.isRegexp()) {
      return new RegExp(this.text.toString(), "u");
    } else {
      return this.text.toString();
    }
  }

  toString() {
    return escapeString(this.text) + (this.isRegexp() ? "r" : "");
  }

  toException() {
    if (this.exception != null) {
      return this.exception;
    } else {
      return super.toException();
    }
  }

  static fromException(exc) {
    return new StringLit(Str.fromString(exc.toString())).markWithException(exc);
  }

};

export class NumberLit extends AST {
  readonly value: number;

  constructor(value1) {
    super();
    this.value = value1;
  }

  eval(state) {
    return state.push(this);
  }

  toString() {
    if (this.value === Infinity) {
      return "∞";
    } else if (this.value === -Infinity) {
      return "-∞";
    } else if (this.value !== this.value) { // NaN >.<
      return "👿";
    } else {
      return this.value.toString();
    }
  }

};

export var FunctionLit = class FunctionLit extends AST {
  readonly body: AST[];

  constructor(body1) {
    super();
    this.body = body1;
  }

  eval(state) {
    return state.push(this);
  }

  call(state) {
    return state.eval(this.body);
  }

  toString() {
    return `[ ${this.body.join(" ")} ]${this.modifiers.join("")}`;
  }

};

export var CurriedFunction = class CurriedFunction extends AST {
  readonly arg: AST;
  readonly function: AST;

  constructor(arg1, _function) {
    super();
    this.arg = arg1;
    this.function = _function;
  }

  eval(state) {
    return state.push(this);
  }

  call(state) {
    state.push(this.arg);
    return tryCall(this.function, state);
  }

  toString() {
    // toString "lies" a bit, in that it prints as a FunctionLit
    // quotation. If you try to read this representation back in, you
    // will get a FunctionLit, not a CurriedFunction. But it's accurate
    // enough for most purposes.
    return `[ ${this.arg} ${this.function} $ ]${this.modifiers.join("")}`;
  }

};

export var ComposedFunction = class ComposedFunction extends AST {
  readonly first: AST;
  readonly second: AST;

  constructor(first, second) {
    super();
    this.first = first;
    this.second = second;
  }

  eval(state) {
    return state.push(this);
  }

  call(state) {
    tryCall(this.first, state);
    return tryCall(this.second, state);
  }

  toString() {
    // toString "lies" a bit, in that it prints as a FunctionLit
    // quotation. If you try to read this representation back in, you
    // will get a FunctionLit, not a CurriedFunction. But it's accurate
    // enough for most purposes.
    return `[ ${this.first} $ ${this.second} $ ]${this.modifiers.join("")}`;
  }

};

// Types
// "{" - Array start
// "⚐" - Empty fold argument
// "ε" - Null value
export class SentinelValue extends AST {
  readonly type: Str;

  constructor(type) {
    super();
    this.type = type;
    if (typeof this.type === 'string') {
      this.type = Str.fromString(this.type);
    }
  }

  toString() {
    return this.type + this.modifiers.join("");
  }

  eval(state) {
    state.push(this);
  }

  static null = new SentinelValue("ε");
  static whiteFlag = new SentinelValue("⚐");
  static arrayStart = new SentinelValue("{");

};

export class Box extends AST {
  readonly value: AST;

  constructor(value: AST) {
    super();
    this.value = value;
  }

  toString(): string {
    return `${this.value} ⊂${this.modifiers.join("")}`;
  }

  eval(state) {
    state.push(this);
  }


};

export class ArrayLit extends AST {
  readonly data: AST[];

  constructor(data) {
    super();
    this.data = data;
  }

  static filled(n, x) {
    return new ArrayLit(Array(n).fill(x));
  }

  toString() {
    return `{ ${this.data.join(" ")} }${this.modifiers.join("")}`;
  }

  eval(state) {
    state.push(this);
  }

  get length(): number {
    return this.data.length;
  }

};

export var tryCall = function(fn, state) {
  var result;
  if (fn instanceof AST) {
    state.pushCall(fn);
    try {
      result = fn.call(state);
    } finally {
      state.popCall(fn);
    }
    return result;
  } else {
    throw new Error.CallNonFunction(fn);
  }
};

function readAndParseInt(state) {
  var ch, next, sign, v, valid;
  // Skip to the next number
  while ((state.peekInput() != null) && /[^-+0-9]/.test(state.peekInput())) {
    state.readInput();
  }
  // Start reading
  valid = false;
  sign = function(x) {
    return x;
  };
  if ((state.peekInput() != null) && /[-+]/.test(state.peekInput())) {
    ch = state.readInput();
    if (ch === '-') {
      sign = (function(x) {
        return -x;
      });
    }
    valid = true;
  }
  v = 0;
  next = state.peekInput();
  while ((next != null) && /[0-9]/.test(next)) {
    valid = true;
    state.readInput();
    v = v * 10 + parseInt(next, 10);
    next = state.peekInput();
  }
  if (state.peekInput() === void 0 && valid === false) {
    return SentinelValue.null;
  }
  if (!valid) {
    throw new Error.InvalidInput();
  }
  return new NumberLit(sign(v));
};

export var isTruthy = function(c) {
  return !(c instanceof NumberLit) || (c.value !== 0);
};

export var catenate = function(a, b) {
  if (a instanceof ArrayLit && b instanceof ArrayLit) {
    return new ArrayLit(a.data.concat(b.data));
  } else if (a instanceof StringLit && b instanceof StringLit) {
    return new StringLit(a.text.concat(b.text));
  } else {
    throw new Error.TypeError("arrays or strings", new ArrayLit([a, b]));
  }
};

//# sourceMappingURL=ast.js.map
