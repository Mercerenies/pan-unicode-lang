
import { tryCall } from './ast.js';

# ⇉ (Spread) takes two numerical arguments. The first (we'll call it
# A) defaults to 1 and the second (we'll call it F) defaults to 2. F
# denotes the number of functions, and A denote the number of
# arguments each function will be given. Spread will pop off F×A
# values and F functions, for a total of F×(A+1) arguments. Each
# function will be given A arguments. This is best demonstrated with
# an example.
#
# Examples: Assume a, b, c, ... are values and f, g, h, ... are functions
#
# a b f g ⇉ calls f(a) then g(b)
#
# a b f g ⇉①② calls f(a) then g(b)
#
# a b c f g h ⇉①③ calls f(a) then g(b) then h(c)
#
# a b c d f g ⇉②② calls f(a, b) then g(c, d)
export spread = (term, state) ->
  [argsEach, funcs] = term.getNumMod(1, 2)
  everything = state.pop(funcs * (argsEach + 1))
  for i in [0..funcs-1]
    args = everything.slice(i * argsEach, (i + 1) * argsEach)
    func = everything[argsEach * funcs + i]
    state.push(...args)
    tryCall(func, state)

# ⤨ (Cross, an amalgamation of the operators Factor calls apply and
# cleave) takes three numerical arguments. The first (we'll call it A)
# defaults to 1, the second (call it B) defaults to 2, and the third
# (call it F) defaults to 2. A denotes the number of arguments to pass
# to each call, B denotes the number of groups of arguments, and F
# denotes the number of functions. This will pop A×B arguments and F
# functions, for a total of A×B+F values off the stack. For each
# function and each group of arguments, the function will be called
# for that group, producing every possible pairing of results in order
# (function-major ordering).
#
# Note: ⤨ is a very general combinator. In many cases, ↘ or ↗ will do
# what you want with fewer explicit numeric arguments, so consider
# using those before resorting to this one.
export cross = (term, state) ->
  [a, b, f] = term.getNumMod(1, 2, 2)
  doCross state, a, b, f

# ↘ (Cleave) is ⤨ but with F=1 automatically. Cleave takes two
# numerical arguments: A and B. A defaults to 1 and B defaults to 2.
#
# Mnemonic: We pass several argument groups down to one function.
export cleave = (term, state) ->
  [a, b] = term.getNumMod(1, 2)
  doCross state, a, b, 1

# ↗ (Apply) is ⤨ but with B=1 automatically. Apply takes two numerical
# arguments: A and F. A defaults to 1 and F defaults to 2.
#
# Mnemonic: We pass a single argument group up to several functions.
export apply = (term, state) ->
  [a, f] = term.getNumMod(1, 2)
  doCross state, a, 1, f

doCross = (state, a, b, f) ->
  everything = state.pop(a * b + f)
  for i in [0..f-1]
    func = everything[a * b + i]
    for j in [0..b-1]
      args = everything.slice(a * j, a * (j + 1))
      state.push(...args)
      tryCall(func, state)
