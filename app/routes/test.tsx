import Fraction from "fraction.js";
import { useRef, useState } from "react";
import Stopwatch, { type StopwatchHandle } from "~/components/stopwatch";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { astToString, evaluateAST, simplify } from "~/utils/ast-handlers";
import {
  ALL_OPERATOR_TOKENS,
  tokenizeRestricted,
  tokensToAST,
} from "~/utils/pratt-parser";

export default function Test() {
  const [expr, setExpr] = useState("");
  const a = new Fraction("1");
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const tokens = tokenizeRestricted(
        expr,
        ALL_OPERATOR_TOKENS,
        [2, 2],
        true,
        true
      );
      const ast = tokensToAST(tokens, true);
      const simplified = simplify(ast);
      const evaluated = evaluateAST(simplified);
      console.log("Evaluated result:", evaluated);
      console.log("AST:", ast);
      console.log("string:", astToString(ast));
      console.log("Simplified AST:", simplified);
      setExpr("");
    }
  }
  return (
    <>
      <Input
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </>
  );
}
