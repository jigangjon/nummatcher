/**
 * Math expression parser with Pratt's algorithm
 * https://web.archive.org/web/20150228044653/http://effbot.org/zone/simple-top-down-parsing.htm
 */

import Fraction from "fraction.js";

export interface Node {
  symbol: string;
  value?: Fraction;
  args?: Node[];
}

export function numberNode(symbol: string): Node {
  return {
    symbol,
    value: new Fraction(symbol),
  };
}

export function operatorNode(symbol: string, args: Node[]): Node {
  return {
    symbol,
    args,
  };
}

interface Token extends Node {
  lbp: number;
  nud?(tokenList: Token[], currentIndex: number): TokenWithIndex;
  led?(left: Token, tokenList: Token[], currentIndex: number): TokenWithIndex;
}

interface TokenWithIndex {
  left: Token;
  nextIndex: number;
}

function numberToken(symbol: string): Token {
  return {
    symbol,
    value: new Fraction(symbol),
    lbp: 0,
    nud(tokenList: Token[], currentIndex: number) {
      return { left: this, nextIndex: currentIndex + 1 };
    },
  };
}

function operatorToken(
  symbol: string,
  lbp: number = 0,
  nud?: (tokenList: Token[], currentIndex: number) => TokenWithIndex,
  led?: (
    left: Token,
    tokenList: Token[],
    currentIndex: number
  ) => TokenWithIndex
): Token {
  return {
    symbol,
    lbp,
    ...(nud ? { nud } : {}),
    ...(led ? { led } : {}),
  };
}

function endToken(): Token {
  return {
    symbol: "__end",
    lbp: 0,
  };
}

export const ALL_OPERATOR_SYMBOLS = [
  "+",
  "-",
  "*",
  "/",
  "^",
  "**",
  "!",
  "sqrt",
  "!!",
  "root",
  "p",
  "c",
  "(",
  ")",
  "[",
  "]",
  ",",
];

export const PREFIXES = ["+", "-"];
export const INFIXES = ["+", "-", "*", "/", "^", "**", "p", "c"];
export const POSTFIXES = ["!", "!!"];
export const FUNCTIONS = ["sqrt", "root"];

const OPERATOR_TOKEN_MAP: Record<string, () => Token> = {
  "+": () => operatorToken("+", 10, prefixNud(20), infixLed(10)),
  "-": () => operatorToken("-", 10, prefixNud(20), infixLed(10)),
  "*": () => operatorToken("*", 20, undefined, infixLed(20)),
  "/": () => operatorToken("/", 20, undefined, infixLed(20)),
  "^": () => operatorToken("^", 30, undefined, infixLed(29)), // right associative
  "**": () => operatorToken("^", 30, undefined, infixLed(29)), // right associative
  "!": () => operatorToken("!", 50, undefined, postfixLed()),
  sqrt: () => operatorToken("sqrt", 60, prefixNud(60), undefined),
  "!!": () => operatorToken("!!", 50, undefined, postfixLed()),
  root: () => operatorToken("root", 0, functionNud(2), undefined),
  p: () => operatorToken("p", 40, functionNud(2), infixLed(40)),
  c: () => operatorToken("c", 40, functionNud(2), infixLed(40)),
  "(": () => operatorToken("(", 200, parenNud()),
  ")": () => operatorToken(")"),
  "[": () => operatorToken("(", 200, parenNud()),
  "]": () => operatorToken(")"),
  ",": () => operatorToken(","),
};

export enum DecimalOptions {
  NOT_ALLOWED,
  NO_LEADING,
  LEADING,
}

function isMulByJuxtaposition(left: string, right: string): boolean {
  const leftCondition =
    /\d$/.test(left) ||
    POSTFIXES.includes(left) ||
    left === ")" ||
    left === "]";
  const rightCondition =
    /^\d/.test(right) ||
    FUNCTIONS.includes(right) ||
    right === "(" ||
    right === "[";
  const notConcat = !(/[\d\.]$/.test(left) && /^[\d\.]/.test(right));
  return leftCondition && rightCondition && notConcat;
}

export function tokenizeRestricted(
  input: string,
  operators: string[],
  numbers: number[],
  concat: boolean,
  decimal: DecimalOptions
): Token[] {
  input = input.toLowerCase().replaceAll(/\s+/g, "");
  const tokens: Token[] = [];
  const operatorSymbols = [...operators].sort((a, b) => b.length - a.length);
  const unusedNumberSymbols = [...numbers.map((n) => n.toString())].sort(
    (a, b) => b.length - a.length
  );

  let i = 0;
  while (i < input.length) {
    const char = input[i];
    if (decimal === DecimalOptions.LEADING && char === ".") {
      let numStr = "";
      i++;
      while (true) {
        let matchedNumber = "";
        for (const [j, numberSymbol] of unusedNumberSymbols.entries()) {
          if (input.startsWith(numberSymbol, i)) {
            matchedNumber = numberSymbol;
            unusedNumberSymbols.splice(j, 1);
            i += matchedNumber.length;
            break;
          }
        }
        if (!matchedNumber) break;
        numStr += matchedNumber;
        if (!concat) break;
      }
      if (!numStr) throw new Error(`Number ${char} used too many times`);
      tokens.push(numberToken("." + numStr));
      continue;
    }
    if (/\d/.test(char)) {
      let numStr = "";
      let decimalAvailable = decimal !== DecimalOptions.NOT_ALLOWED;
      while (true) {
        let matchedNumber = "";
        for (const [j, numberSymbol] of unusedNumberSymbols.entries()) {
          if (input.startsWith(numberSymbol, i)) {
            matchedNumber = numberSymbol;
            unusedNumberSymbols.splice(j, 1);
            i += matchedNumber.length;
            break;
          }
        }
        if (!matchedNumber) break;
        numStr += matchedNumber;
        if (input.startsWith(".", i)) {
          if (!decimalAvailable) break;
          decimalAvailable = false;
          numStr += ".";
          i++;
          continue;
        }
        if (!concat) break;
      }
      if (!numStr) throw new Error(`Number ${char} used too many times`);
      if (isMulByJuxtaposition(tokens.at(-1)?.symbol ?? "", numStr)) {
        tokens.push(OPERATOR_TOKEN_MAP["*"]());
      }
      tokens.push(numberToken(numStr));
      continue;
    }
    let matchedOperator = "";
    for (const operatorSymbol of operatorSymbols) {
      if (input.startsWith(operatorSymbol, i)) {
        matchedOperator = operatorSymbol;
        i += matchedOperator.length;
        break;
      }
    }
    if (!matchedOperator) throw new Error(`Symbol ${char} not available`);
    if (isMulByJuxtaposition(tokens.at(-1)?.symbol ?? "", matchedOperator)) {
      tokens.push(OPERATOR_TOKEN_MAP["*"]());
    }
    tokens.push(OPERATOR_TOKEN_MAP[matchedOperator]());
  }
  if (unusedNumberSymbols[0])
    throw new Error(`Didn't use number ${unusedNumberSymbols[0]}`);
  tokens.push(endToken());
  return tokens;
}

