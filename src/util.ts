
export function assertNever(_x: never): never {
  throw "assertNever failed";
}

export function zip<A, B>(a: A[], b: B[]): [A, B][] {
  return a.map((v, i) => [v, b[i]]);
}


export function arrayEq<A, B>(a: A[], b: B[], fn: (a: A, b: B) => boolean) {
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


export function spliceStr(str: string, sub: string, a: number, b: number): string {
  return str.substring(0, a) + sub + str.substring(b);
}


export function gcd(a: number, b: number): number {
  while (b !== 0) {
    [a, b] = [b, (a % b + b) % b];
  }
  return a;
}


export function lcm(a: number, b: number): number {
  const d = gcd(a, b);
  if (d === 0) {
    return 0;
  } else {
    return a * b / d;
  }
}


export function range(a: number, b: number): number[] {
  const x: number[] = [];
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
export async function sortM<T>(arr: T[], compareFn?: (a: T, B: T) => Promise<number>): Promise<T[]> {
  const comparison = compareFn ?? defaultCompare;

  const tmp: T[] = arr.slice();

  const merge = async function(begin: number, middle: number, end: number): Promise<void> {
    let [i, j] = [begin, middle];
    for (let k = begin; k < end; k++) {
      const cmp = await comparison(tmp[i], tmp[j]);
      if (i < middle && (j >= end || cmp <= 0)) {
        arr[k] = tmp[i];
        i += 1;
      } else {
        arr[k] = tmp[j];
        j += 1;
      }
    }
  };

  const splitMerge = async function(begin: number, end: number): Promise<void> {
    if (end - begin <= 1) {
      return;
    }
    const middle = Math.floor((end + begin) / 2);
    await splitMerge(begin, middle);
    await splitMerge(middle, end);
    await merge(begin, middle, end);
  };

  await splitMerge(0, arr.length);

  return arr;
}

async function defaultCompare<T>(a: T, b: T): Promise<number> {
  const aStr = ""+a;
  const bStr = ""+b;
  if (aStr < bStr) {
    return -1;
  } else if (aStr > bStr) {
    return 1;
  } else {
    return 0;
  }
}

export function reduceM<A>(arr: A[], callback: (prev: A, next: A, index: number, array: A[]) => Promise<A>): Promise<A>;
export function reduceM<A, B>(arr: B[], callback: (prev: A, next: B, index: number, array: B[]) => Promise<A>, initial: A): Promise<A>;
export async function reduceM<A, B>(arr: B[], callback: (prev: A, next: B, index: number, array: B[]) => Promise<A>, ...v: [] | [A]): Promise<A> {
  let prev: A;
  let index: number;
  if (v.length === 0) {
    // Get the initial value from the array
    if (arr.length === 0) {
      throw TypeError("Empty array on reduceM and no initial value supplied.");
    } else {
      prev = arr[0] as unknown as A; // In this case, we're in the first overload, so A == B
      index = 1;
    }
  } else {
    prev = v[0];
    index = 0;
  }
  for (; index < arr.length; index++) {
    prev = await callback(prev, arr[index], index, arr);
  }
  return prev;
}
