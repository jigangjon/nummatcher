import { DecimalOptions } from "./pratt-parser";

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
  | "."
  | "leading .";

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
  "leading .",
];

export const SPECIAL_OPERATORS = ["concat", ".", "unary -"];

export function getTokensAndOptions(symbols: OperatorSymbol[]) {
  const decimalOption = symbols.includes("leading .")
    ? DecimalOptions.LEADING
    : symbols.includes(".")
      ? DecimalOptions.NO_LEADING
      : DecimalOptions.NOT_ALLOWED;
  const options = {
    concat: symbols.includes("concat"),
    decimal: decimalOption,
    unaryMinus: symbols.includes("unary -"),
  };
  const operators = symbols.filter((s) => !SPECIAL_OPERATORS.includes(s));
  const tokens = [...operators, "(", ")", "[", "]", ","];
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
