// Generated by CoffeeScript 2.5.1
var cartesianProductRec, filterTestFunc, getNodeLength, rebuild, runEach, runFilter, runMap,
  splice = [].splice;

import * as Error from './error.js';

import {
  ArrayLit,
  FunctionLit,
  NumberLit,
  StringLit,
  SentinelValue,
  tryCall,
  isTruthy,
  SimpleCmd
} from './ast.js';

import {
  NumModifier,
  MAX_NUM_MODIFIER
} from './modifier.js';

import Str from './str.js';

import {
  customLT,
  defaultLT,
  equals
} from './comparison.js';

import {
  isList
} from './type_check.js';

import {
  Token
} from './token.js';

// Filter (⌿) always takes exactly two arguments off the stack. Its
// behavior is very general. The numerical modifier determines the
// maximum depth that we will dig into the list argument (the first
// argument). So, for instance, if our list argument is

// { 0 { 1 } { { 2 } 3 } }

// Then a modifier of ③ will operate on 0, 1, 2, 3. A modifier of ②
// will operate on 0, 1, {2}, 3. A modifier of ① (the default) will
// operate on 0, {1}, {{2} 3}. A modifier of ⓪ will operate on the list
// as a whole. Note that a modifier of ⑳ is treated as infinity and
// will nest arbitrarily deep.

// For each position in the original list at index (i1, i2, ..., in),
// we get the corresponding entry from the function argument. If the
// function argument is not nested as deeply, then we simply access as
// many indices as possible until we reach a non-list. The result shall
// be either a number or a function. If it's a function, it's called
// with the value as an argument and should return a number. The
// absolute value of the number, in either case, determines the number
// of times to repeat the argument.

// Examples: (Assume f, g, h are function literals)

// { 0 1 2 } f ⌿ will call f for each of 0, 1, 2

// { 0 1 { 2 } } f ⌿ will call f for each of 0, 1, {2}

// { 0 1 { 2 } } f② ⌿ will call f for each of 0, 1, 2

// { 0 1 { 2 } } { f g h } ⌿ will call f on 0, g on 1, h on {2}

// { 0 1 { 2 } } { f g h } ⌿② will call f on 0, g on 1, h on 2

// { 0 {1 2} } { f g } ⌿② will call f on 0, g on 1, g on 2

// { 0 {1 2} } { f {g h} } ⌿② will call f on 0, g on 1, h on 2

// In any example above, we can replace a function with a number, and
// it will be treated as a constant function which returns that number.
export var filter = function(term, state) {
  var depth, func, list, result;
  depth = term.getNumMod(1);
  if (depth === MAX_NUM_MODIFIER) {
    depth = 2e308;
  }
  [list, func] = state.pop(2);
  result = runFilter(depth, list, func, state);
  return state.push(...result);
};

filterTestFunc = function(value, func, state) {
  var result;
  if (func instanceof NumberLit) {
    if (!Number.isInteger(func.value)) {
      throw new Error.TypeError("integer", func);
    }
    return Math.abs(func);
  } else {
    state.push(value);
    tryCall(func, state);
    result = state.pop();
    if (!Number.isInteger(result.value)) {
      throw new Error.TypeError("integer", result);
    }
    return Math.abs(result);
  }
};

runFilter = function(depth, list, func, state) {
  var count, i, j, mask, ref, result;
  if (depth <= 0 || !(list instanceof ArrayLit)) {
    count = filterTestFunc(list, func, state);
    return Array(count).fill(list);
  } else {
    mask = (function() {
      if (func instanceof ArrayLit) {
        if (func.length !== list.length) {
          throw new Error.IncompatibleArrayLengths();
        }
        return func.data;
      } else {
        return Array(list.length).fill(func);
      }
    })();
    result = [];
    for (i = j = 0, ref = mask.length - 1; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
      result = result.concat(runFilter(depth - 1, list.data[i], mask[i], state));
    }
    return [new ArrayLit(result)];
  }
};

// Map (¨). Takes two arguments: a list and a function. The first
// numerical argument controls the number of lists to pop (Map will
// always pop one more total argument than its first numerical
// argument, as it also pops the function). The second numerical
// argument determines the depth in the same way as filter's depth
// argument. Both numerical arguments default to 1. The function can be
// a function or an arbitrary nested list of functions.

// Examples:

// {1 {1} {{1}}} [1≡] ¨①⓪ evaluates to 0

// {1 {1} {{1}}} [1≡] ¨①① evaluates to {-1 0 0}

