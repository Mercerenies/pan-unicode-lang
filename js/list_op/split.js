// Splitting functions that partition a list into two parts.
import { ArrayLit, LazyListLit, FunctionLit, CurriedFunction, NumberLit, SymbolLit, forceList } from '../ast.js';
import * as Modifier from '../modifier.js';
export async function takeLeft(state, list, quantity) {
    // Always returns a strict value; forces only as much as necessary.
    return new ArrayLit(await list.prefix(state, quantity));
}
export async function takeRight(state, list, quantity) {
    // Always returns a strict value; forces the whole input list.
    const data = await forceList(state, list);
    return new ArrayLit(data.slice(-quantity));
}
export async function dropLeft(state, list, quantity) {
    // Preserves laziness.
    if (list instanceof ArrayLit) {
        // Strict version.
        return new ArrayLit(list.data.slice(quantity));
    }
    else {
        // Lazy version.
        if (await list.inBounds(state, quantity)) {
            // This is the function: [ [n]K② 1+ :② ⧤ [s① ●②] [%② ε] i ]
            const fn = new CurriedFunction(list, new CurriedFunction(new NumberLit(quantity), new FunctionLit([
                new FunctionLit([new SymbolLit("n")]),
                new SymbolLit("K", [new Modifier.NumModifier(2)]),
                new NumberLit(1),
                new SymbolLit("+"),
                new SymbolLit(":", [new Modifier.NumModifier(2)]),
                new SymbolLit("⧤"),
                new FunctionLit([
                    new SymbolLit("s", [new Modifier.NumModifier(1)]),
                    new SymbolLit("●", [new Modifier.NumModifier(2)]),
                ]),
                new FunctionLit([
                    new SymbolLit("%", [new Modifier.NumModifier(2)]),
                    new SymbolLit("ε"),
                ]),
                new SymbolLit("i"),
            ])));
            return new LazyListLit([], fn);
        }
        else {
            // The list is too short, so return the empty list.
            return LazyListLit.empty();
        }
    }
}
