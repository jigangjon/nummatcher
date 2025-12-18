/**
 * Math expression parser with Pratt's algorithm
 * https://web.archive.org/web/20150228044653/http://effbot.org/zone/simple-top-down-parsing.htm
 */

import Fraction from "fraction.js";
import { MoreMath } from "./more-math";

// have to use all numbers or not
// TODO: use symbol-function dictionary instead of function inside operator class
// TODO: use arguments list instead of first and second

export interface Operator {
  symbol: string;
  unaryFn?: (a: Fraction) => Fraction;
  binaryFn?: (a: Fraction, b: Fraction) => Fraction;
}

export interface Node {
  symbol: string;
  value?: Fraction;
  first?: Node;
  second?: Node;
  unaryFn?: (a: Fraction) => Fraction;
  binaryFn?: (a: Fraction, b: Fraction) => Fraction;
}
export interface Token extends Node {
  lbp: number;
  nud?(tokenList: Token[], currentIndex: number): TokenWithIndex;
  led?(left: Token, tokenList: Token[], currentIndex: number): TokenWithIndex;
}

export interface TokenWithIndex {
  left: Token;
  nextIndex: number;
}

export type Tokens = Record<string, () => Token>;

export function tokenize(input: string, operators: Tokens): Token[] {
  input = input.toLowerCase().replaceAll(/\s+/g, "");
  const tokens: Token[] = [];
  const operatorSymbols = Object.keys(operators).sort(
    (a, b) => b.length - a.length
  );
  let i = 0;
  while (i < input.length) {
    const char = input[i];
    if (/\d/.test(char)) {
      let numStr = char;
      let decimalAvailable = true;
      i++;
      while (i < input.length) {
        if (input[i] === ".") {
          if (!decimalAvailable) break;
          decimalAvailable = false;
          numStr += ".";
          i++;
        } else if (/\d/.test(input[i])) {
          numStr += input[i];
          i++;
        } else {
          break;
        }
      }
      tokens.push(numberToken(numStr));
      continue;
    }
    let matchedOperator: string | null = null;
    for (const operatorSymbol of operatorSymbols) {
      if (input.startsWith(operatorSymbol, i)) {
        matchedOperator = operatorSymbol;
        break;
      }
    }
    if (matchedOperator) {
      tokens.push(operators[matchedOperator]());
      i += matchedOperator.length;
      continue;
    }
    throw new Error(`Unknown symbol: ${char}`);
  }
  tokens.push(endToken());
  return tokens;
}

export function tokenizeRestricted(
  input: string,
  operators: Tokens,
  numbers: number[],
  concat: boolean,
  decimal: boolean
): Token[] {
  input = input.toLowerCase().replaceAll(/\s+/g, "");
  const tokens: Token[] = [];
  let i = 0;
  const operatorSymbols = Object.keys(operators).sort(
    (a, b) => b.length - a.length
  );
  const availableNumberSymbols = numbers
    .map((n) => n.toString())
    .sort((a, b) => b.length - a.length);
  while (i < input.length) {
    const char = input[i];
    if (/\d/.test(char)) {
      let numStr = "";
      let decimalAvailable = decimal;
      let matchedNumber: string;
      while (true) {
        matchedNumber = "";
        for (const [j, numberSymbol] of availableNumberSymbols.entries()) {
          if (input.startsWith(numberSymbol, i)) {
            matchedNumber = numberSymbol;
            availableNumberSymbols.splice(j, 1);
            i += matchedNumber.length;
            break;
          }
        }
        if (!matchedNumber) break;
        numStr += matchedNumber;
        if (input[i] === ".") {
          if (!decimalAvailable) break;
          decimalAvailable = false;
          numStr += ".";
          i++;
          continue;
        }
        if (!concat) break;
      }
      if (!numStr) throw new Error(`Number ${char} used too many times`);
      tokens.push(numberToken(numStr));
      continue;
    }
    let matchedOperator: string | null = null;
    for (const operatorSymbol of operatorSymbols) {
      if (input.startsWith(operatorSymbol, i)) {
        matchedOperator = operatorSymbol;
        i += matchedOperator.length;
        break;
      }
    }
    if (!matchedOperator) throw new Error(`Symbol ${char} not available`);
    tokens.push(operators[matchedOperator]());
  }
  if (availableNumberSymbols[0])
    throw new Error(`Didn't use number ${availableNumberSymbols[0]}`);
  tokens.push(endToken());
  return tokens;
}

