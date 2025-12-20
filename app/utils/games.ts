import { OPERATOR_TOKEN_MAP, type Tokens } from "./pratt-parser";

export type GameConfig = {
  hostId: string;
  rounds: number;
  maxPlayers: number;
  numberSet: number[];
  operators: OperatorSymbol[];
  invitations?: string[];
};

export type GameBrief = GameConfig & {
  hostNickname: string;
};

export type OperatorSymbol =
  | "+"
  | "-"
  | "*"
  | "/"
  | "!"
  | "^"
  | "**"
  | "sqrt"
  | "unary -"
  | "root"
  | "concat"
  | "!!"
  | "p"
  | "c"
  | ".";

export const BASIC_OPERATOR_SYMBOLS: OperatorSymbol[] = ["+", "-", "*", "/"];
export const EXTENDED_OPERATOR_SYMBOLS: OperatorSymbol[] = [
  "+",
  "-",
  "*",
  "/",
  "!",
  "^",
  "**",
  "sqrt",
  "unary -",
];
export const ALL_OPERATOR_SYMBOLS: OperatorSymbol[] = [
  "+",
  "-",
  "*",
  "/",
  "!",
  "^",
  "**",
  "sqrt",
  "unary -",
  "root",
  "concat",
  "!!",
  "p",
  "c",
  ".",
];

export const SPECIAL_OPERATORS = ["concat", ".", "unary -"] as const;

export function getTokensAndOptions(symbols: OperatorSymbol[]) {
  const options = {
    concat: symbols.includes("concat"),
    decimal: symbols.includes("."),
    unaryMinus: symbols.includes("unary -"),
  };
  const operators = Object.fromEntries(
    symbols
      .filter((s) => !SPECIAL_OPERATORS.includes(s))
      .map((s) => [s, OPERATOR_TOKEN_MAP[s]])
  ) as Tokens;
  const tokens = {
    ...operators,
    "(": OPERATOR_TOKEN_MAP["("],
    ")": OPERATOR_TOKEN_MAP[")"],
    "[": OPERATOR_TOKEN_MAP["["],
    "]": OPERATOR_TOKEN_MAP["]"],
    ",": OPERATOR_TOKEN_MAP[","],
  };
  return { tokens, options };
}

export function matchDefaultOperators(operators: OperatorSymbol[]) {
  if (arraysEqual(operators, BASIC_OPERATOR_SYMBOLS)) return 1;
  if (arraysEqual(operators, EXTENDED_OPERATOR_SYMBOLS)) return 2;
  if (arraysEqual(operators, ALL_OPERATOR_SYMBOLS)) return 3;
  return 0;
}

function arraysEqual(a: any[], b: any[]) {
  return a.length === b.length && a.every((val, index) => val === b[index]);
}
