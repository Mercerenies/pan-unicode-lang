
import { Evaluator } from './eval.js';
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

  call(state: Evaluator): void {
    throw new Error.CallNonFunction(this);
  }

  abstract eval(state: Evaluator): void;

  toException(): Error.Error {
    return new Error.UserError(this);
  }

  getNumMod(arg: number): number;
  getNumMod(arg1: number, arg2: number, ...args: number[]): number[];
  getNumMod(...args: number[]): number | number[] {
    const result: number[] = [];

    // Take modifiers that we have.
    for (const mod of this.modifiers) {
      if (mod instanceof Modifier.NumModifier) {
        result.push(mod.value);
        if (result.length >= args.length) {
          break;
        }
      }
    }

    // Pad from args for everything left.
    while (result.length < args.length) {
      result.push(args[result.length]);
    }

    if (args.length === 1) {
      return result[0];
    } else {
      return result.slice(0, args.length);
    }

  }

  getPrimeMod(): number {
    let n = 0;
    for (const mod of this.modifiers) {
      if (mod instanceof Modifier.PrimeModifier) {
        n += 1;
      }
    }
    return n;
  }

};

export class SimpleCmd extends AST {
  readonly token: Token;

  constructor(token: Token) {
    super();
    this.token = token;
  }

  isNumberLit(): boolean {
    return this.token.tokenType() === TokenType.Number;
  }

  isStringLit(): boolean {
    return this.token.tokenType() === TokenType.String;
  }

