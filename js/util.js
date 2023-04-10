// Asserts that the value is of type 'never'. This function will,
// naturally, never actually be called, unless a value is cast to type
// 'never'.
export function assertNever(_x) {
    throw "assertNever failed";
}
// Zips the two lists together, returning a list of 2-tuples. The
// resulting list will always have length equal to that of the first
// list and will be padded with undefined as needed.
export function zip(a, b) {
    return a.map((v, i) => [v, b[i]]);
}
// Validates that the elements of the two arrays are equal according
// to the given equality predicate. If the arrays have differing
// lengths, returns false unconditionally.
export function arrayEq(a, b, fn) {
    if (a.length !== b.length) {
        return false;
    }
    const ref = zip(a, b);
    for (const [x, y] of ref) {
        if (!fn(x, y)) {
            return false;
        }
    }
    return true;
}
// Red (async) version of arrayEq
export async function arrayEqPromise(a, b, fn) {
    if (a.length !== b.length) {
        return false;
    }
    const ref = zip(a, b);
    for (const [x, y] of ref) {
        if (!await fn(x, y)) {
            return false;
        }
    }
    return true;
}
// Inserts sub into str, replacing the characters from index a to
// index b.
export function spliceStr(str, sub, a, b) {
    return str.substring(0, a) + sub + str.substring(b);
}
// Mathematical gcd. Returns the gcd of the two numbers.
export function gcd(a, b) {
    while (b !== 0) {
        [a, b] = [b, (a % b + b) % b];
    }
    return a;
}
// Mathematical lcm. Returns the lcm of the two numbers.
export function lcm(a, b) {
    const d = gcd(a, b);
    if (d === 0) {
        return 0;
    }
    else {
        return a * b / d;
    }
}
// A list of the values from a up to b. If a > b then returns the
// empty list.
export function range(a, b) {
    const x = [];
    for (let i = a; i < b; i++) {
        x.push(i);
    }
    return x;
}
// The built-in sort() doesn't support promises, and in the abstract
// we may be eval'ing user code during a sort function. Even though
// doing so is a Bad Idea(tm), it is technically allowed by our
// implementation, so we implement our own sort here.
//
// Note: Like the built-in sorting function, this sorts in-place; no
// copy is made.
//
// This is the first time in many years I've bothered to write a
// sorting algorithm on my own, amusingly. Using Wikipedia to get a
// nice, stable one:
// https://en.wikipedia.org/wiki/Merge_sort#Algorithm
export async function sortM(arr, compareFn) {
    const comparison = compareFn !== null && compareFn !== void 0 ? compareFn : defaultCompare;
    const tmp = arr.slice();
    const merge = async function (a, b, begin, middle, end) {
        let [i, j] = [begin, middle];
        for (let k = begin; k < end; k++) {
            if (i < middle && (j >= end || (await comparison(a[i], a[j])) <= 0)) {
                b[k] = a[i];
                i += 1;
            }
            else {
                b[k] = a[j];
                j += 1;
            }
        }
    };
    const splitMerge = async function (a, b, begin, end) {
        if (end - begin <= 1) {
            return;
        }
        const middle = Math.floor((end + begin) / 2);
        await splitMerge(b, a, begin, middle);
        await splitMerge(b, a, middle, end);
        await merge(a, b, begin, middle, end);
    };
    await splitMerge(tmp, arr, 0, arr.length);
    return arr;
}
async function defaultCompare(a, b) {
    const aStr = "" + a;
    const bStr = "" + b;
    if (aStr < bStr) {
        return -1;
    }
    else if (aStr > bStr) {
        return 1;
    }
    else {
        return 0;
    }
}
export async function reduceM(arr, callback, ...v) {
    let prev;
    let index;
    if (v.length === 0) {
        // Get the initial value from the array
        if (arr.length === 0) {
            throw TypeError("Empty array on reduceM and no initial value supplied.");
        }
        else {
            prev = arr[0]; // In this case, we're in the first overload, so A == B
            index = 1;
        }
    }
    else {
        prev = v[0];
        index = 0;
    }
    for (; index < arr.length; index++) {
        prev = await callback(prev, arr[index], index, arr);
    }
    return prev;
}