// {1 {1} {{1}}} [1≡] ¨①② evaluates to {-1 {-1} {0}}

// {1 {1} {{1}}} [1≡] ¨①③ evaluates to {-1 {-1} {{-1}}}

// Note that ¨①⓪ is just $ and ¨⓪① will simply pop the function and
// call it once with no arguments.
export var map = function(term, state) {
  var argCount, args, depth, func, ref, result;
  [argCount, depth] = term.getNumMod(1, 1);
  if (depth === MAX_NUM_MODIFIER) {
    depth = 2e308;
  }
  ref = [...state.pop(argCount + 1)], [...args] = ref, [func] = splice.call(args, -1);
  result = runMap(depth, args, func, state);
  return state.push(result);
};

getNodeLength = function(args) {
  var arg, j, len1, length;
  length = void 0;
  for (j = 0, len1 = args.length; j < len1; j++) {
    arg = args[j];
    if (arg instanceof ArrayLit) {
      switch (false) {
        case !(length == null):
          length = arg.length;
          break;
        case length !== arg.length:
          break;
        default:
          // Pass
          throw new Error.IncompatibleArrayLengths();
      }
    }
  }
  return length;
};

runMap = function(depth, args, func, state) {
  var i, j, len, mask, newArgs, ref, result;
  len = getNodeLength(args);
  if (depth <= 0 || len === void 0) {
    state.push(...args);
    tryCall(func, state);
    return state.pop();
  } else {
    mask = (function() {
      if (func instanceof ArrayLit) {
        if (func.length !== len) {
          throw new Error.IncompatibleArrayLengths();
        }
        return func.data;
      } else {
        return Array(len).fill(func);
      }
    })();
    result = [];
    for (i = j = 0, ref = len - 1; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
      newArgs = args.map(function(v) {
        if (v instanceof ArrayLit) {
          return v.data[i];
        } else {
          return v;
        }
      });
      result.push(runMap(depth - 1, newArgs, mask[i], state));
    }
    return new ArrayLit(result);
  }
};

// Just like map but doesn't expect a result of any kind.
export var each = function(term, state) {
  var argCount, args, depth, func, ref, result;
  [argCount, depth] = term.getNumMod(1, 1);
  if (depth === MAX_NUM_MODIFIER) {
    depth = 2e308;
  }
  ref = [...state.pop(argCount + 1)], [...args] = ref, [func] = splice.call(args, -1);
  return result = runEach(depth, args, func, state);
};

runEach = function(depth, args, func, state) {
  var i, j, len, mask, newArgs, ref, results1;
  len = getNodeLength(args);
  if (depth <= 0 || len === void 0) {
    state.push(...args);
    return tryCall(func, state);
  } else {
    mask = (function() {
      if (func instanceof ArrayLit) {
        if (func.length !== len) {
          throw new Error.IncompatibleArrayLengths();
        }
        return func.data;
      } else {
        return Array(len).fill(func);
      }
    })();
    results1 = [];
    for (i = j = 0, ref = len - 1; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
      newArgs = args.map(function(v) {
        if (v instanceof ArrayLit) {
          return v.data[i];
        } else {
          return v;
        }
      });
      results1.push(runEach(depth - 1, newArgs, mask[i], state));
    }
    return results1;
  }
};

// Nested query (n) Takes two arguments: a list/string and an index,
// which can be either a number or a list. The index is traversed in
// order, taking the nth element of the list/string at each step.
export var nestedQuery = function(term, state) {
  var idx, index, j, len1, list, result;
  [list, index] = state.pop(2);
  index = (function() {
    switch (false) {
      case !(index instanceof NumberLit):
        return [index.value];
      case !(index instanceof ArrayLit):
        return index.data;
      default:
        throw new Error.TypeError("number or array", index);
    }
  })();
  result = list;
  for (j = 0, len1 = index.length; j < len1; j++) {
    idx = index[j];
    result = nth(result, idx);
  }
  if (result != null) {
    return state.push(result);
  } else {
    return state.push(SentinelValue.null);
  }
};

