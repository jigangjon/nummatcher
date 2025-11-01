// () and [] allowed by default
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

type Operator = {
  symbol: string;
  precedence: number;
  associativity: "left" | "right";
  arity: number;
};

type Operators = Record<string, Operator>;

const ALL_OPERATORS: Operators = {};

type Token = {
  type: "num" | "op" | "paren" | "fn" | "comma";
  value: string;
};

export function tokenize(expression: string) {
  const tokens: Token[] = [];
  const lowerExpression = expression.toLowerCase();
}

export function parseTokens(tokens: Token[]) {}

export function evaluate(parsedExpression: any) {}

type Symbol = {
  symbol: string;
  lbp: number;
  nud?(): Symbol;
  led?(left: Symbol): Symbol;
  first?: Symbol;
  second?: Symbol;
};

function numberSymbol(value: string): Symbol {
  return {
    symbol: value,
    lbp: 0,
    nud() {
      return this;
    },
  };
}

function operatorSymbol(
  value: string,
  lbp: number = 0,
  prefix: boolean = false,
  infix: boolean = false,
  suffix: boolean = false,
  rightAssociative: number = 0
): Symbol {
  return {
    symbol: value,
    lbp,
    ...(prefix
      ? {
          nud() {
            this.first = foo(100);
            return this;
          },
        }
      : {}),
    ...(infix
      ? {
          led(left: Symbol) {
            this.first = left;
            this.second = foo(lbp - rightAssociative);
            return this;
          },
        }
      : {}),
    ...(suffix
      ? {
          led(left: Symbol) {
            this.first = left;
            return this;
          },
        }
      : {}),
  };
}

const endSymbol: Symbol = {
  symbol: "end",
  lbp: 0,
};

function foo(expression: any) {
  return endSymbol;
}

function expression(rbp: number = 0) {}