export function expressionNud(
  rbp: number,
  tokenList: Token[],
  currentIndex: number,
  unaryMinus = true
): TokenWithIndex {
  const currentToken = tokenList[currentIndex];
  if (currentToken.symbol === "__end")
    throw new Error("expression ended unfinished");
  if (!currentToken.nud) {
    throw new Error(`Unexpected symbol: ${currentToken.symbol}`);
  }
  if (currentToken.symbol === "-" && !unaryMinus) {
    throw new Error(`Unary minus "-" not allowed`);
  }
  const { left, nextIndex } = currentToken.nud(tokenList, currentIndex);
  const nextToken = tokenList[nextIndex];
  if (rbp >= nextToken.lbp) {
    return { left, nextIndex };
  }
  return expressionLed(rbp, left, tokenList, nextIndex);
}

export function expressionLed(
  rbp: number,
  left: Token,
  tokenList: Token[],
  currentIndex: number
): TokenWithIndex {
  const currentToken = tokenList[currentIndex];
  if (rbp >= currentToken.lbp) return { left, nextIndex: currentIndex };
  if (!currentToken.led) {
    throw new Error(`Unexpected symbol: ${currentToken.symbol}`);
  }
  const { left: newLeft, nextIndex } = currentToken.led(
    left,
    tokenList,
    currentIndex
  );
  return expressionLed(rbp, newLeft, tokenList, nextIndex);
}

export function numberToken(symbol: string): Token {
  return {
    symbol,
    value: new Fraction(symbol),
    lbp: 0,
    nud(tokenList: Token[], currentIndex: number) {
      return { left: this, nextIndex: currentIndex + 1 };
    },
  };
}

export function operatorToken(
  symbol: string,
  lbp: number = 0,
  nud?: (tokenList: Token[], currentIndex: number) => TokenWithIndex,
  led?: (
    left: Token,
    tokenList: Token[],
    currentIndex: number
  ) => TokenWithIndex,
  unaryFn?: (a: Fraction) => Fraction,
  binaryFn?: (a: Fraction, b: Fraction) => Fraction
): Token {
  return {
    symbol,
    lbp,
    ...(nud ? { nud } : {}),
    ...(led ? { led } : {}),
    ...(unaryFn ? { unaryFn } : {}),
    ...(binaryFn ? { binaryFn } : {}),
  };
}

export function infixLed(bp: number) {
  function led(
    this: Token,
    left: Token,
    tokenList: Token[],
    currentIndex: number
  ): TokenWithIndex {
    const { left: right, nextIndex } = expressionNud(
      bp,
      tokenList,
      currentIndex + 1
    );
    this.first = left;
    this.second = right;
    return { left: this, nextIndex };
  }
  return led;
}

export function prefixNud(bp: number) {
  function nud(
    this: Token,
    tokenList: Token[],
    currentIndex: number
  ): TokenWithIndex {
    const { left: right, nextIndex } = expressionNud(
      bp,
      tokenList,
      currentIndex + 1
    );
    this.first = right;
    return { left: this, nextIndex };
  }
  return nud;
}

export function postfixLed() {
  function led(
    this: Token,
    left: Token,
    tokenList: Token[],
    currentIndex: number
  ): TokenWithIndex {
    this.first = left;
    return { left: this, nextIndex: currentIndex + 1 };
  }
  return led;
}

export function parenNud() {
  function nud(
    this: Token,
    tokenList: Token[],
    currentIndex: number
  ): TokenWithIndex {
    const { left, nextIndex: parenIndex } = expressionNud(
      0,
      tokenList,
      currentIndex + 1
    );
    const nextIndex = assertTokenEqual(")", tokenList, parenIndex);
    return { left, nextIndex };
  }
  return nud;
}

export function functionNud(arity: 1 | 2) {
  function nud(
    this: Token,
    tokenList: Token[],
    currentIndex: number
  ): TokenWithIndex {
    const firstArgIndex = assertTokenEqual("(", tokenList, currentIndex + 1);
    let nextIndex;
    if (arity === 1) {
      const { left: first, nextIndex: parenIndex } = expressionNud(
        0,
        tokenList,
        firstArgIndex
      );
      this.first = first;
      nextIndex = assertTokenEqual(")", tokenList, parenIndex);
    } else {
      const { left: first, nextIndex: commaIndex } = expressionNud(
        0,
        tokenList,
        firstArgIndex
      );
      this.first = first;
      const secondArgIndex = assertTokenEqual(",", tokenList, commaIndex);
      const { left: second, nextIndex: parenIndex } = expressionNud(
        0,
        tokenList,
        secondArgIndex
      );
      this.second = second;
      nextIndex = assertTokenEqual(")", tokenList, parenIndex);
    }
    return { left: this, nextIndex };
  }
  return nud;
}

export function endToken(): Token {
  return {
    symbol: "__end",
    lbp: 0,
  };
}

