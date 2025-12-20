import Fraction from "fraction.js";
import { useRef, useState } from "react";
import Stopwatch, { type StopwatchHandle } from "~/components/stopwatch";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { astToString, evaluateAST, simplify } from "~/utils/evaluator";
import {
  ALL_OPERATOR_SYMBOLS,
  DecimalOptions,
  parse,
} from "~/utils/pratt-parser";

export default function Test() {
  const [numbers, setNumbers] = useState("");
  const [expr, setExpr] = useState("");
  const [concat, setConcat] = useState(true);
  const [decimal, setDecimal] = useState<DecimalOptions>(
    DecimalOptions.LEADING
  );
  const [unaryMinus, setUnaryMinus] = useState(true);
  const a = new Fraction("1");
  function handleExpressionKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const ast = parse(
        expr,
        ALL_OPERATOR_SYMBOLS,
        numbers.split(",").map((n) => parseFloat(n)),
        concat,
        decimal,
        unaryMinus
      );
      console.log("AST:", ast);
      console.log("string:", astToString(ast));
      const simplified = simplify(ast);
      const evaluated = evaluateAST(simplified, unaryMinus);
      console.log("Simplified AST:", simplified);
      console.log("Evaluated result:", evaluated);
      console.log("string:", evaluated.toString());
      setExpr("");
    }
  }
  return (
    <>
      <label htmlFor="concat">Concat</label>
      <input
        type="checkbox"
        id="concat"
        checked={concat}
        onChange={(e) => setConcat(e.target.checked)}
      />
      <label htmlFor="unaryMinus">Unary Minus</label>
      <input
        type="checkbox"
        id="unaryMinus"
        checked={unaryMinus}
        onChange={(e) => setUnaryMinus(e.target.checked)}
      />
      <br />
      <label htmlFor="decimalNotAllowed">Decimal Not Allowed</label>
      <input
        type="radio"
        id="decimalNotAllowed"
        name="decimal"
        checked={decimal === DecimalOptions.NOT_ALLOWED}
        onChange={() => setDecimal(DecimalOptions.NOT_ALLOWED)}
      />
      <label htmlFor="decimalNoLeading">Decimal No Leading</label>
      <input
        type="radio"
        id="decimalNoLeading"
        name="decimal"
        checked={decimal === DecimalOptions.NO_LEADING}
        onChange={() => setDecimal(DecimalOptions.NO_LEADING)}
      />
      <label htmlFor="decimalLeading">Decimal Leading</label>
      <input
        type="radio"
        id="decimalLeading"
        name="decimal"
        checked={decimal === DecimalOptions.LEADING}
        onChange={() => setDecimal(DecimalOptions.LEADING)}
      />
      <br />
      <Input
        value={numbers}
        onChange={(e) => setNumbers(e.target.value)}
        onKeyDown={handleExpressionKeyDown}
      />
      <Input
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        onKeyDown={handleExpressionKeyDown}
      />
    </>
  );
}
