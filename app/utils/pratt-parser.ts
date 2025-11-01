/**
 * Math expression parser with Pratt's algorithm
 * https://web.archive.org/web/20150228044653/http://effbot.org/zone/simple-top-down-parsing.htm
 */

interface Token {
  symbol: string;
  value?: number | string;
  lbp: number;
  nud?(tokenList: Token[]): Token;
  led?(left: Token, tokenList: Token[]): Token;
  first?: Token;
  second?: Token;
}

type Tokens = Record<string, () => Token>;

function tokenize(input: string, operators: Tokens): Token[] {
  input = input.toLowerCase().replace(/\s+/g, "");
  const tokens: Token[] = [];
  let i = 0;
  const operatorsSymbols = Object.keys(operators).sort(
    (a, b) => b.length - a.length
  );
  while (i < input.length) {
    const char = input[i];
    if (/\d/.test(char)) {
      let numStr = char;
      let decimal = false;
      i++;
      while (i < input.length) {
        if (input[i] === ".") {
          if (decimal) break;
          decimal = true;
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
    for (const operatorSymbol of operatorsSymbols) {
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

var tokenIndex = 0;
function expression(rbp: number, tokenList: Token[]): Token {
  let currentIndex = tokenIndex;
  tokenIndex = tokenIndex + 1;
  if (!tokenList[currentIndex].nud) {
    throw new Error(`Unexpected token: ${tokenList[currentIndex].symbol}`);
  }
  let left = tokenList[currentIndex].nud(tokenList);
  while (rbp < tokenList[tokenIndex].lbp) {
    currentIndex = tokenIndex;
    tokenIndex = currentIndex + 1;
    if (!tokenList[currentIndex].led) {
      throw new Error(`Unexpected token: ${tokenList[currentIndex].symbol}`);
    }
    left = tokenList[currentIndex].led(left, tokenList);
  }
  return left;
}

function numberToken(symbol: string): Token {
  return {
    symbol,
    value: parseFloat(symbol),
    lbp: 0,
    nud() {
      return this;
    },
  };
}

function operatorToken(
  symbol: string,
  lbp: number = 0,
  nud?: (tokenList: Token[]) => Token,
  led?: (left: Token, tokenList: Token[]) => Token
): Token {
  return {
    symbol,
    lbp,
    ...(nud ? { nud } : {}),
    ...(led ? { led } : {}),
  };
}

function infixLed(bp: number) {
  function led(this: Token, left: Token, tokenList: Token[]): Token {
    this.first = left;
    this.second = expression(bp, tokenList);
    return this;
  }
  return led;
}

function prefixNud(bp: number) {
  function nud(this: Token, tokenList: Token[]): Token {
    this.first = expression(bp, tokenList);
    return this;
  }
  return nud;
}

function suffixLed() {
  function led(this: Token, left: Token, tokenList: Token[]): Token {
    this.first = left;
    return this;
  }
  return led;
}

function parenNud() {
  function nud(this: Token, tokenList: Token[]): Token {
    const expr = expression(0, tokenList);
    advance(")", tokenList);
    return expr;
  }
  return nud;
}

function functionNud(arity: 1 | 2) {
  function nud(this: Token, tokenList: Token[]): Token {
    advance("(", tokenList);
    this.first = expression(0, tokenList);
    if (arity === 2) {
      advance(",", tokenList);
      this.second = expression(0, tokenList);
    }
    advance(")", tokenList);
    return this;
  }
  return nud;
}

function endToken(): Token {
  return {
    symbol: "__end",
    lbp: 0,
  };
}

function advance(symbol: string, tokenList: Token[]) {
  if (tokenList[tokenIndex].symbol !== symbol) {
    throw new Error(`Expected token: ${symbol}`);
  }
  tokenIndex++;
}

const testExpression1 =
  "  - 3.1231  ^ - 1   . 2 +   +412.23   4  *2-1\n/+3 - 3.1231 +   +412.23   4  *2-1\n/+3 - 3.1231 +   +412.23   4  *2-1\n/+3 - 3.1231 +   +412.23   4  *2-1\n/+3";
const testExpression2 = "4^2^3 ";
const testExpression3 = "sq rt ((3+3) !!!)";
const testExpression4 = "root(27,3) + P(5,2) - 5c2";
const ALL_OPERATORS: Tokens = {
  "+": () => operatorToken("+", 10, prefixNud(20), infixLed(10)),
  "-": () => operatorToken("-", 10, prefixNud(20), infixLed(10)),
  "*": () => operatorToken("*", 20, undefined, infixLed(20)),
  "/": () => operatorToken("/", 20, undefined, infixLed(20)),
  "^": () => operatorToken("^", 30, undefined, infixLed(29)), // right associative
  "!": () => operatorToken("!", 50, undefined, suffixLed()),
  sqrt: () => operatorToken("sqrt", 60, prefixNud(60)),
  "!!": () => operatorToken("!!", 50, undefined, suffixLed()),
  "(": () => operatorToken("(", 200, parenNud()),
  ")": () => operatorToken(")"),
  ",": () => operatorToken(","),
  root: () => operatorToken("root", 0, functionNud(2)),
  p: () => operatorToken("p", 40, functionNud(2), infixLed(40)),
  c: () => operatorToken("c", 40, functionNud(2), infixLed(40)),
};
const tokenList = tokenize(testExpression4, ALL_OPERATORS);
console.log(expression(0, tokenList));