  eval(state: Evaluator): void {
    if (this.isNumberLit()) {
      state.push(new NumberLit(this.token.text as number));
    } else if (this.isStringLit()) {
      state.push(new StringLit(this.token.text as Str));
    } else {
      switch (this.token.text.toString()) {
      /* IO */
      case '.': // Pretty print ( x -- )
        state.print(stringify(state.pop()));
        break;
      case ',': // Read integer from input
        state.push(readAndParseInt(state));
        break;
      case '📜': { // Read character from input
        const char = state.readInput();
        if (char != null) {
          state.push(new StringLit(char));
        } else {
          state.push(SentinelValue.null);
        }
        break;
      }
      case '📖': { // Read line from input
        let result = "";
        while (true) {
          const curr = state.readInput();
          if (curr === undefined) {
            break;
          }
          result += curr;
          if (curr === '\n') {
            break;
          }
        }
        if (result !== "") {
          state.push(new StringLit(result));
        } else {
          state.push(SentinelValue.null);
        }
        break;
      }
      case "📚": { // Read all remaining from input
        let result = "";
        while (true) {
          const curr = state.readInput();
          if (curr === undefined) {
            break;
          }
          result += curr;
        }
        if (result !== "") {
          state.push(new StringLit(result));
        } else {
          state.push(SentinelValue.null);
        }
        break;
      }
      /* STACK SHUFFLING */
      case ':': { // Duplicate ( x -- x x )
        // (Numerical modifier determines number of things to duplicate)
        const mod = this.getNumMod(1);
        const x = state.pop(mod);
        state.push(...x);
        state.push(...x);
        break;
      }
      case '%': { // Pop ( x -- )
        // (Numerical modifier determines amount to pop)
        const mod = this.getNumMod(1);
        state.pop(mod);
        break;
      }
      case '@': { // Swap/Rotate ( x y -- y x )
        // (Numerical modifier determines how deep to lift)
        const mod = this.getNumMod(1);
        const store = state.pop(mod);
        const lift = state.pop();
        state.push(...store);
        state.push(lift);
        break;
      }
      case 'ø': { // Over ( x y -- x y x )
        // (Numerical modifier determines how deep to go)
        const mod = this.getNumMod(1);
        const store = state.pop(mod);
        const lift = state.peek();
        state.push(...store);
        state.push(lift);
        break;
      }
      /* ARITHMETIC */
      case '+': // Add ( x y -- z )
        // (Numerical modifier determines arity)
        Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(a.value + b.value);
          },
          preProcess: TypeCheck.isNumber,
          postProcess: id,
          zero: 0,
          extension: Op.binary,
          scalarExtend: true
        });
        break;
      case '-': // Subtract ( x y -- z )
        Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(a.value - b.value);
          },
          preProcess: TypeCheck.isNumber,
          postProcess: id,
          one: function(a) {
            return new NumberLit(-TypeCheck.isNumber(a).value);
          },
          extension: Op.binary,
          scalarExtend: true
        });
        break;
      case '×': // Multiply ( x y -- z )
        Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(a.value * b.value);
          },
          preProcess: TypeCheck.isNumber,
          postProcess: id,
          zero: 1,
          extension: Op.binary,
          scalarExtend: true
        });
        break;
      case '÷': // Divide ( x y -- z )
        Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(a.value / b.value);
          },
          preProcess: TypeCheck.isNumber,
          postProcess: id,
          one: function(a) {
            return new NumberLit(1 / TypeCheck.isNumber(a).value);
          },
          extension: Op.binary,
          scalarExtend: true
        });
        break;
      case '*': // Power ( x y -- z )
        Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(a.value ** b.value);
          },
          preProcess: TypeCheck.isNumber,
          postProcess: id,
          zero: 1,
          extension: Op.binaryRight,
          scalarExtend: true
        });
        break;
      case 'ê': // e^x ( x -- y )
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.exp(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      case '🌳': // ln(x) ( x -- y )
        // With prime modifier, it's log_b(a) ( a b -- y )
        if (this.getPrimeMod() > 0) {
          Op.op(state, this, {
            function: function(a, b) {
              return new NumberLit(Math.log(a.value) / Math.log(b.value));
            },
            preProcess: TypeCheck.isNumber,
            postProcess: id,
            extension: Op.binary,
            scalarExtend: true
          });
        } else {
          state.push(Op.scalarExtendUnary(function(x) {
            return Math.log(TypeCheck.isNumber(x).value);
          })(state.pop()));
        }
        break;
      case '√': // sqrt(x) ( x -- y )
        // With prime modifier, it's (a ** (1/b)) ( a b -- y )
        if (this.getPrimeMod() > 0) {
          Op.op(state, this, {
            function: function(a, b) {
              return new NumberLit(a.value ** (1 / b.value));
            },
            preProcess: TypeCheck.isNumber,
            postProcess: id,
            extension: Op.binary,
            scalarExtend: true
          });
        } else {
          state.push(Op.scalarExtendUnary(function(x) {
            return Math.sqrt(TypeCheck.isNumber(x).value);
          })(state.pop()));
        }
        break;
      case '|': // Remainder ( x y -- z )
        // This does not extend with modifier; it only scalar extends
        Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit((a.value % b.value + b.value) % b.value); // "True" mod
          },
          preProcess: TypeCheck.isNumber,
          postProcess: id,
          scalarExtend: true
        });
        break;
      case '⩑': // LCM ( x y -- z )
        Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(lcm(a.value, b.value));
          },
          preProcess: TypeCheck.isNumber,
          postProcess: id,
          zero: 1,
          extension: Op.binary,
          scalarExtend: true
        });
        break;
      case '⩒': // GCD ( x y -- z )
        Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(gcd(a.value, b.value));
          },
          preProcess: TypeCheck.isNumber,
          postProcess: id,
          zero: 0,
          extension: Op.binary,
          scalarExtend: true
        });
        break;
      case '_': // Negate ( x -- y )
        state.push(Op.scalarExtendUnary(function(x) {
          return -TypeCheck.isNumber(x).value;
        })(state.pop()));
        break;
      case '⅟': // Reciprocal ( x -- y )
        state.push(Op.scalarExtendUnary(function(x) {
          return 1 / TypeCheck.isNumber(x).value;
        })(state.pop()));
        break;
      case '⌉': // Ceiling ( x -- y )
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.ceil(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      case '⌋': // Floor ( x -- y )
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.floor(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      case 'A': // Absolute value ( x -- y )
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.abs(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      case 'a': // Signum ( x -- y )
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.sign(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      case '∧': // Bitwise Conjunction ( x y -- z )
        Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(a.value & b.value);
          },
          preProcess: TypeCheck.isNumber,
          postProcess: id,
          zero: -1,
          extension: Op.binary,
          scalarExtend: true
        });
        break;
      case '∨': // Bitwise Disjunction ( x y -- z )
        Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(a.value | b.value);
          },
          preProcess: TypeCheck.isNumber,
          postProcess: id,
          zero: 0,
          extension: Op.binary,
          scalarExtend: true
        });
        break;
      case '⊕': // Bitwise Exclusive Or ( x y -- z )
        Op.op(state, this, {
          function: function(a, b) {
            return new NumberLit(a.value ^ b.value);
          },
          preProcess: TypeCheck.isNumber,
          postProcess: id,
          zero: 0,
          extension: Op.binary,
          scalarExtend: true
        });
        break;
      case '¬': // Bitwise Negate ( x -- y )
        state.push(Op.scalarExtendUnary(function(x) {
          return ~TypeCheck.isNumber(x).value;
        })(state.pop()));
        break;
      case '¿': // Defined-or ( x y -- z )
        // Returns the first argument unless it's ε, in which
        // case it returns the second.
        Op.op(state, this, {
          function: function(a: AST, b: AST): AST {
            if (equals(a, SentinelValue.null)) {
              return b;
            } else {
              return a;
            }
          },
          preProcess: id,
          postProcess: id,
          zero: SentinelValue.null,
          extension: Op.binary,
          scalarExtend: false
        });
        break;
      /* TRIGONOMETRY */
      case '◐':
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.sin(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      case '◑':
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.asin(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      case '◒':
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.cos(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      case '◓':
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.acos(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      case '◔':
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.tan(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      case '◕':
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.atan(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      case '◖':
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.sinh(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      case '◗':
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.asinh(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      case '◌':
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.cosh(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      case '◍':
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.acosh(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      case '◎':
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.tanh(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      case '◉':
        state.push(Op.scalarExtendUnary(function(x) {
          return Math.atanh(TypeCheck.isNumber(x).value);
        })(state.pop()));
        break;
      /* NUMERICAL CONSTANTS */
      case 'π':
        state.push(Math.PI);
        break;
      case 'τ':
        state.push(2 * Math.PI);
        break;
      case 'e':
        state.push(Math.E);
        break;
      case '¼':
        state.push(1 / 4);
        break;
      case '½':
        state.push(1 / 2);
        break;
      case '¾':
        state.push(3 / 4);
        break;
      case '⅐':
        state.push(1 / 7);
        break;
      case '⅑':
        state.push(1 / 9);
        break;
      case '⅒':
        state.push(1 / 10);
        break;
      case '⅓':
        state.push(1 / 3);
        break;
      case '⅔':
        state.push(2 / 3);
        break;
      case '⅕':
        state.push(1 / 5);
        break;
      case '⅖':
        state.push(2 / 5);
        break;
      case '⅗':
        state.push(3 / 5);
        break;
      case '⅘':
        state.push(4 / 5);
        break;
      case '⅙':
        state.push(1 / 6);
        break;
      case '⅚':
        state.push(5 / 6);
        break;
      case '⅛':
        state.push(1 / 8);
        break;
      case '⅜':
        state.push(3 / 8);
        break;
      case '⅝':
        state.push(5 / 8);
        break;
      case '⅞':
        state.push(7 / 8);
        break;
      case '↉':
        state.push(0 / 3);
        break;
      /* STRING OPERATIONS */
      case '⋄': // Concatenate ( x y -- z )
        // (Numerical modifier determines arity)
        // No scalar extension. Works on lists and on strings.
        Op.op(state, this, {
          function: catenate,
          preProcess: TypeCheck.isStringOrList,
          postProcess: id,
          zero: new StringLit(""),
          extension: Op.binary,
          scalarExtend: false
        });
        break;
      case '💬': { // Chr / Ord ( x -- y )
        let arg = state.pop();
        if (arg instanceof NumberLit) {
          arg = new ArrayLit([arg]);
        }
        if (arg instanceof ArrayLit) {
          const res: string[] = [];
          for (const c of arg.data) {
            if (!(c instanceof NumberLit)) {
              throw new Error.TypeError("number", c);
            }
            res.push(String.fromCodePoint(c.value));
          }
          state.push(new StringLit(new Str(res)));
          break;
        } else if (arg instanceof StringLit) {
          const res = arg.text.codePoints();
          state.push(new ArrayLit(res.map((x) => new NumberLit(x))));
          break;
        } else {
          throw new Error.TypeError("string or list", arg);
        }
        break;
      }
      case '🍴': { // Chomp ( x -- y )
        // Removes the last character if it's a newline. Subject to scalar extension.
        const chomp = function(x0: StringLit) {
          const x = x0.text;
          const result = x.charAt(x.length - 1) === '\n' ? Str.fromString(x.toString().slice(0, x.length - 1)) : x;
          return new StringLit(result);
        };
        state.push(Op.scalarExtendUnary(function(x) {
          return chomp(TypeCheck.isString(x));
        })(state.pop()));
        break;
      }
      case 'r': { // Mark as regexp ( s -- s )
        const s = TypeCheck.isString(state.pop());
        state.push(new StringLit(s.text).markAsRegexp());
        break;
      }
      case '¶': { // Split string ( s delim -- arr )
        // Delimiter can be either string or regexp
        const [s0, delim0] = state.pop(2);
        let delim = TypeCheck.isString(delim0).toReOrStr();
        if (delim === "") {
          // Awkward hack for UTF-16 support (we don't want to pass
          // empty string to split function)
          delim = new RegExp("", "u");
        }
        const s = TypeCheck.isString(s0);
        const result = s.text.toString().split(delim).map(function(x) {
          return new StringLit(Str.fromString(x));
        });
        state.push(new ArrayLit(result));
        break;
      }
      case '⁋': { // Join string ( arr delim -- s )
        // Delimiter should be a string. Other argument should be list of strings.
        const [arr0, delim0] = state.pop(2);
        const arr = TypeCheck.isList(arr0);
        const delim = stringify(delim0);
        const result = new StringLit(arr.data.map(stringify).join(delim));
        state.push(result);
        break;
      }
      case 'p': { // Prettify ( x -- s )
        // Converts the value to a string. No-op if given a string.
        const x = state.pop();
        state.push(new StringLit(stringify(x)));
        break;
      }
      /* COMPARISONS */
      case '=': // Equal ( x y -- ? )
        Op.op(state, this, {
          function: function(a, b) {
            return equals(a, b);
          },
          preProcess: id,
          postProcess: Op.boolToInt,
          zero: -1,
          extension: Op.mergeAnd,
          scalarExtend: true,
          whiteFlag: Op.WhiteFlag.ignore
        });
        break;
      case '<': // LT ( x y -- ? )
        Op.op(state, this, {
          function: function(a, b) {
            return compare(a, b) === Ordering.LT;
          },
          preProcess: id,
          postProcess: Op.boolToInt,
          zero: -1,
          extension: Op.mergeAnd,
          scalarExtend: true,
          whiteFlag: Op.WhiteFlag.ignore
        });
        break;
      case '>': // GT ( x y -- ? )
        Op.op(state, this, {
          function: function(a, b) {
            return compare(a, b) === Ordering.GT;
          },
          preProcess: id,
          postProcess: Op.boolToInt,
          zero: -1,
          extension: Op.mergeAnd,
          scalarExtend: true,
          whiteFlag: Op.WhiteFlag.ignore
        });
        break;
      case '≤': // LE ( x y -- ? )
        Op.op(state, this, {
          function: function(a, b) {
            return compare(a, b) !== Ordering.GT;
          },
          preProcess: id,
          postProcess: Op.boolToInt,
          zero: -1,
          extension: Op.mergeAnd,
          scalarExtend: true,
          whiteFlag: Op.WhiteFlag.ignore
        });
        break;
      case '≥': // GE ( x y -- ? )
        Op.op(state, this, {
          function: function(a, b) {
            return compare(a, b) !== Ordering.LT;
          },
          preProcess: id,
          postProcess: Op.boolToInt,
          zero: -1,
          extension: Op.mergeAnd,
          scalarExtend: true,
          whiteFlag: Op.WhiteFlag.ignore
        });
        break;
      case '≠': // Not Equal ( x y -- ? )
        Op.op(state, this, {
          function: function(a, b) {
            return !equals(a, b);
          },
          preProcess: id,
          postProcess: Op.boolToInt,
          zero: -1,
          extension: Op.mergeAnd,
          scalarExtend: true,
          whiteFlag: Op.WhiteFlag.ignore
        });
        break; // TODO More advanced merging for ≠ and ≢ (they're not transitive)
      case '≡': // Same ( x y -- ? )
        // Note: No scalar extension
        Op.op(state, this, {
          function: function(a, b) {
            return equals(a, b);
          },
          preProcess: id,
          postProcess: Op.boolToInt,
          zero: -1,
          extension: Op.mergeAnd,
          scalarExtend: false,
          whiteFlag: Op.WhiteFlag.ignore
        });
        break;
      case '≢': // Not Same ( x y -- ? )
        // Note: No scalar extension
        Op.op(state, this, {
          function: function(a, b) {
            return !equals(a, b);
          },
          preProcess: id,
          postProcess: Op.boolToInt,
          zero: -1,
          extension: Op.mergeAnd,
          scalarExtend: false,
          whiteFlag: Op.WhiteFlag.ignore
        });
        break;
      case '⌈': { // Max
        // With prime, pops a function and uses it instead of
        // default less-than.
        const func = this.getPrimeMod() > 0 ? customLT(state, state.pop()) : defaultLT;
        Op.op(state, this, {
          function: function(a, b) {
            if (func(b, a)) {
              return a;
            } else {
              return b;
            }
          },
          preProcess: id,
          postProcess: id,
          zero: -2e308,
          extension: Op.binary,
          scalarExtend: true
        });
        break;
      }
      case '⌊': { // Min
        // With prime, pops a function and uses it instead of
        // default less-than.
        const func = this.getPrimeMod() > 0 ? customLT(state, state.pop()) : defaultLT;
        Op.op(state, this, {
          function: function(a, b) {
            if (func(a, b)) {
              return a;
            } else {
              return b;
            }
          },
          preProcess: id,
          postProcess: id,
          zero: 2e308,
          extension: Op.binary,
          scalarExtend: true
        });
        break;
      }
      /* METAPROGRAMMING */
      case 's': { // Get stack frame
        // (Numerical argument determines how deep to go; n=0 is current)
        const mod = this.getNumMod(0);
        const frame = state.getFromCallStack(mod);
        state.push(frame);
        break;
      }
      case '{':
      case '⚐':
      case 'ε': // Sentinel value
        state.push(new SentinelValue(this.token.text as Str));
        break;
      case '⚑': { // Construct ⚐ sentinel ( fn deffn -- fn )
        // Constructs a handler for the ⚐ sentinel. The resulting
        // function will call deffn if the top value of the stack is
        // ⚐ (popping ⚐), or will call fn otherwise (without popping
        // anything off the stack a priori). This is useful for
        // providing a "default" value to fold (/) in the case of an
        // empty list.

        // For instance, [`+ `999 ⚑ /] is a function which sums a
        // list, but returns 999 rather than 0 if the list is empty.
        const [fn, deffn] = state.pop(2);
        state.push(new FunctionLit([
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
        break;
      }
      /* ARRAY LITERALS */
      case '}': { // End array (pops until sentinel value is hit)
        const arr: AST[] = [];
        let value = state.pop();
        while (!equals(value, SentinelValue.arrayStart)) {
          arr.push(value);
          value = state.pop();
        }
        state.push(new ArrayLit(arr.reverse()));
        break;
      }
      /* LIST OPERATIONS */
      case '/': { // Fold ( ..a list ( ..a x y -- ..b z ) -- ..b t )
        // This one bears a bit of explanation. If the list is
        // nonempty, it acts like a traditional fold, applying the
        // binary operation between all elements of the list,
        // associating to the left. If the list is empty, it pushes
        // the special sentinel value ⚐ to the stack then calls the
        // function once. Built-in functions like + and × know to
        // check for the ⚐ and will return their identity (0 and 1,
        // resp.) in that case. If you provide your own function, you
        // can deal with the empty case by checking for ⚐.
        const [list0, func] = state.pop(2);
        const list = TypeCheck.isList(list0);
        if (list.length <= 0) {
          state.push(SentinelValue.whiteFlag);
          tryCall(func, state);
        } else {
          const acc = list.data[0];
          state.push(acc);
          list.data.slice(1).forEach(function(datum: AST) {
            state.push(datum);
            tryCall(func, state);
          })
        }
        break;
      }
      case '\\': { // Scan ( ..a list ( ..a x y -- ..b z ) -- ..b t )
        // This works just like fold (/) except that it returns a
        // list of all the intermediate results. The ⚐ caveat does
        // not apply, for if the empty list is given as input, then
        // the empty list is produced as output.
        const [list0, func] = state.pop(2);
        const list = TypeCheck.isList(list0);
        if (list.length <= 0) {
          state.push(new ArrayLit([]));
        } else {
          const acc = list.data[0];
          const result: AST[] = [];
          state.push(acc);
          list.data.slice(1).forEach(function(datum: AST) {
            result.push(state.peek());
            state.push(datum);
            tryCall(func, state);
          });
          result.push(state.pop());
          state.push(new ArrayLit(result));
        }
        break;
      }
      case '⌿': // Filter ( ..a list ( ..a x -- ..a ? ) -- ..a list )
        // The filter "function" can either be a function or a list
        // with the same length as the list, which acts as a mask. In
        // either case, the absolute value of the result at each
        // position is used to determine the number of times to
        // repeat the value. Numerical argument (default=1)
        // determines how many nested lists to go. See documentation
        // for ListOp.filter for more specific details.
        ListOp.filter(this, state);
        break;
      case '¨': // Map ( ..a list ( ..a x -- ..a y ) -- ..a list )
        // Nests arbitrarily deep with a numerical argument, like
        // filter. See ListOp.map for full details.
        ListOp.map(this, state);
        break;
      case 'ė': // Each ( ..a list ( ..a x -- ..a ) -- ..a )
        // Nests arbitrarily deep with a numerical argument, like
        // filter. See ListOp.each for full details.
        ListOp.each(this, state);
        break;
      case 'n': // Nested Query ( list index -- result )
        // Works on lists or strings. See ListOp.nestedQuery
        // for details.
        ListOp.nestedQuery(this, state);
        break;
      case '⊇': // Select ( list index -- result )
        // Works on lists or strings. See ListOp.select
        // for details.
        ListOp.select(this, state);
        break;
      case '⍋': // Grade Up
        // Sorting function. See ListOp.gradeUp for full details.
        ListOp.gradeUp(this, state);
        break;
      case '⍪': // Ravel / Flatten
        // Flattens lists. See ListOp.ravel for full details.
        ListOp.ravel(this, state);
        break;
      case '⊗': // Outer Product
        // Outer product of lists under some operation. See ListOp.outerProduct.
        ListOp.outerProduct(this, state);
        break;
      case '∷': // Prepend / Append
        if (this.getPrimeMod() === 0) {
          // With no prime, prepends some number of elements to a list
          Op.op(state, this, {
            function: function(x, list) {
              return new ArrayLit([x].concat(TypeCheck.isList(list).data));
            },
            preProcess: id,
            postProcess: id,
            extension: Op.binaryRight,
            scalarExtend: false,
            defaultModifier: 1,
            modifierAdjustment: function(x) {
              return x + 1;
            }
          });
        } else {
          // With prime, appends some number of elements to a list
          Op.op(state, this, {
            function: function(x, list) {
              return new ArrayLit(TypeCheck.isList(list).data.concat([x]));
            },
            preProcess: id,
            postProcess: id,
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
        state.push(ListOp.nth(state.pop(), value) ?? SentinelValue.null);
        break;
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
        state.push(ListOp.nth(state.pop(), -value) ?? SentinelValue.null);
        break;
      }
      case '∈': // Member ( list x -- idx )
        // List membership. See ListOp.member for details
        ListOp.member(this, state);
        break;
      case '#': // Length ( list -- n )
        // List length. See ListOp.length for details
        ListOp.length(this, state);
        break;
      case '🗋': { // Empty ( list -- ? )
        // With prime modifier, flattens before checking
        if (this.getPrimeMod() > 0) {
          const newTerm = new SimpleCmd(new Token('⍪'));
          newTerm.modifiers.push(new Modifier.NumModifier(Modifier.MAX_NUM_MODIFIER));
          ListOp.ravel(newTerm, state);
        }
        const list = TypeCheck.isList(state.pop());
        state.push(Op.boolToInt(list.length === 0));
        break;
      }
      case 'ℓ': { // List constructor
        // Takes as many arguments as numerical modifier (default=1) specifies
        const num = this.getNumMod(1);
        const arr = new ArrayLit(state.pop(num));
        state.push(arr);
        break;
      }
      case '◁': { // Take (left) ( list n -- list )
        const [list0, n0] = state.pop(2);
        const list = TypeCheck.isList(list0);
        const n = Math.abs(TypeCheck.isNumber(n0).value);
        state.push(new ArrayLit(list.data.slice(0, n)));
        break;
      }
      case '▷': { // Take (right) ( list n -- list )
        const [list0, n0] = state.pop(2);
        const list = TypeCheck.isList(list0);
        const n = Math.abs(TypeCheck.isNumber(n0).value);
        state.push(new ArrayLit(list.data.slice(-n)));
        break;
      }
      case '⧏': { // Drop (left) ( list n -- list )
        const [list0, n0] = state.pop(2);
        const list = TypeCheck.isList(list0);
        const n = Math.abs(TypeCheck.isNumber(n0).value);
        state.push(new ArrayLit(list.data.slice(n)));
        break;
      }
      case '⧐': { // Drop (right) ( list n -- list )
        const [list0, n0] = state.pop(2);
        const list = TypeCheck.isList(list0);
        const n = Math.abs(TypeCheck.isNumber(n0).value);
        state.push(new ArrayLit(list.data.slice(0, -n)));
        break;
      }
      case '◂': { // Take while (left) ( list f -- list )
        const [list0, f] = state.pop(2);
        const list = TypeCheck.isList(list0);
        const result: AST[] = [];
        for (const elem of list.data) {
          state.push(elem);
          tryCall(f, state);
          const curr = isTruthy(state.pop());
          if (!curr) {
            break;
          }
          result.push(elem);
        }
        state.push(new ArrayLit(result));
        break;
      }
      case '▸': { // Take while (right) ( list f -- list )
        const [list0, f] = state.pop(2);
        const list = TypeCheck.isList(list0);
        const result: AST[] = [];
        for (const elem of list.data.slice().reverse()) {
          state.push(elem);
          tryCall(f, state);
          const curr = isTruthy(state.pop());
          if (!curr) {
            break;
          }
          result.push(elem);
        }
        state.push(new ArrayLit(result));
        break;
      }
      case '◄': { // Drop while (left) ( list f -- list )
        const [list0, f] = state.pop(2);
        const list = TypeCheck.isList(list0);
        let i = 0;
        for (const elem of list.data) {
          state.push(elem);
          tryCall(f, state);
          const curr = isTruthy(state.pop());
          if (!curr) {
            break;
          }
          i += 1;
        }
        state.push(new ArrayLit(list.data.slice(i)));
        break;
      }
      case '►': { // Drop while (right) ( list f -- list )
        const [list0, f] = state.pop(2);
        const list = TypeCheck.isList(list0);
        let i = 0;
        for (const elem of list.data.slice().reverse()) {
          state.push(elem);
          tryCall(f, state);
          const curr = isTruthy(state.pop());
          if (!curr) {
            break;
          }
          i += 1;
        }
        state.push(new ArrayLit(list.data.slice(0, list.length - i)));
        break;
      }
      case 'ɹ': { // Reverse ( list -- list )
        const list = TypeCheck.isStringOrList(state.pop());
        if (list instanceof ArrayLit) {
          state.push(new ArrayLit(list.data.slice().reverse()));
        } else {
          state.push(new StringLit(list.text.reversed()));
        }
        break;
      }
      case '⍴': // Reshape ( list shape -- list )
        // See ListOp.reshape
        ListOp.reshape(this, state);
        break;
      /* CONTROL FLOW */
      case 'i': { // If ( ..a ? ( ..a -- ..b ) ( ..a -- ..b ) -- ..b )
        const [c, t, f] = state.pop(3);
        if (isTruthy(c)) {
          tryCall(t, state);
        } else {
          tryCall(f, state);
        }
        break;
      }
      case 'w': { // While ( ..a ( ..a -- ..b ? ) ( ..b -- ..a ) -- ..b )
        const [cond, body] = state.pop(2);
        while (true) {
          tryCall(cond, state);
          const result = state.pop();
          if (!isTruthy(result)) {
            break;
          }
          tryCall(body, state);
        }
        break;
      }
      case 'W': { // While ( ..a ( ..a -- ..a ? ) -- ..b )
        // Like w but with no explicit body.
        const cond = state.pop();
        while (true) {
          tryCall(cond, state);
          const result = state.pop();
          if (!isTruthy(result)) {
            break;
          }
        }
        break;
      }
      case '⍳': { // Repeat N times ( ..a n ( ..a i -- ..a ) -- ..a )
        const [n, body] = state.pop(2);
        for (let i = 0; i < TypeCheck.isNumber(n).value; i++) {
          state.push(i);
          tryCall(body, state);
        }
        break;
      }
      case '⍸': // Repeat N times and accumulate ( ..a x n ( ..a x i -- ..a x ) -- ..a list )
        const [n, body] = state.pop(2);
        const result = [state.peek()];
        for (let i = 0; i < TypeCheck.isNumber(n).value; i++) {
          state.push(i);
          tryCall(body, state);
          result.push(state.peek());
        }
        state.pop();
        state.push(new ArrayLit(result));
        break;
      case '$': { // Call ( ..a ( ..a -- ..b ) -- ..b )
        const fn = state.pop();
        tryCall(fn, state);
        break;
      }
      case '😱': // Panic and throw error ( err -- )
        throw state.pop().toException();
        break;
      case '🙏': { // Catch errors ( ..a ( ..a -- ..b) ( ..a err -- ..b ) -- ..b )
        const [tryBlock, recoverBlock] = state.pop(2);
        const savedStack = state.saveStack();
        try {
          // TODO Don't piggyback on JS error handling; implement it in our VM
          tryCall(tryBlock, state);
        } catch (error) {
          const exc = error;
          if (exc instanceof Error.Error) {
            state.loadStack(savedStack);
            state.push(StringLit.fromException(exc));
            tryCall(recoverBlock, state);
          } else {
            throw exc;
          }
        }
        break;
      }
      /* HIGHER ORDER FUNCTIONS */
      case 'ī': // Push identity function
        state.push(new FunctionLit([]));
        break;
      case 'c': { // Make constant function ( x -- ( -- x ) )
        // Numerical argument (defaults to zero) determines number to
        // pop in resulting function.
        const num = this.getNumMod(0);
        const x = state.pop();
        const dropCmd = new SimpleCmd(new Token("%"));
        dropCmd.modifiers.push(new Modifier.NumModifier(num));
        const dropper = new FunctionLit([dropCmd]);
        state.push(new ComposedFunction(dropper, new CurriedFunction(x, new FunctionLit([]))));
        break;
      }
      case '●': // Curry ( x ( ..a x -- ..b ) -- ( ..a -- ..b ) )
        Op.op(state, this, {
          function: function(x, f) {
            return new CurriedFunction(x, f);
          },
          preProcess: id,
          postProcess: id,
          extension: Op.binaryRight,
          scalarExtend: false,
          defaultModifier: 1,
          modifierAdjustment: function(x) {
            return x + 1;
          }
        });
        break;
      case '○': // Compose ( ( ..a -- ..b ) ( ..b -- ..c ) -- ( ..a -- ..c ) )
        Op.op(state, this, {
          function: function(f, g) {
            return new ComposedFunction(f, g);
          },
          preProcess: id,
          postProcess: id,
          extension: Op.binaryRight,
          scalarExtend: false,
          zero: function() {
            return new FunctionLit([]);
          },
          defaultModifier: 2
        });
        break;
      /* BOXING / UNBOXING */
      case '⊂': { // Box ( x -- box )
        const value = state.pop();
        state.push(new Box(value));
        break;
      }
      case '⊃': { // Unbox ( box -- x )
        // No effect if value is not boxed
        const value = state.pop();
        state.push(value instanceof Box ? value.value : value);
        break;
      }
      /* STACK COMBINATORS */
      case 'D': { // Dip ( ..a x ( ..a -- ..b ) -- ..b x )
        // (Numerical modifier determines arity)
        const mod = this.getNumMod(1);
        const fn = state.pop();
        const preserve = state.pop(mod);
        tryCall(fn, state);
        state.push(...preserve);
        break;
      }
      case 'K': { // Keep ( ..a x ( ..a x -- ..b ) -- ..b x )
        // (Numerical modifier determines arity)
        const mod = this.getNumMod(1);
        const fn = state.pop();
        const preserve = state.peek(mod);
        tryCall(fn, state);
        state.push(...preserve);
        break;
      }
      case '⇉': // "Spread" combinator, in Factor parlance
        // See StackOp.spread for details.
        StackOp.spread(this, state);
        break;
      case '⤨': // "Cross" combinator
        // See StackOp.cross for details
        StackOp.cross(this, state);
        break;
      case '↘': // "Apply" combinator
        // See StackOp.cleave for details
        StackOp.apply(this, state);
        break;
      case '↗': // "Cleave" combinator
        // See StackOp.apply for details
        StackOp.cleave(this, state);
        break;
      default:
        throw new Error.UnknownCommandError(this.token);
        break;
      }
    }
  }

  toString(): string {
    return this.token.toString() + this.modifiers.join("");
  }

}


export class AssignToVar extends AST {
  readonly target: string;

  constructor(target: string | Token) {
    super();
    this.target = target.toString();
  }

  eval(state: Evaluator): void {
    state.setGlobal(this.target, state.pop());
  }

  toString(): string {
    return "→" + this.target;
  }

};

export class ReadFromVar extends AST {
  readonly target: string;

  constructor(target: string | Token) {
    super();
    this.target = target.toString();
  }

  eval(state: Evaluator): void {
    state.push(state.getGlobal(this.target));
  }

  toString(): string {
    return "←" + this.target;
  }

};

// StringLit actually encompasses a few things here. A string literal
// consists of, obviously, a sequence of characters. Additionally, a
// string literal can consist of a regex flag (Boolean) which
// specifies that it is to be treated as a regex, not a literal
// string, when used as an argument to search/replace functions. A
// string literal can also contain an exception object from which it
// was constructed. If a string literal is thrown and has an exception
// associated to it, then that exception will be thrown. Otherwise,
// the string will be wrapped in a new UserError exception.
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

  markWithException(exc: Error.Error): StringLit {
    return new StringLit(this.text, this.regexp, exc);
  }

  isRegexp(): boolean {
    return this.regexp;
  }

  hasException(): boolean {
    return this.exception != null;
  }

  eval(state: Evaluator): void {
    state.push(this);
  }

  toReOrStr(): string | RegExp {
    if (this.isRegexp()) {
      return new RegExp(this.text.toString(), "u");
    } else {
      return this.text.toString();
    }
  }

  toString(): string {
    return escapeString(this.text) + (this.isRegexp() ? "r" : "");
  }

  toException(): Error.Error {
    if (this.exception != null) {
      return this.exception;
    } else {
      return super.toException();
    }
  }

  static fromException(exc: Error.Error): StringLit {
    return new StringLit(Str.fromString(exc.toString())).markWithException(exc);
  }

};

export class NumberLit extends AST {
  readonly value: number;

  constructor(value: number) {
    super();
    this.value = value;
  }

  eval(state: Evaluator): void {
    state.push(this);
  }

  toString(): string {
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

export class FunctionLit extends AST {
  readonly body: AST[];

  constructor(body: AST[]) {
    super();
    this.body = body;
  }

  eval(state: Evaluator): void {
    state.push(this);
  }

  call(state: Evaluator): void {
    state.eval(this.body);
  }

  toString(): string {
    return `[ ${this.body.join(" ")} ]${this.modifiers.join("")}`;
  }

};

export class CurriedFunction extends AST {
  readonly arg: AST;
  readonly function: AST;

  constructor(arg: AST, _function: AST) {
    super();
    this.arg = arg;
    this.function = _function;
  }

  eval(state: Evaluator): void {
    state.push(this);
  }

  call(state: Evaluator): void {
    state.push(this.arg);
    tryCall(this.function, state);
  }

  toString(): string {
    // toString "lies" a bit, in that it prints as a FunctionLit
    // quotation. If you try to read this representation back in, you
    // will get a FunctionLit, not a CurriedFunction. But it's
    // accurate enough for most purposes.
    return `[ ${this.arg} ${this.function} $ ]${this.modifiers.join("")}`;
  }

};

export class ComposedFunction extends AST {
  readonly first: AST;
  readonly second: AST;

  constructor(first: AST, second: AST) {
    super();
    this.first = first;
    this.second = second;
  }

  eval(state: Evaluator): void {
    state.push(this);
  }

  call(state: Evaluator): void {
    tryCall(this.first, state);
    tryCall(this.second, state);
  }

  toString(): string {
    // toString "lies" a bit, in that it prints as a FunctionLit
    // quotation. If you try to read this representation back in, you
    // will get a FunctionLit, not a CurriedFunction. But it's
    // accurate enough for most purposes.
    return `[ ${this.first} $ ${this.second} $ ]${this.modifiers.join("")}`;
  }

};

// Types
// "{" - Array start
// "⚐" - Empty fold argument
// "ε" - Null value
export class SentinelValue extends AST {
  readonly type: Str;

  constructor(type: string | Str) {
    super();
    if (typeof type === 'string') {
      type = Str.fromString(type);
    }
    this.type = type;
  }

  toString(): string {
    return this.type + this.modifiers.join("");
  }

  eval(state: Evaluator): void {
    state.push(this);
  }

  static null = new SentinelValue("ε");
  static whiteFlag = new SentinelValue("⚐");
  static arrayStart = new SentinelValue("{");

}


export class Box extends AST {
  readonly value: AST;

  constructor(value: AST) {
    super();
    this.value = value;
  }

  toString(): string {
    return `${this.value} ⊂${this.modifiers.join("")}`;
  }

  eval(state: Evaluator): void {
    state.push(this);
  }

}


export class ArrayLit extends AST {
  readonly data: AST[];

  constructor(data: AST[]) {
    super();
    this.data = data;
  }

  static filled(n: number, x: AST): ArrayLit {
    return new ArrayLit(Array(n).fill(x));
  }

  toString(): string {
    return `{ ${this.data.join(" ")} }${this.modifiers.join("")}`;
  }

  eval(state: Evaluator): void {
    state.push(this);
  }

  get length(): number {
    return this.data.length;
  }

};

export function tryCall(fn: AST, state: Evaluator): void {
  if (fn instanceof AST) {
    state.pushCall(fn);
    try {
      fn.call(state);
    } finally {
      state.popCall();
    }
  } else {
    throw new Error.CallNonFunction(fn);
  }
};

// TODO Why is this being done both here and in the parser? Consolidate?
function readAndParseInt(state: Evaluator): NumberLit | SentinelValue {
  // Skip to the next number
  let input = state.peekInput();
  while ((input != null) && /[^-+0-9]/.test(input)) {
    state.readInput();
    input = state.peekInput();
  }
  // Start reading
  let valid = false;
  let sign = (x: number) => x;
  const signInput = state.peekInput();
  if ((signInput != null) && /[-+]/.test(signInput)) {
    const ch = state.readInput();
    if (ch === '-') {
      sign = (x: number) => -x;
    }
    valid = true;
  }
  let v = 0;
  let next = state.peekInput();
  while ((next != null) && /[0-9]/.test(next)) {
    valid = true;
    state.readInput();
    v = v * 10 + parseInt(next, 10);
    next = state.peekInput();
  }
  if (state.peekInput() === undefined && valid === false) {
    return SentinelValue.null;
  }
  if (!valid) {
    // We consumed input but are still invalid; that's a bad parse
    // (should not happen at all)
    throw new Error.InvalidInput();
  }
  return new NumberLit(sign(v));
}


export function isTruthy(c: AST): boolean {
  return !(c instanceof NumberLit) || (c.value !== 0);
}


export function catenate(a: AST, b: AST): AST {
  if (a instanceof ArrayLit && b instanceof ArrayLit) {
    return new ArrayLit(a.data.concat(b.data));
  } else if (a instanceof StringLit && b instanceof StringLit) {
    return new StringLit(a.text.concat(b.text));
  } else {
    throw new Error.TypeError("arrays or strings", new ArrayLit([a, b]));
  }
}


function id(a: AST): AST {
  return a;
}
