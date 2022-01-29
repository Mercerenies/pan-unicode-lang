export function assertNever(_x) {
    throw "assertNever failed";
}
export function zip(a, b) {
    return a.map((v, i) => [v, b[i]]);
}
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
export function spliceStr(str, sub, a, b) {
    return str.substring(0, a) + sub + str.substring(b);
}
export function gcd(a, b) {
    while (b !== 0) {
        [a, b] = [b, (a % b + b) % b];
    }
    return a;
}
export function lcm(a, b) {
    const d = gcd(a, b);
    if (d === 0) {
        return 0;
    }
    else {
        return a * b / d;
    }
}
export function range(a, b) {
    const x = [];
    for (let i = a; i < b; i++) {
        x.push(i);
    }
    return x;
}
