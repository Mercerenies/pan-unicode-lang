
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
    args = everything.slice(i * argsEach, (i+1) * argsEach)
    func = everything[argsEach * funcs + i]
    state.push(...args)
    tryCall(func, state)
