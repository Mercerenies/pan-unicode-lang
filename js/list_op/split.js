// Splitting functions that partition a list into two parts.
import { ArrayLit, forceList } from '../ast.js';
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
        throw "Working on it"; /////
    }
}