export function tokensToAST(tokens: Token[], unaryMinus = true) {
  const { left, nextIndex } = expressionNud(0, 0, unaryMinus);
  if (tokens[nextIndex].symbol !== "__end") {
    throw new Error(
      `Unexpected token ${tokens[nextIndex].symbol} at the end of the expression`
    );
  }
  return left;

  function expressionNud(
    rbp: number,
    currentIndex: number,
    unaryMinus = true
  ): TokenWithIndex {
    const currentToken = tokens[currentIndex];
    if (currentToken.symbol === "__end")
      throw new Error("expression ended unfinished");
    if (!currentToken.nud) {
      throw new Error(`Unexpected symbol: ${currentToken.symbol}`);
    }
    if (currentToken.symbol === "-" && !unaryMinus) {
      throw new Error(`Unary minus "-" not allowed`);
    }
    const { left, nextIndex } = currentToken.nud(tokens, currentIndex);
    const nextToken = tokens[nextIndex];
    if (rbp >= nextToken.lbp) {
      return { left, nextIndex };
    }
    return expressionLed(rbp, left, nextIndex);
  }

  function expressionLed(
    rbp: number,
    left: Token,
    currentIndex: number
  ): TokenWithIndex {
    const currentToken = tokens[currentIndex];
    if (rbp >= currentToken.lbp) return { left, nextIndex: currentIndex };
    if (!currentToken.led) {
      throw new Error(`Unexpected symbol: ${currentToken.symbol}`);
    }
    const { left: newLeft, nextIndex } = currentToken.led(
      left,
      tokens,
      currentIndex
    );
    return expressionLed(rbp, newLeft, nextIndex);
  }

  function assertTokenEqual(symbol: string, currentIndex: number) {
    if (tokens[currentIndex].symbol !== symbol) {
      throw new Error(`Expected token: ${symbol}`);
    }
    return currentIndex + 1;
  }
}

export function parse(
  input: string,
  operators: string[],
  numbers: number[],
  concat: boolean,
  decimal: DecimalOptions,
  unaryMinus = true
) {
  const tokens = tokenizeRestricted(input, operators, numbers, concat, decimal);
  return tokensToAST(tokens, unaryMinus);
}

function expressionNud(
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

function expressionLed(
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

function assertTokenEqual(
  symbol: string,
  tokenList: Token[],
  currentIndex: number
) {
  if (tokenList[currentIndex].symbol !== symbol) {
    throw new Error(`Expected token: ${symbol}`);
  }
  return currentIndex + 1;
}

function prefixNud(bp: number) {
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
    this.args = [];
    this.args.push(right);
    return { left: this, nextIndex };
  }
  return nud;
}

function functionNud(arity: number) {
  function nud(
    this: Token,
    tokenList: Token[],
    currentIndex: number
  ): TokenWithIndex {
    this.args = [];
    let nextIndex = assertTokenEqual("(", tokenList, currentIndex + 1);
    if (arity === 0) {
      nextIndex = assertTokenEqual(")", tokenList, nextIndex);
      return { left: this, nextIndex };
    }
    for (let _ = 0; _ < arity - 1; _++) {
      const { left, nextIndex: commaIndex } = expressionNud(
        0,
        tokenList,
        nextIndex
      );
      this.args.push(left);
      nextIndex = assertTokenEqual(",", tokenList, commaIndex);
    }
    const { left: left, nextIndex: commaIndex } = expressionNud(
      0,
      tokenList,
      nextIndex
    );
    this.args.push(left);
    nextIndex = assertTokenEqual(")", tokenList, commaIndex);
    return { left: this, nextIndex };
  }
  return nud;
}

function parenNud() {
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

function infixLed(bp: number) {
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
    this.args = [];
    this.args.push(left);
    this.args.push(right);
    return { left: this, nextIndex };
  }
  return led;
}

function postfixLed() {
  function led(
    this: Token,
    left: Token,
    tokenList: Token[],
    currentIndex: number
  ): TokenWithIndex {
    this.args = [];
    this.args.push(left);
    return { left: this, nextIndex: currentIndex + 1 };
  }
  return led;
}