export function assertTokenEqual(
  symbol: string,
  tokenList: Token[],
  currentIndex: number
) {
  if (tokenList[currentIndex].symbol !== symbol) {
    throw new Error(`Expected token: ${symbol}`);
  }
  return currentIndex + 1;
}

export function tokensToAST(tokens: Token[], unaryMinus = true) {
  const { left } = expressionNud(0, tokens, 0, unaryMinus);
  return left;
}

export function numberNode(symbol: string): Node {
  return {
    symbol,
    value: new Fraction(symbol),
  };
}

export function generateOperatorNode(
  symbol: string,
  first?: Node,
  second?: Node
): Node {
  const operator = ALL_OPERATORS[symbol];
  if (!operator) {
    throw new Error(`Unknown operator symbol: ${symbol}`);
  }
  return {
    ...operator,
    first,
    second,
  };
}

export const ALL_OPERATORS: Record<string, Operator> = {
  "+": { symbol: "+", unaryFn: (a) => a, binaryFn: (a, b) => a.add(b) },
  "-": { symbol: "-", unaryFn: (a) => a.neg(), binaryFn: (a, b) => a.sub(b) },
  "*": { symbol: "*", binaryFn: (a, b) => a.mul(b) },
  "/": { symbol: "/", binaryFn: (a, b) => a.div(b) },
  "^": { symbol: "^", binaryFn: (a, b) => a.pow(b) },
  "!": {
    symbol: "!",
    unaryFn: (a) => new Fraction(MoreMath.factorial(a.valueOf())),
  },
  sqrt: { symbol: "sqrt", unaryFn: (a) => a.pow(0.5) },
  "!!": {
    symbol: "!!",
    unaryFn: (a) => new Fraction(MoreMath.multipleFactorial(a.valueOf(), 2)),
  },
  root: { symbol: "root", binaryFn: (a, b) => b.pow(new Fraction(1).div(a)) },
  p: {
    symbol: "p",
    binaryFn: (a, b) => new Fraction(MoreMath.P(a.valueOf(), b.valueOf())),
  },
  c: {
    symbol: "c",
    binaryFn: (a, b) => new Fraction(MoreMath.C(a.valueOf(), b.valueOf())),
  },
};

export const ALL_OPERATOR_TOKENS: Tokens = {
  "+": () =>
    operatorToken(
      "+",
      10,
      prefixNud(20),
      infixLed(10),
      (a) => a,
      (a, b) => a.add(b)
    ),
  "-": () =>
    operatorToken(
      "-",
      10,
      prefixNud(20),
      infixLed(10),
      (a) => a.neg(),
      (a, b) => a.sub(b)
    ),
  "*": () =>
    operatorToken("*", 20, undefined, infixLed(20), undefined, (a, b) =>
      a.mul(b)
    ),
  "/": () =>
    operatorToken("/", 20, undefined, infixLed(20), undefined, (a, b) =>
      a.div(b)
    ),
  "^": () =>
    operatorToken(
      "^",
      30,
      undefined,
      infixLed(29) /* right associative */,
      undefined,
      (a, b) => a.pow(b)
    ),
  "**": () =>
    operatorToken(
      "^",
      30,
      undefined,
      infixLed(29) /* right associative */,
      undefined,
      (a, b) => a.pow(b)
    ),
  "!": () =>
    operatorToken(
      "!",
      50,
      undefined,
      postfixLed(),
      (a) => new Fraction(MoreMath.factorial(a.valueOf()))
    ),
  sqrt: () =>
    operatorToken("sqrt", 60, prefixNud(60), undefined, (a) => a.pow(0.5)),
  "!!": () =>
    operatorToken(
      "!!",
      50,
      undefined,
      postfixLed(),
      (a) => new Fraction(MoreMath.multipleFactorial(a.valueOf(), 2))
    ),
  root: () =>
    operatorToken("root", 0, functionNud(2), undefined, undefined, (a, b) =>
      b.pow(new Fraction(1).div(a))
    ),
  p: () =>
    operatorToken(
      "p",
      40,
      functionNud(2),
      infixLed(40),
      undefined,
      (a, b) => new Fraction(MoreMath.P(a.valueOf(), b.valueOf()))
    ),
  c: () =>
    operatorToken(
      "c",
      40,
      functionNud(2),
      infixLed(40),
      undefined,
      (a, b) => new Fraction(MoreMath.C(a.valueOf(), b.valueOf()))
    ),
  "(": () => operatorToken("(", 200, parenNud()),
  ")": () => operatorToken(")"),
  "[": () => operatorToken("(", 200, parenNud()),
  "]": () => operatorToken(")"),
  ",": () => operatorToken(","),
};
