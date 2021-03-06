// Generated by CoffeeScript 2.5.1
import * as Error from './error.js';

import {
  NumberLit,
  ArrayLit,
  SentinelValue
} from './ast.js';

import {
  zip
} from './util.js';

export var binaryReduce = function(fn, term, state, opts = {}) {
  var adjustment, arr, mod, ref, ref1, top;
  adjustment = (ref = opts.modifierAdjustment) != null ? ref : function(x) {
    return x;
  };
  mod = adjustment(term.getNumMod((ref1 = opts.defaultModifier) != null ? ref1 : 2));
  if (mod === 0) {
    if (opts.zero != null) {
      return state.push(opts.zero());
    } else {
      throw new Error.InvalidModifier(term);
    }
  } else if (mod === 1 && (opts.one != null)) {
    top = state.pop();
    return state.push(opts.one(top));
  } else {
    arr = state.pop(mod);
    return state.push(arr.reduce(fn));
  }
};

export var binaryReduceRight = function(fn, term, state, opts = {}) {
  var adjustment, arr, mod, ref, ref1, top;
  adjustment = (ref = opts.modifierAdjustment) != null ? ref : function(x) {
    return x;
  };
  mod = adjustment(term.getNumMod((ref1 = opts.defaultModifier) != null ? ref1 : 2));
  if (mod === 0) {
    if (opts.zero != null) {
      return state.push(opts.zero());
    } else {
      throw new Error.InvalidModifier(term);
    }
  } else if (mod === 1 && (opts.one != null)) {
    top = state.pop();
    return state.push(opts.one(top));
  } else {
    arr = state.pop(mod);
    return state.push(arr.slice().reverse().reduce(function(x, y) {
      return fn(y, x);
    }));
  }
};

// Takes a binary function and constructs an operation which takes any
// number of arguments (determined by numerical modifier).

// - If given zero arguments, opts.zero is returned, and an exception
//   is thrown if opts.zero is undefined.
// - If given one argument, opts.one is returned. If opts.one is
//   undefined, then an exception is thrown.
// - If two or more are given, every adjacent pair is compared
//   using the binary function, and the results are reduced.
export var mergeReduce = function(fn, reduce, term, state, opts = {}) {
  var adjustment, arr, brr, i, mod, ref, ref1, top;
  adjustment = (ref = opts.modifierAdjustment) != null ? ref : function(x) {
    return x;
  };
  mod = adjustment(term.getNumMod((ref1 = opts.defaultModifier) != null ? ref1 : 2));
  if (mod === 0) {
    if (opts.zero != null) {
      return state.push(opts.zero);
    } else {
      throw new Error.InvalidModifier(term);
    }
  } else if (mod === 1) {
    if (opts.one != null) {
      top = state.pop();
      return state.push(opts.one(top));
    } else {
      throw new Error.InvalidModifier(term);
    }
  } else {
    arr = state.pop(mod);
    brr = (function() {
      var j, ref2, results;
      results = [];
      for (i = j = 0, ref2 = arr.length - 2; (0 <= ref2 ? j <= ref2 : j >= ref2); i = 0 <= ref2 ? ++j : --j) {
        results.push(fn(arr[i], arr[i + 1]));
      }
      return results;
    })();
    return state.push(brr.reduce(reduce));
  }
};

export var scalarExtend = function(f) {
  var f1;
  f1 = function(x, y) {
    var curr;
    if (x instanceof ArrayLit || y instanceof ArrayLit) {
      if (!(x instanceof ArrayLit)) {
        x = ArrayLit.filled(y.length, x);
      }
      if (!(y instanceof ArrayLit)) {
        y = ArrayLit.filled(x.length, y);
      }
      if (x.length !== y.length) {
        throw new Error.IncompatibleArrayLengths();
      }
      return new ArrayLit((function() {
        var j, len, ref, results;
        ref = zip(x.data, y.data);
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          curr = ref[j];
          results.push(f1(...curr));
        }
        return results;
      })());
    } else {
      return f(x, y);
    }
  };
  return f1;
};

export var scalarExtendUnary = function(f) {
  var f1;
  f1 = function(x) {
    var curr;
    if (x instanceof ArrayLit) {
      return new ArrayLit((function() {
        var j, len, ref, results;
        ref = x.data;
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          curr = ref[j];
          results.push(f1(curr));
        }
        return results;
      })());
    } else {
      return f(x);
    }
  };
  return f1;
};

export var handleWhiteFlag = function(state, term, default_, f) {
  var mod, top;
  mod = term.getNumMod(2);
  if (mod > 0) {
    top = state.peek();
    if (top instanceof SentinelValue && top.type.toString() === '⚐') {
      state.pop(); // Pop the sentinel
      if (typeof default_ === 'function') {
        state.push(default_());
      } else {
        state.push(default_);
      }
      return;
    }
  }
  return f();
};

export var noExtension = function(fn, term, state, opts = {}) {
  var a, b;
  [a, b] = state.pop(2);
  return state.push(fn(a, b));
};

