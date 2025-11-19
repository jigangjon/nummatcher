function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return Number.NaN;
  if (n === 0 || n === 1) return 1;
  return n * factorial(n - 1);
}

function multipleFactorial(n: number, k: number): number {
  if (n < 0 || k <= 0 || !Number.isInteger(n) || !Number.isInteger(k))
    return Number.NaN;
  if (n === 0 || n === 1) return 1;
  return n * multipleFactorial(n - k, k);
}

function P(n: number, r: number): number {
  if (n < 0 || r < 0 || r > n || !Number.isInteger(n) || !Number.isInteger(r))
    return Number.NaN;
  if (r === 1) return n;
  return n * P(n - 1, r - 1);
}

function C(n: number, r: number): number {
  if (n < 0 || r < 0 || r > n || !Number.isInteger(n) || !Number.isInteger(r))
    return Number.NaN;
  if (r > n / 2) return C(n, n - r);
  return P(n, r) / factorial(r);
}

function floatEquals(a: number, b: number, epsilon = 1e-6): boolean {
  return Math.abs(a - b) <= epsilon * Math.max(Math.abs(a), Math.abs(b));
}

export const MoreMath = {
  factorial,
  multipleFactorial,
  P,
  C,
  floatEquals,
};
