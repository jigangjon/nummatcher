import { ALL_OPERATOR_TOKENS, type Tokens } from "./pratt-parser";

export const allOperatorSymbols = Object.keys(ALL_OPERATOR_TOKENS);

export function getOperatorTokensFromSymbols(symbols: string[]): Tokens {
  const tokens: Tokens = {};
  for (const symbol of symbols) {
    if (!ALL_OPERATOR_TOKENS[symbol]) {
      throw new Error(`Unknown operator symbol: ${symbol}`);
    }
    tokens[symbol] = ALL_OPERATOR_TOKENS[symbol];
  }
  return tokens;
}
