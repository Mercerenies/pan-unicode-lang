
import Str from './str.js';

export function toNumber(ch: string | Str): number | undefined {
  switch (ch.charAt(0)) {
  case '⁰':
  case '₀':
    return 0;
  case '¹':
  case '₁':
    return 1;
  case '²':
  case '₂':
    return 2;
  case '³':
  case '₃':
    return 3;
  case '⁴':
  case '₄':
    return 4;
  case '⁵':
  case '₅':
    return 5;
  case '⁶':
  case '₆':
    return 6;
  case '⁷':
  case '₇':
    return 7;
  case '⁸':
  case '₈':
    return 8;
  case '⁹':
  case '₉':
    return 9;
  default:
    return undefined;
  }
};

export function toSub(n: number): string | undefined {
  switch (n) {
  case 0:
    return '₀';
  case 1:
    return '₁';
  case 2:
    return '₂';
  case 3:
    return '₃';
  case 4:
    return '₄';
  case 5:
    return '₅';
  case 6:
    return '₆';
  case 7:
    return '₇';
  case 8:
    return '₈';
  case 9:
    return '₉';
  default:
    return undefined;
  }
};

export function toSuper(n: number): string | undefined {
  switch (n) {
    case 0:
      return '⁰';
    case 1:
      return '¹';
    case 2:
      return '²';
    case 3:
      return '³';
    case 4:
      return '⁴';
    case 5:
      return '⁵';
    case 6:
      return '⁶';
    case 7:
      return '⁷';
    case 8:
      return '⁸';
    case 9:
      return '⁹';
    default:
      return undefined;
  }
};

// TODO Note that ₀ is unassigned for the moment. Haven't decided what to do with it yet.
