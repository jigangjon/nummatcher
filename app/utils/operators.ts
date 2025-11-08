import { ALL_OPERATORS, type Tokens } from "./pratt-parser";

export const allOperatorSymbols = Object.keys(ALL_OPERATORS);

export function getOperatorTokensFromSymbols(symbols: string[]): Tokens {
  const tokens: Tokens = {};
  for (const symbol of symbols) {
    if (!ALL_OPERATORS[symbol]) {
      throw new Error(`Unknown operator symbol: ${symbol}`);
    }
    tokens[symbol] = ALL_OPERATORS[symbol];
  }
  return tokens;
}
