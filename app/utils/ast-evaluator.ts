// () allowed by default
// +, -, *, /, !, ^, sqrt, nthroot, concat, !!, P, C, decimal, unary -
// whitespaces ignored, case insensitive
// sqrt allowed without parentheses or whitespaces (sqrt9)
// unary - allowed without parentheses (-5)
// decimal allowed without parentheses (3.14)
// P and C allowed both prefix and infix
// nthroot, prefix P and prefix C require parentheses for their arguments (root(27,3), P(5,2), C(5,2))
// decimal point allowed only once in a number (3.14 is valid, 3.1.4 is invalid)
// () > concat, decimal > sqrt > !, !! > infix P, infix C > ^ > unary -, *, / > +, -

// multiplication by juxtaposition to be added later (2(3+4) = 14)
// floating point precision to be handled later
// [] and {} to be added later
// leading decimal point to be added later

import type { Token } from "./pratt-parser";

export function evaluateAST(token: Token): number {
  if (token.value) return token.value;
  if (!token.second) {
    if (!token.unaryFn) throw new Error("Invalid unary operation");
    if (!token.first) throw new Error("Missing operand for unary operation");
    const a = evaluateAST(token.first);
    return token.unaryFn(a);
  }
  if (!token.binaryFn) throw new Error("Invalid binary operation");
  if (!token.first) throw new Error("Missing operand(s) for binary operation");
  const a = evaluateAST(token.first);
  const b = evaluateAST(token.second);
  return token.binaryFn(a, b);
}
