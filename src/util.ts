
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