// Select (⊇) takes two arguments: a list/string and an index. The
// index can either be a number or a list. If it's a number, it's
// treated a a singleton list. A new list/string is formed by taking
// the elements at the given positions. Any invalid indices are
// ignored.
export var select = function(term, state) {
  var curr, idx, index, j, len1, list, results;
  [list, index] = state.pop(2);
  index = (function() {
    switch (false) {
      case !(index instanceof NumberLit):
        return [index.value];
      case !(index instanceof ArrayLit):
        return index.data;
      default:
        throw new Error.TypeError("number or array", index);
    }
  })();
  if (!((list instanceof StringLit) || (list instanceof ArrayLit))) {
    throw new Error.TypeError("array or string", list);
  }
  results = [];
  for (j = 0, len1 = index.length; j < len1; j++) {
    idx = index[j];
    curr = nth(list, idx);
    if (curr != null) {
      results.push(curr);
    }
  }
  return state.push(rebuild(list, results));
};

rebuild = function(model, values) {
  switch (false) {
    case !(model instanceof StringLit):
      return new StringLit(new Str(values.map(function(x) {
        return x.text.toString();
      })));
    case !(model instanceof ArrayLit):
      return new ArrayLit(values);
    default:
      return SentinelValue.null; // Meh.
  }
};

export var nth = function(value, index) {
  var result;
  switch (false) {
    case !(value instanceof StringLit):
      if (index < 0) {
        index += value.text.length;
      }
      result = value.text.charAt(index);
      if (result != null) {
        return new StringLit(result);
      } else {
        return void 0;
      }
      break;
    case !(value instanceof ArrayLit):
      if (index < 0) {
        index += value.length;
      }
      return value.data[index];
    default:
      return value;
  }
};

// (⍋) By default, gradeUp takes one argument: a list. It returns a
// list of indices which indicates the permutation placing the list
// into ascending order. With a prime modifier, this will pop a
// function (before popping the list) that will be used as the "less
// than" operator for comparison. Returns a list of indices which
// indicate the permutation of the list after sorting.
export var gradeUp = function(term, state) {
  var func, indices, list, ref;
  [list, func] = term.getPrimeMod() > 0 ? ([list, func] = state.pop(2), [list, customLT(state, func)]) : (list = state.pop(), [list, defaultLT]);
  isList(list);
  indices = (function() {
    var results1 = [];
    for (var j = 0, ref = list.length - 1; 0 <= ref ? j <= ref : j >= ref; 0 <= ref ? j++ : j--){ results1.push(j); }
    return results1;
  }).apply(this);
  indices.sort(function(a, b) {
    if (func(list.data[a], list.data[b])) {
      return -1;
    } else if (func(list.data[b], list.data[a])) {
      return 1;
    } else {
      return 0;
    }
  });
  return state.push(new ArrayLit(indices));
};

// (⍪) Flattens nested lists. Numerical argument (default=1) determines
// how many layers to flatten. Numerical argument of 20 is treated as
// infinity. Numerical argument of 0 results in no change to the list.
export var ravel = function(term, state) {
  var depth, list;
  depth = term.getNumMod(1);
  if (depth === MAX_NUM_MODIFIER) {
    depth = 2e308;
  }
  list = state.pop();
  isList(list);
  return state.push(new ArrayLit(doRavel(depth, list.data)));
};

export var doRavel = function(depth, list) {
  var elem, j, len1, result;
  if (depth <= 0) {
    return list;
  } else {
    result = [];
    for (j = 0, len1 = list.length; j < len1; j++) {
      elem = list[j];
      if (elem instanceof ArrayLit) {
        result = result.concat(doRavel(depth - 1, elem.data));
      } else {
        result.push(elem);
      }
    }
    return result;
  }
};

// Outer product (⊗) takes one numerical argument N, which defaults to
// 1. It pops N+1 values, where the top value should be a function and
// the rest should be lists. The function will be called with one
// argument from each list, for every possible combination of such
// arguments.

// Examples:

// {"a" "b"} {"A" "B"} `⋄ ⊗ equals {{"aA" "aB"} {"bA" "bB"}}

// {"a" "b"} {"A" "B"} `⋄ ⊗② equals {{"aA" "aB"} {"bA" "bB"}}

// Note that ⊗① simply maps over a list, and ⊗⓪ simply calls the
// function once.

// If you wish to get a flat result structure (rather than the nested
// one that ⊗ produces, you should call Flatten (⍪) on the result, with
// a numerical argument one smaller than the one passed to ⊗.
export var outerProduct = function(term, state) {
  var arg, argCount, arglists, args, func, j, len1, ref;
  argCount = term.getNumMod(2);
  ref = state.pop(argCount + 1), [...args] = ref, [func] = splice.call(args, -1);
  arglists = [];
  for (j = 0, len1 = args.length; j < len1; j++) {
    arg = args[j];
    isList(arg);
    arglists.push(arg.data);
  }
  return state.push(doOuterProduct(state, func, arglists, 0, []));
};

