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
  | "sqrt"
  | "nthroot"
  | "concat"
  | "!!"
  | "P"
  | "C"
  | "."
  | "unary -";

export const BASIC_OPERATORS = ["+", "-", "*", "/"];
export const EXTENDED_OPERATORS = ["+", "-", "*", "/", "!", "^", "sqrt"];
export const ALL_OPERATORS = [
  "+",
  "-",
  "*",
  "/",
  "!",
  "^",
  "sqrt",
  "nthroot",
  "concat",
  "!!",
  "P",
  "C",
  ".",
  "unary -",
];

export function matchDefaultOperators(operators: OperatorSymbol[]) {
  if (arraysEqual(operators, BASIC_OPERATORS)) return 1;
  if (arraysEqual(operators, EXTENDED_OPERATORS)) return 2;
  if (arraysEqual(operators, ALL_OPERATORS)) return 3;
  return 0;
}

function arraysEqual(a: any[], b: any[]) {
  return a.length === b.length && a.every((val, index) => val === b[index]);
}
