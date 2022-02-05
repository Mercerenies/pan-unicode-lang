
import { Evaluator } from './eval.js';
import { SimpleCmd, tryCall } from './ast.js';

export async function spread(term: SimpleCmd, state: Evaluator): Promise<void> {
  const [argsEach, funcs] = term.getNumMod(1, 2);
  const everything = state.pop(funcs * (argsEach + 1));
  for (let i = 0; i < funcs - 1; i++) {
    const args = everything.slice(i * argsEach, (i + 1) * argsEach);
    const func = everything[argsEach * funcs + i];
    state.push(...args);
    await tryCall(func, state);
  }
}

// ⤨ (Cross, an amalgamation of the operators Factor calls apply and
// cleave) takes three numerical arguments. The first (we'll call it
// A) defaults to 1, the second (call it B) defaults to 2, and the
// third (call it F) defaults to 2. A denotes the number of arguments
// to pass to each call, B denotes the number of groups of arguments,
// and F denotes the number of functions. This will pop A×B arguments
// and F functions, for a total of A×B+F values off the stack. For
// each function and each group of arguments, the function will be
// called for that group, producing every possible pairing of results
// in order (function-major ordering).

// Note: ⤨ is a very general combinator. In many cases, ↘ or ↗ will do
// what you want with fewer explicit numeric arguments, so consider
// using those before resorting to this one.
export function cross(term: SimpleCmd, state: Evaluator): Promise<void> {
  const [a, b, f] = term.getNumMod(1, 2, 2);
  return doCross(state, a, b, f);
}


// ↘ (Apply) is ⤨ but with F=1 automatically. Cleave takes two
// numerical arguments: A and B. A defaults to 1 and B defaults to 2.
//
// Mnemonic: We pass several argument groups down to one function.
export function apply(term: SimpleCmd, state: Evaluator): Promise<void> {
  const [a, b] = term.getNumMod(1, 2);
  return doCross(state, a, b, 1);
}


// ↗ (Cleave) is ⤨ but with B=1 automatically. Apply takes two
// numerical arguments: A and F. A defaults to 1 and F defaults to 2.
//
// Mnemonic: We pass a single argument group up to several functions.
export function cleave(term: SimpleCmd, state: Evaluator): Promise<void> {
  const [a, f] = term.getNumMod(1, 2);
  return doCross(state, a, 1, f);
}


async function doCross(state: Evaluator, a: number, b: number, f: number): Promise<void> {
  const everything = state.pop(a * b + f);
  for (let i = 0; i < f; i++) {
    const func = everything[a * b + i];
    for (let j = 0; j < b; j++) {
      const args = everything.slice(a * j, a * (j + 1));
      state.push(...args);
      await tryCall(func, state);
    }
  }
}