export var doOuterProduct = function(state, func, arglists, n, prefix) {
  var curr, elem, j, len1, ref, result;
  if (n >= arglists.length) {
    state.push(...prefix);
    tryCall(func, state);
    return state.pop();
  } else {
    result = [];
    ref = arglists[n];
    for (j = 0, len1 = ref.length; j < len1; j++) {
      elem = ref[j];
      curr = doOuterProduct(state, func, arglists, n + 1, prefix.concat([elem]));
      result.push(curr);
    }
    return new ArrayLit(result);
  }
};

export var cartesianProduct = function*(lists) {
  yield* cartesianProductRec(lists, 0, []);
};

cartesianProductRec = function*(lists, n, prefix) {
  var elem, j, len1, ref;
  if (n >= lists.length) {
    yield prefix;
  } else {
    ref = lists[n];
    for (j = 0, len1 = ref.length; j < len1; j++) {
      elem = ref[j];
      yield* cartesianProductRec(lists, n + 1, prefix.concat([elem]));
    }
  }
};

// ∈ (Member). By default, it takes two arguments: the first is a list
// and the second is an element to search for. Returns all of the
// indices at which the element can be found in the list. If used with
// a prime modifier, the search element is instead a unary function,
// which is called for each position.
export var member = function(term, state) {
  var elem, func, func0, i, j, len1, list, ref, result, v;
  [list, func] = term.getPrimeMod() > 0 ? ([list, func0] = state.pop(2), func = function(x) {
    state.push(x);
    tryCall(func0, state);
    return isTruthy(state.pop());
  }, [list, func]) : ([list, elem] = state.pop(2), func = function(x) {
    return equals(x, elem);
  }, [list, func]);
  isList(list);
  result = [];
  ref = list.data;
  for (i = j = 0, len1 = ref.length; j < len1; i = ++j) {
    v = ref[i];
    if (func(v)) {
      result.push(new NumberLit(i));
    }
  }
  return state.push(new ArrayLit(result));
};

// Length (#). By default, returns the length of the list. With a
// numerical modifier, this will happily nested deeper and count the
// length of sublists as well. Numerical argument of 20 is treated as
// infinity.
export var length = function(term, state) {
  var list, newTerm, num;
  num = term.getNumMod(1);
  if (num === 0) {
    // There's one thing, if we ignore all depth. Simple and dumb result.
    state.pop();
    state.push(1);
    return;
  }
  newTerm = new SimpleCmd(new Token('⍪'));
  newTerm.modifiers.push(new NumModifier(num === MAX_NUM_MODIFIER || num === 0 ? num : num - 1));
  ravel(newTerm, state);
  list = state.pop();
  isList(list);
  return state.push(list.length);
};

// Reshape (⍴) takes two arguments: a list and a shape. Its numerical
// argument defaults to 20 (which equates to infinity). The first thing
// it does is ravel the list to the depth of its own numerical
// argument. Then it produces a new list of the specified shape, where
// the shape should either be a number or a list of numbers.
export var reshape = function(term, state) {
  var depth, list, newTerm, result, shape;
  shape = state.pop();
  if (!(shape instanceof ArrayLit)) {
    shape = new ArrayLit([shape]);
  }
  depth = term.getNumMod(MAX_NUM_MODIFIER);
  if (depth === MAX_NUM_MODIFIER) {
    depth = 2e308;
  }
  newTerm = new SimpleCmd(new Token('⍪'));
  newTerm.modifiers.push(new NumModifier(depth));
  ravel(newTerm, state);
  list = state.pop();
  isList(list);
  if (list.length === 0) {
    throw new Error.TypeError("nonempty list", list);
  }
  list = list.data;
  result = doReshape(shape.data, 0, list, [0]);
  return state.push(result);
};

// listPos is a 1-element array (cheap and nasty ref cell)
export var doReshape = function(shape, shapePos, list, listPos) {
  var dim, i, j, ref, result;
  if (shapePos >= shape.length) {
    result = list[listPos[0] % list.length];
    listPos[0] += 1;
    return result;
  } else {
    dim = shape[shapePos];
    result = [];
    for (i = j = 0, ref = dim - 1; j <= ref; i = j += 1) {
      result.push(doReshape(shape, shapePos + 1, list, listPos));
    }
    return new ArrayLit(result);
  }
};

//# sourceMappingURL=list_op.js.map