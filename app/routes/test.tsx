import { evaluateAST } from "~/utils/ast-evaluator";
import {
  ALL_OPERATORS,
  tokenize,
  tokenizeRestricted,
  tokensToAST,
} from "~/utils/pratt-parser";

export default function Test() {
  try {
    const tokens = tokenizeRestricted(
      "1+*2",
      ALL_OPERATORS,
      [1, 2],
      true,
      false
    );
    const ast = tokensToAST(tokens);
    const result = evaluateAST(ast);
    console.log("Tokens:", tokens);
    console.log("AST:", JSON.stringify(ast, null, 2));
    console.log("Result:", result);
  } catch (error) {
    console.log(error);
  }
  return <div>Check console for test results.</div>;
}
