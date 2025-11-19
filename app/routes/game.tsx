import { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/game";
import {
  ALL_OPERATOR_SYMBOLS,
  EXTENDED_OPERATOR_SYMBOLS,
  getTokensAndOptions,
  type GameBrief,
} from "~/utils/games";
import { Input } from "~/components/ui/input";
import { tokenizeRestricted, tokensToAST } from "~/utils/pratt-parser";
import { evaluateAST, simplify } from "~/utils/ast-handlers";
import Stopwatch, { type StopwatchHandle } from "~/components/stopwatch";
import supabase from "~/lib/supabase/client";
import Fraction from "fraction.js";

// go to next round if no answer in 2 minutes
// easy: 1-18, 20-21, 24, 30, 36, 40
// medium: 19, 22, 25, 27-28, 32, 35, 42, 45, 48, 56, 60, 72
// hard: 23, 26, 33, 44, 50, 54, 63, 70, 80
// extreme: 49, 64, 84, 90
// 29, 31, 34, 37-39, 41, 43, 46, 47, 51-53, 55, 57-59, 61-62, 65-69, 71, 73-79, 81-83, 85-89, 91-100

// TODO: prevent fake timers

type GameInfo = GameBrief & {
  roomName: string;
};

export async function loader({}: Route.LoaderArgs) {
  const game: GameInfo = {
    hostId: "cc7be87c-d52d-4f49-9aba-bcb15c7084a8",
    rounds: 100,
    maxPlayers: 4,
    numberSet: [10, 10, 10, 10],
    operators: ALL_OPERATOR_SYMBOLS,
    hostNickname: "qwertyuiop",
    roomName: "test",
  };
  return { game };
}

export default function Game({ loaderData }: Route.ComponentProps) {
  const { game } = loaderData;
  const [round, setRound] = useState(0);
  const [answer, setAnswer] = useState("");
  const [target, setTarget] = useState(0);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [initialTimer, setInitialTimer] = useState(3);
  const inputRef = useRef<HTMLInputElement>(null);
  const stopwatchRef = useRef<StopwatchHandle>(null);

  const { tokens: allowedOperators, options } = getTokensAndOptions(
    game.operators
  );
  function resetRound() {
    if (stopwatchRef.current) {
      const time = stopwatchRef.current.getTime();
      stopwatchRef.current.reset();
      stopwatchRef.current.start();
      console.log("Stopwatch reset and started at time:", time);
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
    setTarget(Math.floor(Math.random() * 100) + 1);
    setNumbers(game.numberSet.map((n) => Math.floor(Math.random() * n) + 1));
    setAnswer("");
  }
  useEffect(() => {
    if (initialTimer > 0) {
      const timer = setTimeout(() => {
        setInitialTimer((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setRound(1);
    }
  }, [initialTimer]);
  useEffect(() => {
    if (round === 0) return;
    setTimeout(() => resetRound(), 0);
  }, [round]);
  const handleSubmit = async () => {
    try {
      const tokens = tokenizeRestricted(
        answer,
        allowedOperators,
        numbers,
        options.concat,
        options.decimal
      );
      const ast = tokensToAST(tokens, options.unaryMinus);
      const simplified = simplify(ast);
      const result = evaluateAST(simplified);
      if (result.equals(new Fraction(target))) {
        console.log("Correct!");
        (async () => {
          const { data, error } = await supabase
            .from("num-match-test-history")
            .insert({
              operators: game.operators,
              number_range: game.numberSet,
              round,
              target,
              numbers,
              answer,
              result: "correct",
              time_taken_ms: stopwatchRef.current?.getTime() ?? null,
            });
          if (error) {
            console.log("Error saving result:", error);
          } else {
            console.log("Result saved:", data);
          }
        })();
        if (round === game.rounds) {
          console.log("Game over!");
          stopwatchRef.current?.pause();
          return;
        }
        setRound((prev) => prev + 1);
      } else {
        console.log("Incorrect. Result:", result);
      }
    } catch (error) {
      console.log("Error evaluating expression:", error);
    }
  };
  const requestSkip = async () => {
    console.log("Round skipped");
    (async () => {
      const { data, error } = await supabase
        .from("num-match-test-history")
        .insert({
          operators: game.operators,
          number_range: game.numberSet,
          round,
          target,
          numbers,
          result: "skipped",
          time_taken_ms: stopwatchRef.current?.getTime() ?? null,
        });
      if (error) {
        console.log("Error saving result:", error);
      } else {
        console.log("Result saved:", data);
      }
    })();
    resetRound();
  };
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Tab") {
      e.preventDefault();
      requestSkip();
    }
  };
  return (
    <div className="flex flex-col gap-6 justify-center items-center max-w-[50rem]">
      <div className="flex justify-between items-center w-full">
        <div className="flex text-2xl sm:text-3xl">
          Round {round}/{game.rounds}
        </div>
        <div className="flex flex-col gap-1">
          {initialTimer ? (
            <div className="flex items-center justify-end text-2xl sm:text-3xl text-red-500 font-semibold leading-none">
              Starting in {initialTimer}...
            </div>
          ) : (
            <Stopwatch
              ref={stopwatchRef}
              className="flex items-center justify-end text-2xl sm:text-3xl font-semibold leading-none [font-variant-numeric:tabular-nums]"
            />
          )}
          <div className="flex items-center justify-end text-green-700 dark:text-green-500 text-lg sm:text-xl font-extrabold leading-none">
            +42 Points
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 w-full justify-items-center items-center gap-6">
        <div className="bg-target-card flex flex-col items-center justify-center w-[min(max(55%,20rem),100%)] aspect-[2/1] md:aspect-[3/2] dark:border-border-muted shadow rounded-2xl">
          <div className="text-2xl sm:max-md:text-3xl font-semibold">
            Target
          </div>
          <div className="text-7xl sm:max-md:text-8xl font-semibold mt-1">
            {target}
          </div>
        </div>
        <CardGrid numbers={numbers} />
      </div>
      <Input
        ref={inputRef}
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={handleInputKeyDown}
        placeholder="Enter math expression..."
      />
    </div>
  );
}

function Card({
  children,
  className,
  cols,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { cols: number }) {
  const [gapAccount, setGapAccount] = useState<number>(1);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setGapAccount(3);
      } else {
        setGapAccount(1.6);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  return (
    <div
      className={`bg-background-light flex justify-center items-center dark:border-border-muted dark:border-2 shadow dark:shadow-none grow-0 shrink-0 max-w-24 aspect-[4/4] rounded-2xl font-semibold text-5xl sm:max-md:text-6xl ${className}`}
      style={{ flexBasis: `calc(${100 / cols}% - ${gapAccount}%)` }}
      {...props}
    >
      {children}
    </div>
  );
}

function CardGrid({ numbers }: { numbers: number[] }) {
  const [rows, setRows] = useState<number[][]>([]);
  const [alignCenter, setAlignCenter] = useState(true);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setRows(distributeIntoRows(numbers, 4, true));
        setAlignCenter(true);
      } else if (window.innerWidth < 768) {
        setRows(distributeIntoRows(numbers, 5, true));
        setAlignCenter(true);
      } else {
        setRows(distributeIntoRows(numbers, 5, false));
        setAlignCenter(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [numbers]);
  return (
    <div className="md:col-span-2 flex flex-col justify-center space-y-[3.5%] sm:space-y-[2%] w-full mx-auto">
      {rows.map((row, i) => (
        <div
          key={i}
          className={`flex gap-[3.5%] sm:gap-[2%] w-full ${alignCenter ? "justify-center" : "justify-start"}`}
        >
          {row.map((item, j) => (
            <Card key={j} cols={rows[0].length}>
              {item}
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}

function distributeIntoRows<T>(
  items: T[],
  maxCols: number,
  evenly: boolean
): T[][] {
  const total = items.length;
  const rows = Math.ceil(total / maxCols);
  const base = evenly ? Math.floor(total / rows) : maxCols;
  const extra = evenly ? total % rows : 0;

  const result: T[][] = [];
  let index = 0;

  for (let i = 0; i < rows; i++) {
    const count = base + (i < extra ? 1 : 0);
    result.push(items.slice(index, index + count));
    index += count;
  }

  return result;
}
