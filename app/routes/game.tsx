import { useEffect, useState } from "react";
import type { Route } from "./+types/game";
import type { GameBrief } from "~/utils/games";
import { Input } from "~/components/ui/input";

// go to next round if no answer in 2 minutes

type GameInfo = GameBrief & {
  roomName: string;
};

export async function loader({}: Route.LoaderArgs) {
  const game: GameInfo = {
    hostId: "cc7be87c-d52d-4f49-9aba-bcb15c7084a8",
    rounds: 5,
    maxPlayers: 4,
    numberSet: [1, 2, 3, 4, 5],
    operators: ["+", "-", "*", "/"],
    hostNickname: "qwertyuiop",
    roomName: "test",
  };
  return { game };
}

export default function Game({ loaderData }: Route.ComponentProps) {
  const { game } = loaderData;
  return (
    <div className="flex flex-col justify-center items-center max-w-4xl">
      <div className="bg-target-card flex flex-col items-center justify-center w-[min(max(50%,20rem),100%)] aspect-[2/1] dark:border-border-muted shadow rounded-2xl mb-8">
        <div className="text-2xl sm:text-3xl font-semibold">Target</div>
        <div className="text-7xl sm:text-8xl font-semibold mt-1">42</div>
      </div>
      <CardGrid numbers={game.numberSet} />
      <Input placeholder="Enter your answer" />
    </div>
  );
}

function Stopwatch({
  isRunning,
  className,
}: {
  isRunning: boolean;
  className?: string;
}) {
  const [time, setTime] = useState(0);

  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 10);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const centiseconds = time % 100;
  const seconds = Math.floor(time / 100) % 60;
  const minutes = Math.floor(time / 6000);

  return (
    <div className={className}>
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}:
      {String(centiseconds).padStart(2, "0")}
    </div>
  );
}

function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-background-light flex justify-center items-center dark:border-border-muted dark:border-2 shadow-md dark:shadow-none grow-0 shrink-0 basis-[23%] aspect-[3/4] rounded-2xl font-semibold text-7xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

function CardGrid({ numbers }: { numbers: number[] }) {
  const rows = distributeEvenlyIntoRows(numbers, 4);
  return (
    <div className="flex flex-col justify-center space-y-[3.5%] w-[min(max(75%,27rem),100%)] mx-auto">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-[3.5%] w-full justify-center">
          {row.map((item, j) => (
            <Card key={j}>{item}</Card>
          ))}
        </div>
      ))}
    </div>
  );
}

function distributeEvenlyIntoRows<T>(items: T[], maxCols: number): T[][] {
  const total = items.length;
  const rows = Math.ceil(total / maxCols);
  const base = Math.floor(total / rows);
  const extra = total % rows;

  const result: T[][] = [];
  let index = 0;

  for (let i = 0; i < rows; i++) {
    const count = base + (i < extra ? 1 : 0);
    result.push(items.slice(index, index + count));
    index += count;
  }

  return result;
}