export var binary = function(fn, term, state, opts = {}) {
  var one, zero;
  zero = opts.zero;
  one = opts.one;
  if ((zero != null) && typeof zero !== 'function') {
    zero = (function() {
      return opts.zero;
    });
  }
  if ((one != null) && typeof one !== 'function') {
    one = (function(_) {
      return opts.one;
    });
  }
  if (opts.scalarExtend && (one != null)) {
    one = scalarExtendUnary(one);
  }
  return binaryReduce(fn, term, state, {
    zero: zero,
    one: one,
    modifierAdjustment: opts.modifierAdjustment,
    defaultModifier: opts.defaultModifier
  });
};

// binary but associate to the right
export var binaryRight = function(fn, term, state, opts = {}) {
  var one, zero;
  zero = opts.zero;
  one = opts.one;
  if ((zero != null) && typeof zero !== 'function') {
    zero = (function() {
      return opts.zero;
    });
  }
  if ((one != null) && typeof one !== 'function') {
    one = (function(_) {
      return opts.one;
    });
  }
  if (opts.scalarExtend && (one != null)) {
    one = scalarExtendUnary(one);
  }
  return binaryReduceRight(fn, term, state, {
    zero: zero,
    one: one,
    modifierAdjustment: opts.modifierAdjustment,
    defaultModifier: opts.defaultModifier
  });
};

export var merge = function(reduce) {
  return function(fn, term, state, opts = {}) {
    var one, zero;
    if (opts.scalarExtend) {
      reduce = scalarExtend(reduce);
    }
    zero = opts.zero;
    one = opts.one;
    if ((zero != null) && typeof zero !== 'function') {
      zero = (function() {
        return opts.zero;
      });
    }
    if ((one != null) && typeof one !== 'function') {
      one = (function(_) {
        return opts.one;
      });
    }
    if (opts.scalarExtend && (one != null)) {
      one = scalarExtendUnary(one);
    }
    return mergeReduce(fn, reduce, term, state, {
      zero: zero,
      one: one,
      modifierAdjustment: opts.modifierAdjustment,
      defaultModifier: opts.defaultModifier
    });
  };
};

export var WhiteFlag = {
  // Inherit from the zero argument, if provided. If not, behaves like
  // ignore.
  inherit: function(opts) {
    return opts.zero;
  },
  // Use a constant value.
  value: function(n) {
    return function(opts) {
      return n;
    };
  },
  // Perform no special handling.
  ignore: function(opts) {
    return void 0;
  }
};

export var boolToInt = function(x) {
  return new NumberLit(x ? -1 : 0);
};

// This function is an attempt to summarize all of the above, providing
// all of that functionality as keyword arguments. The available
// keyword arguments are listed below.

// - function (required) - The function to apply.

// - postProcess (optional) - Unary function; runs after the original
//   function. Defaults to the identity function.

// - preProcess (optional) - Unary function; runs on each argument to
// - the original function. Generally, this is a type check of some
// - variety.

// - extension (optional) - If provided, this should be one of Op.none,
//   Op.binary, or Op.merge(...). It determines how to reduce the
//   function along more arguments.

// - scalarExtend (optional) - Boolean which defaults to false. If
//   true, the function will extend if at least one of the arguments is
//   a list.

// - zero (optional) - If provided, this will be used as the
//   zero-argument result after extension.

// - one (optional) - If provided, this will be used as the
//   one-argument result after extension.

// - whiteFlag (optional) - How to handle the white flag, usually one
//   of the WhiteFlag.* constants. Defaults to WhiteFlag.inherit.

// - modifierAdjustment (optional) - A unary function to apply to the
//   numerical modifier before interpreting it as arity. Defaults to
//   the identity function.

// - defaultModifier (optional) - Default modifier. Defaults to 2.
export var op = function(state, term, opts = {}) {
  var func, oldOperation, operation, ref, unpostprocessedFunc, unpreprocessedFunc, whiteFlag;
  func = opts.function;
  if (opts.postProcess) {
    unpostprocessedFunc = func;
    func = function(a, b) {
      return opts.postProcess(unpostprocessedFunc(a, b));
    };
  }
  if (opts.preProcess) {
    unpreprocessedFunc = func;
    func = function(a, b) {
      return unpreprocessedFunc(opts.preProcess(a), opts.preProcess(b));
    };
  }
  if (opts.scalarExtend) {
    func = scalarExtend(func);
  }
  operation = function() {
    var ref;
    return ((ref = opts.extension) != null ? ref : noExtension)(func, term, state, opts);
  };
  whiteFlag = ((ref = opts.whiteFlag) != null ? ref : WhiteFlag.inherit)(opts);
  if (whiteFlag != null) {
    oldOperation = operation;
    operation = function() {
      return handleWhiteFlag(state, term, whiteFlag, oldOperation);
    };
  }
  return operation();
};

//# sourceMappingURL=op.js.map
