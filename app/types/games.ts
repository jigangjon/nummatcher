export type GameConfig = {
  hostId: string;
  rounds: number;
  maxPlayers: number;
  numberSet: number[];
  operators: Operators[];
  invitations?: string[];
};

export type Operators =
  | "+"
  | "-"
  | "*"
  | "/"
  | "()"
  | "!"
  | "^"
  | "sqrt"
  | "nthroot"
  | "concat"
  | "!!"
  | "P"
  | "C"
  | ".";
