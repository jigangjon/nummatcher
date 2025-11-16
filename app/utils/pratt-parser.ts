/**
 * Math expression parser with Pratt's algorithm
 * https://web.archive.org/web/20150228044653/http://effbot.org/zone/simple-top-down-parsing.htm
 */

import { MoreMath } from "./more-math";

// have to use all numbers or not

export interface Token {
  symbol: string;
  value?: number;
  lbp: number;
  nud?(tokenList: Token[], currentIndex: number): TokenWithIndex;
  led?(left: Token, tokenList: Token[], currentIndex: number): TokenWithIndex;
  first?: Token;
  second?: Token;
  unaryFn?: (a: number) => number;
  binaryFn?: (a: number, b: number) => number;
}

export interface TokenWithIndex {
  left: Token;
  nextIndex: number;
}

export type Tokens = Record<string, () => Token>;

export function tokenize(input: string, operators: Tokens): Token[] {
  input = input.toLowerCase().replaceAll(/\s+/g, "");
  const tokens: Token[] = [];
  let i = 0;
  const operatorSymbols = Object.keys(operators).sort(
    (a, b) => b.length - a.length
  );
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
    value: Number.parseFloat(symbol),
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
  unaryFn?: (a: number) => number,
  binaryFn?: (a: number, b: number) => number
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

export function suffixLed() {
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

export const ALL_OPERATORS: Tokens = {
  "+": () =>
    operatorToken(
      "+",
      10,
      prefixNud(20),
      infixLed(10),
      (a) => a,
      (a, b) => a + b
    ),
  "-": () =>
    operatorToken(
      "-",
      10,
      prefixNud(20),
      infixLed(10),
      (a) => -a,
      (a, b) => a - b
    ),
  "*": () =>
    operatorToken("*", 20, undefined, infixLed(20), undefined, (a, b) => a * b),
  "/": () =>
    operatorToken("/", 20, undefined, infixLed(20), undefined, (a, b) => a / b),
  "^": () =>
    operatorToken(
      "^",
      30,
      undefined,
      infixLed(29) /* right associative */,
      undefined,
      (a, b) => Math.pow(a, b)
    ),
  "**": () =>
    operatorToken(
      "^",
      30,
      undefined,
      infixLed(29) /* right associative */,
      undefined,
      (a, b) => Math.pow(a, b)
    ),
  "!": () =>
    operatorToken("!", 50, undefined, suffixLed(), (a) =>
      MoreMath.factorial(a)
    ),
  sqrt: () =>
    operatorToken("sqrt", 60, prefixNud(60), undefined, (a) => Math.sqrt(a)),
  "!!": () =>
    operatorToken("!!", 50, undefined, suffixLed(), (a) =>
      MoreMath.multipleFactorial(a, 2)
    ),
  root: () =>
    operatorToken("root", 0, functionNud(2), undefined, undefined, (a, b) =>
      Math.pow(b, 1 / a)
    ),
  p: () =>
    operatorToken("p", 40, functionNud(2), infixLed(40), undefined, (a, b) =>
      MoreMath.P(a, b)
    ),
  c: () =>
    operatorToken("c", 40, functionNud(2), infixLed(40), undefined, (a, b) =>
      MoreMath.C(a, b)
    ),
  "(": () => operatorToken("(", 200, parenNud()),
  ")": () => operatorToken(")"),
  "[": () => operatorToken("(", 200, parenNud()),
  "]": () => operatorToken(")"),
  ",": () => operatorToken(","),
};
