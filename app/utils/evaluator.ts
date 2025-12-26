// (), [] allowed by default
// () and [] are the same, so (3+5] is valid
// +, -, *(×), /(÷), !, ^(**), sqrt, nthroot, concat, !!, P, C, decimal, unary -
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
// leading decimal point to be added later
// repeated decimal points to be handled later

// TODO: be careful with simplifying exponents (((-2)^2)^1/2)

import Fraction from "fraction.js";
import {
  operatorNode,
  numberNode,
  type Node,
  FUNCTIONS,
  PREFIXES,
  POSTFIXES,
  INFIXES,
  ParseError,
} from "./pratt-parser";
import { MoreMath } from "./more-math";

export function getOperatorFunctionMap(unaryMinus: boolean) {
  return {
    "+": { 1: (a: Fraction) => a, 2: (a: Fraction, b: Fraction) => a.add(b) },
    "-": {
      1: unaryMinus ? (a: Fraction) => a.neg() : undefined,
      2: (a: Fraction, b: Fraction) => a.sub(b),
    },
    "*": { 2: (a: Fraction, b: Fraction) => a.mul(b) },
    "/": { 2: (a: Fraction, b: Fraction) => a.div(b) },
    "^": { 2: (a: Fraction, b: Fraction) => a.pow(b) },
    "!": { 1: (a: Fraction) => new Fraction(MoreMath.factorial(a.valueOf())) },
    sqrt: { 1: (a: Fraction) => a.pow(0.5) },
    "!!": {
      1: (a: Fraction) =>
        new Fraction(MoreMath.multipleFactorial(a.valueOf(), 2)),
    },
    root: { 2: (a: Fraction, b: Fraction) => b.pow(new Fraction(1).div(a)) },
    p: {
      2: (a: Fraction, b: Fraction) =>
        new Fraction(MoreMath.P(a.valueOf(), b.valueOf())),
    },
    c: {
      2: (a: Fraction, b: Fraction) =>
        new Fraction(MoreMath.C(a.valueOf(), b.valueOf())),
    },
  };
}

export function simplify(node: Node): Node {
  if (node.value != null || node.args == null) return node;
  const simplifiedArgs = node.args.map((arg) => simplify(arg));
  if (node.symbol == "sqrt") {
    const simplified = operatorNode("^", [
      simplifiedArgs[0],
      numberNode("0.5"),
    ]);
    return simplify(simplified);
  }
  if (node.symbol == "root") {
    const exponent = operatorNode("/", [numberNode("1"), simplifiedArgs[0]]);
    const simplified = operatorNode("^", [simplifiedArgs[1], exponent]);
    return simplify(simplified);
  }
  if (node.symbol == "^" && simplifiedArgs[0].symbol == "^") {
    const base = simplifiedArgs[0].args![0];
    const exponent = operatorNode("*", [
      simplifiedArgs[0].args![1],
      simplifiedArgs[1],
    ]);
    const simplified = operatorNode("^", [base, exponent]);
    return simplify(simplified);
  }
  return operatorNode(node.symbol, simplifiedArgs);
}

export function evaluateAST(node: Node, unaryMinus: boolean): Fraction {
  if (node.value != null) return node.value;
  if (node.args == null) {
    throw new ParseError(`Operator ${node.symbol} is missing arguments`);
  }
  const operatorFunctionsMap = getOperatorFunctionMap(unaryMinus);
  if (!(node.symbol in operatorFunctionsMap)) {
    throw new ParseError(`Unknown operator: ${node.symbol}`);
  }
  const arity = node.args.length;
  if (!(arity in operatorFunctionsMap[node.symbol])) {
    throw new ParseError(
      `Operator ${node.symbol} does not take ${arity} arguments`
    );
  }
  let evaluatedArgs;
  try {
    evaluatedArgs = node.args.map((arg) => evaluateAST(arg, unaryMinus));
    const operatorFunction = operatorFunctionsMap[node.symbol][arity];
    const result = operatorFunction(...evaluatedArgs);
    if (result === null) throw new FractionError(node.symbol, evaluatedArgs);
    return result;
  } catch (error) {
    if (error instanceof FractionError || error instanceof ParseError)
      throw error;
    throw new FractionError(node.symbol, evaluatedArgs!);
  }
}

export function astToString(node: Node, wrapParentheses = false): string {
  if (node.value != null) {
    return wrapParentheses ? `(${node.symbol})` : node.symbol;
  }
  if (node.args == null) {
    return wrapParentheses
      ? `(symbol ${node.symbol})`
      : `symbol ${node.symbol}()`;
  }
  if (FUNCTIONS.includes(node.symbol)) {
    const argStrings = node.args.map((arg) => astToString(arg, false));
    const str = `${node.symbol}(${argStrings.join(", ")})`;
    return wrapParentheses ? `(${str})` : str;
  }
  if (node.args.length === 1) {
    if (PREFIXES.includes(node.symbol)) {
      const wrapArg =
        !(node.args[0].value != null) &&
        !FUNCTIONS.includes(node.args[0].symbol);
      const argString = astToString(node.args[0], wrapArg);
      const str = `${node.symbol}${argString}`;
      return wrapParentheses ? `(${str})` : str;
    }
    if (POSTFIXES.includes(node.symbol)) {
      const wrapArg = !(node.args[0].value != null);
      const argString = astToString(node.args[0], wrapArg);
      const str = `${argString}${node.symbol}`;
      return wrapParentheses ? `(${str})` : str;
    }
    throw new ParseError(`Unknown unary operator: ${node.symbol}`);
  }
  if (node.args.length === 2) {
    if (INFIXES.includes(node.symbol)) {
      const wrapLeft = !(node.args[0].value != null);
      const wrapRight =
        !(node.args[1].value != null) &&
        !FUNCTIONS.includes(node.args[1].symbol);
      const leftString = astToString(node.args[0], wrapLeft);
      const rightString = astToString(node.args[1], wrapRight);
      const str = `${leftString}${node.symbol}${rightString}`;
      return wrapParentheses ? `(${str})` : str;
    }
    throw new ParseError(`Unknown binary operator: ${node.symbol}`);
  }
  throw new ParseError(
    `Operator ${node.symbol} has invalid number of arguments`
  );
}

export class FractionError extends Error {
  constructor(symbol: string, args: Fraction[]) {
    super(`"${operatorFractionArgsToString(symbol, args)}" is not a Fraction`);
    this.name = "FractionError";
  }
}

function operatorFractionArgsToString(
  symbol: string,
  args: Fraction[]
): string {
  if (FUNCTIONS.includes(symbol)) {
    const argStrings = args.map((arg) => arg.toString());
    const str = `${symbol}(${argStrings.join(", ")})`;
    return str;
  }
  if (args.length === 1) {
    if (PREFIXES.includes(symbol)) {
      const str = `${symbol}${args[0].toString()}`;
      return str;
    }
    if (POSTFIXES.includes(symbol)) {
      const str = `${args[0].toString()}${symbol}`;
      return str;
    }
    throw new ParseError(`Unknown unary operator: ${symbol}`);
  }
  if (args.length === 2) {
    if (INFIXES.includes(symbol)) {
      const str = `${args[0].toString()}${symbol}${args[1].toString()}`;
      return str;
    }
    throw new ParseError(`Unknown binary operator: ${symbol}`);
  }
  throw new ParseError(`Operator ${symbol} has invalid number of arguments`);
}

// simplification rules
// large factorial: range-like (start, finish, step)
// powers: store base and exponent
// (a^b)^c = a^(b*c)
// root(a, b) = b^(1/a)
// (a*b)^c = a^c * b^c
