// (), [] allowed by default
// () and [] are the same, so (3+5] is valid
// +, -, *, /, !, ^(**), sqrt, nthroot, concat, !!, P, C, decimal, unary -
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

import { generateOperatorNode, numberNode, type Node } from "./pratt-parser";

export function evaluateAST(node: Node): number {
  if (node.value) return node.value;
  if (!node.second) {
    if (!node.unaryFn) throw new Error("Invalid unary operation");
    if (!node.first) throw new Error("Missing operand for unary operation");
    const a = evaluateAST(node.first);
    return node.unaryFn(a);
  }
  if (!node.binaryFn) throw new Error("Invalid binary operation");
  if (!node.first) throw new Error("Missing operand(s) for binary operation");
  const a = evaluateAST(node.first);
  const b = evaluateAST(node.second);
  return node.binaryFn(a, b);
}

export function simplify(node: Node | undefined): Node | undefined {
  if (node === undefined) return undefined;
  const simplifiedFirst = simplify(node.first);
  const simplifiedSecond = simplify(node.second);
  if (node.symbol == "sqrt") {
    const simplified = generateOperatorNode(
      "^",
      simplifiedFirst,
      numberNode("0.5")
    );
    return simplify(simplified);
  }
  if (node.symbol == "root") {
    const exponent = generateOperatorNode(
      "/",
      numberNode("1"),
      simplifiedFirst
    );
    const simplified = generateOperatorNode("^", simplifiedSecond, exponent);
    return simplify(simplified);
  }
  if (node.symbol == "^" && simplifiedFirst.symbol == "^") {
    const exponent = generateOperatorNode(
      "*",
      simplifiedFirst.second,
      simplifiedSecond
    );
    const simplified = generateOperatorNode(
      "^",
      simplifiedFirst.first,
      exponent
    );
    return simplify(simplified);
  }
  return {
    ...node,
    first: simplify(node.first),
    second: simplify(node.second),
  };
}

export function astToString(node: Node, wrapParentheses = false) {
  let str = "";
  if (node.value) {
    str = node.symbol;
  } else if (node.first && !node.second) {
    if (prefixes.has(node.symbol)) {
      const argString = astToString(
        node.first,
        Boolean(node.first.value || functions.has(node.first.symbol))
      );
      str = `${node.symbol}${argString}`;
    } else if (suffixes.has(node.symbol)) {
      const argString = astToString(node.first, !node.first.value);
      str = `${argString}${node.symbol}`;
    } else {
      str = `${node.symbol}(${astToString(node.first)})`;
    }
  } else if (node.first && node.second) {
    if (infixes.has(node.symbol)) {
      const leftString = astToString(node.first, !node.first.value);
      const rightString = astToString(
        node.second,
        !node.second.value && !functions.has(node.second.symbol)
      );
      str = `${leftString}${node.symbol}${rightString}`;
    } else {
      const firstString = astToString(node.first);
      const secondString = astToString(node.second);
      str = `${node.symbol}(${firstString}, ${secondString})`;
    }
  } else {
    throw new Error("Invalid AST node");
  }
  return wrapParentheses ? `(${str})` : str;
}

const prefixes = new Set(["+", "-"]);
const infixes = new Set(["+", "-", "*", "/", "^", "p", "c"]);
const suffixes = new Set(["!", "!!"]);
const functions = new Set(["sqrt", "root"]);

// simplification rules
// large factorial: range-like (start, finish, step)
// powers: store base and exponent
// (a^b)^c = a^(b*c)
// root(a, b) = b^(1/a)
// (a*b)^c = a^c * b^c
