import { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/game";
import {
  BASIC_OPERATOR_SYMBOLS,
  getAnonymousPlayerId,
  getTokensAndOptions,
  matchDefaultOperators,
} from "~/utils/games";
import { Input } from "~/components/ui/input";
import { parse } from "~/utils/pratt-parser";
import { evaluateAST, simplify } from "~/utils/evaluator";
import Stopwatch, { type StopwatchHandle } from "~/components/stopwatch";
import supabase from "~/lib/supabase/client";
import Fraction from "fraction.js";
import precomputedBasicCombinations from "../data/precomputed-basic-combinations.json" with { type: "json" };
import { Button } from "~/components/ui/button";
import type {
  RealtimeChannel,
  RealtimePresenceState,
} from "@supabase/supabase-js";
import { createClient } from "~/lib/supabase/server";

// TODO: prevent fake timers
// TODO: server control instead of host control

type ChangeSkipStatusData = {
  playerId: string;
  wantsToSkip: boolean;
  skipStatusTime: number;
};

type AnswerSubmitData = {
  submitterId: string;
  answer: string;
  time: number;
};

type RightAnswerData = {
  submitterId: string;
  points: number;
};

type WrongAnswerData = {
  submitterId: string;
  answer: string;
  value?: Fraction;
  error?: string;
};

type SkipRoundData = {
  currentRound: number;
  target: number;
  numbers: number[];
  complexity: number;
};

type NewRoundData = {
  newRound: number;
  target: number;
  numbers: number[];
  complexity: number;
};

type RealtimeGameState = {
  numbers: number[];
  target: number;
  round: number;
  complexity: number;
};

type PlayerData = {
  id: string;
  nickname: string;
  avatarUrl?: string;
  wantsToSkip: boolean;
  skipStatusTime: number;
  active: boolean;
  score: number;
};

type RealtimePlayerState = {
  playerId: string;
  playerNickname: string;
  wantsToSkip: boolean;
  skipStatusTime: number;
};

export async function loader({ params, request }: Route.LoaderArgs) {
  console.log("Loading game with ID:", params.gameId);
  const { supabase, headers } = createClient(request);
  const { data, error } = await supabase
    .from("anonymous-games")
    .select("*")
    .eq("id", params.gameId)
    .single();
  if (error) {
    console.log("Error loading game:", error);
    throw new Response("Game not found", { status: 404 });
  }
  return { game: data, headers };
}

export default function Game({ loaderData }: Route.ComponentProps) {
  const { game } = loaderData;
  const { tokens: allowedOperators, options } = getTokensAndOptions(
    BASIC_OPERATOR_SYMBOLS
  );
  const operators = BASIC_OPERATOR_SYMBOLS;
  const numberSet = [10, 10, 10, 10];

  const [round, setRound] = useState(0);
  const [answer, setAnswer] = useState("");
  const [target, setTarget] = useState(0);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [points, setPoints] = useState(0);
  const [wantsToSkip, setWantsToSkip] = useState(false);
  const [initialTimer, setInitialTimer] = useState(3);
  const [players, setPlayers] = useState<PlayerData[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const stopwatchRef = useRef<StopwatchHandle>(null);
  const gameChannelRef = useRef<RealtimeChannel | null>(null);
  const currentPlayerRef = useRef("");
  const gameStateRef = useRef<RealtimeGameState>({
    numbers: [],
    target: 0,
    round: 0,
    complexity: 0,
  });
  const playersRef = useRef<PlayerData[]>([]);

  const CHANGE_SKIP_STATUS_EVENT = "change-skip-status";
  const ANSWER_SUBMIT_EVENT = "answer-submit";
  const RIGHT_ANSWER_EVENT = "right-answer";
  const WRONG_ANSWER_EVENT = "wrong-answer";
  const SKIP_ROUND_EVENT = "skip-round";
  const NEW_ROUND_EVENT = "new-round";
  const GAME_OVER_EVENT = "game-over";

  useEffect(() => {
    const anonymousPlayerId = getAnonymousPlayerId();
    currentPlayerRef.current = anonymousPlayerId;

    const gameChannel = supabase.channel(`game:${game.id}:events`, {
      config: {
        broadcast: { self: true },
        presence: { key: anonymousPlayerId },
      },
    });
    gameChannelRef.current = gameChannel;

    gameChannel
      .on("broadcast", { event: ANSWER_SUBMIT_EVENT }, (data) => {
        handleAnswerSubmitEvent(data.payload);
      })
      .on("broadcast", { event: CHANGE_SKIP_STATUS_EVENT }, (data) => {
        handleChangeSkipStatusEvent(data.payload);
      })
      .on("broadcast", { event: SKIP_ROUND_EVENT }, (data) => {
        handleSkipRoundEvent(data.payload);
      })
      .on("broadcast", { event: NEW_ROUND_EVENT }, (data) => {
        handleNewRoundEvent(data.payload);
      })
      .on("broadcast", { event: RIGHT_ANSWER_EVENT }, (data) => {
        handleRightAnswerEvent(data.payload);
      })
      .on("broadcast", { event: WRONG_ANSWER_EVENT }, (data) => {
        handleWrongAnswerEvent(data.payload);
      })
      .on("broadcast", { event: GAME_OVER_EVENT }, (data) => {
        handleGameOverEvent();
        stopwatchRef.current?.pause();
      })
      .on("presence", { event: "sync" }, () => {
        const newState = gameChannel.presenceState<RealtimePlayerState>();
        handleSyncEvent(newState);
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;

        await gameChannel.track({
          wantsToSkip: false,
          skipStatusTime: Date.now(),
          playerId: anonymousPlayerId,
          playerNickname: `Player-${anonymousPlayerId.slice(0, 5)}`,
        });
      });

    return () => {
      gameChannel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (initialTimer > 0) {
      const timer = setTimeout(() => {
        setInitialTimer((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      const { newNumbers, newTarget, newComplexity } = getNewRoundData();
      gameChannelRef.current?.send({
        type: "broadcast",
        event: NEW_ROUND_EVENT,
        payload: {
          newRound: 1,
          target: newTarget,
          numbers: newNumbers,
          complexity: newComplexity,
        },
      });
    }
  }, [initialTimer]);

  function getNewRoundData() {
    if (matchDefaultOperators(operators) === 1) {
      const randomCombination =
        precomputedBasicCombinations[
          Math.floor(Math.random() * precomputedBasicCombinations.length)
        ];
      const newNumbers = randomCombination.slice(0, 4);
      const newTarget = randomCombination[4];
      const newComplexity = randomCombination[5];
      return { newNumbers, newTarget, newComplexity };
    }
    const newNumbers = numberSet.map((n) => Math.floor(Math.random() * n) + 1);
    const newTarget = Math.floor(Math.random() * 100) + 1;
    const newComplexity = 0;
    return { newNumbers, newTarget, newComplexity };
  }

  function handleAnswerSubmitEvent(data: AnswerSubmitData) {
    if (currentPlayerRef.current !== game.host_id) return;
    const { numbers, target, round, complexity } = gameStateRef.current;
    const { submitterId, answer, time } = data;
    try {
      const ast = parse(
        answer,
        allowedOperators,
        numbers,
        options.concat,
        options.decimal,
        options.unaryMinus
      );
      const simplified = simplify(ast);
      const result = evaluateAST(simplified, options.unaryMinus);
      if (result.equals(new Fraction(target))) {
        console.log("Correct!");
        gameChannelRef.current?.send({
          type: "broadcast",
          event: RIGHT_ANSWER_EVENT,
          payload: {
            submitterId,
            points: calculatePoints(complexity),
          },
        });
        (async () => {
          const { data, error } = await supabase
            .from("num-match-test-history")
            .insert({
              operators,
              number_range: numberSet,
              round,
              target,
              numbers,
              answer,
              result: "correct",
              time_taken_ms: time,
            });
          if (error) {
            console.log("Error saving result:", error);
          } else {
            console.log("Result saved:", data);
          }
        })();
        if (round === game.rounds) {
          gameChannelRef.current?.send({
            type: "broadcast",
            event: GAME_OVER_EVENT,
            payload: {},
          });
          return;
        }
        const { newNumbers, newTarget, newComplexity } = getNewRoundData();
        gameChannelRef.current?.send({
          type: "broadcast",
          event: NEW_ROUND_EVENT,
          payload: {
            newRound: round + 1,
            target: newTarget,
            numbers: newNumbers,
            complexity: newComplexity,
          },
        });
      } else {
        gameChannelRef.current?.send({
          type: "broadcast",
          event: WRONG_ANSWER_EVENT,
          payload: {
            submitterId,
            answer,
            value: result.valueOf(),
            error: undefined,
          },
        });
      }
    } catch (error) {
      gameChannelRef.current?.send({
        type: "broadcast",
        event: WRONG_ANSWER_EVENT,
        payload: {
          submitterId,
          answer,
          value: undefined,
          error: (error as Error).message,
        },
      });
    }
  }
  function handleChangeSkipStatusEvent(data: ChangeSkipStatusData) {
    const { playerId, wantsToSkip, skipStatusTime } = data;
    const changeSkipPlayer = playersRef.current.find((p) => p.id === playerId);
    if (skipStatusTime >= changeSkipPlayer?.skipStatusTime!) {
      const updatedPlayers = playersRef.current.map((p) => {
        return p.id === playerId ? { ...p, wantsToSkip, skipStatusTime } : p;
      });
      playersRef.current = updatedPlayers;
      setPlayers(updatedPlayers);
    }
  }
  async function handleSkipRoundEvent(data: SkipRoundData) {
    const { currentRound, target, numbers, complexity } = data;
    updateRound(currentRound, target, numbers, complexity);
    const skipStatusTime = Date.now();
    gameChannelRef.current?.send({
      type: "broadcast",
      event: CHANGE_SKIP_STATUS_EVENT,
      payload: {
        playerId: currentPlayerRef.current,
        wantsToSkip: false,
        skipStatusTime,
      },
    });
    await gameChannelRef.current?.track({
      wantsToSkip: false,
      skipStatusTime,
      playerId: currentPlayerRef.current,
      playerNickname: `Player-${currentPlayerRef.current.slice(0, 5)}`,
    });
  }
  async function handleNewRoundEvent(data: NewRoundData) {
    const { newRound, target, numbers, complexity } = data;
    updateRound(newRound, target, numbers, complexity);
    const skipStatusTime = Date.now();
    gameChannelRef.current?.send({
      type: "broadcast",
      event: CHANGE_SKIP_STATUS_EVENT,
      payload: {
        playerId: currentPlayerRef.current,
        wantsToSkip: false,
        skipStatusTime,
      },
    });
    await gameChannelRef.current?.track({
      wantsToSkip: false,
      skipStatusTime,
      playerId: currentPlayerRef.current,
      playerNickname: `Player-${currentPlayerRef.current.slice(0, 5)}`,
    });
  }
  function handleRightAnswerEvent(data: RightAnswerData) {
    const { submitterId, points } = data;
    playersRef.current = playersRef.current.map((player) =>
      player.id === submitterId
        ? {
            ...player,
            score: player.score + points,
          }
        : player
    );
    console.log(
      `Player ${submitterId} answered correctly and earned ${points} points!`
    );
    setPlayers(playersRef.current);
  }
  function handleWrongAnswerEvent(data: WrongAnswerData) {
    const { submitterId, answer, value, error } = data;
    if (submitterId !== currentPlayerRef.current) return;
    if (error) {
      console.log(`Error evaluating expression "${answer}":`, error);
      return;
    }
    console.log(
      `You submitted wrong answer "${answer}", evaluated to ${value}`
    );
  }
  function handleGameOverEvent() {
    console.log("Game over handled via event");
  }
  function handleSyncEvent(
    newState: RealtimePresenceState<RealtimePlayerState>
  ) {
    console.log(playersRef.current);
    updatePlayers(playersRef.current, newState);
    if (currentPlayerRef.current !== game.host_id) return;
    if (playersRef.current.some((p) => p.active && !p.wantsToSkip)) return;
    const { numbers, target, round } = gameStateRef.current;
    (async () => {
      const { data, error } = await supabase
        .from("num-match-test-history")
        .insert({
          operators,
          number_range: numberSet,
          round,
          target,
          numbers,
          result: "skipped",
          time_taken_ms: stopwatchRef.current?.getTime() ?? 0,
        });
      if (error) {
        console.log("Error saving result:", error);
      } else {
        console.log("Result saved:", data);
      }
    })();
    const { newNumbers, newTarget, newComplexity } = getNewRoundData();
    gameChannelRef.current?.send({
      type: "broadcast",
      event: SKIP_ROUND_EVENT,
      payload: {
        currentRound: round,
        target: newTarget,
        numbers: newNumbers,
        complexity: newComplexity,
      },
    });
  }

  function updatePlayers(
    currentPlayers: PlayerData[],
    newStatus: RealtimePresenceState<RealtimePlayerState>
  ) {
    let nextPlayers = [...currentPlayers];
    Object.keys(newStatus).forEach((key) => {
      const presences = newStatus[key];
      const latestPresence = presences.reduce((latest, presence) =>
        presence.skipStatusTime > latest.skipStatusTime ? presence : latest
      );
      const currentPresence = nextPlayers.find((player) => player.id === key);
      if (currentPresence) {
        console.log(
          "Updating existing player:",
          key,
          latestPresence,
          currentPresence
        );
        if (latestPresence.skipStatusTime >= currentPresence.skipStatusTime) {
          console.log("Updating skip status for player:", key);
          nextPlayers = nextPlayers.map((player) => {
            return player.id === key
              ? {
                  ...player,
                  active: true,
                  wantsToSkip: !!latestPresence.wantsToSkip,
                  skipStatusTime: latestPresence.skipStatusTime,
                }
              : player;
          });
        }
      } else {
        const newPlayerData: PlayerData = {
          id: key,
          nickname: latestPresence.playerNickname,
          wantsToSkip: !!latestPresence.wantsToSkip,
          skipStatusTime: latestPresence.skipStatusTime,
          active: true,
          score: 0,
        };
        nextPlayers.push(newPlayerData);
      }
    });
    for (const player of nextPlayers) {
      if (!newStatus[player.id]) {
        player.active = false;
      }
    }
    playersRef.current = nextPlayers;
    setPlayers(nextPlayers);
  }
  function updateRound(
    round: number,
    target: number,
    numbers: number[],
    complexity: number
  ) {
    setRound(round);
    setTarget(target);
    setNumbers(numbers);
    setPoints(calculatePoints(complexity));
    setAnswer("");
    setWantsToSkip(false);
    gameStateRef.current = { numbers, target, round, complexity };
    if (stopwatchRef.current) {
      const time = stopwatchRef.current.getTime();
      stopwatchRef.current.reset();
      stopwatchRef.current.start();
      console.log("Stopwatch reset and started at time:", time);
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  function submitAnswer() {
    const currentTime = stopwatchRef.current?.getTime() ?? 0;
    gameChannelRef.current?.send({
      type: "broadcast",
      event: ANSWER_SUBMIT_EVENT,
      payload: {
        submitterId: currentPlayerRef.current,
        answer,
        time: currentTime,
      },
    });
  }
  async function changeSkipStatus(status: boolean) {
    setWantsToSkip(status);
    const skipStatusTime = Date.now();
    gameChannelRef.current?.send({
      type: "broadcast",
      event: CHANGE_SKIP_STATUS_EVENT,
      payload: {
        playerId: currentPlayerRef.current,
        wantsToSkip: status,
        skipStatusTime,
      },
    });
    await gameChannelRef.current?.track({
      wantsToSkip: status,
      skipStatusTime,
      playerId: currentPlayerRef.current,
      playerNickname: `Player-${currentPlayerRef.current.slice(0, 5)}`,
    });
  }
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submitAnswer();
    } else if (e.key === "Tab") {
      e.preventDefault();
      changeSkipStatus(!wantsToSkip);
    }
  }
  return (
    <div className="flex flex-col items-center gap-6 min-[900px]:flex-row min-[900px]:justify-center min-[900px]:items-start">
      <div className="flex flex-col gap-6 justify-center items-center w-full max-w-[32rem] min-[900px]:max-w-[24rem]">
        <div className="flex justify-between items-center gap-2 w-full h-[54px]">
          <div className="flex grow text-2xl sm:text-3xl">Lobby</div>
          <Button className="bg-background-light border-1 border-border hover:bg-background-light hover:opacity-90 hover:cursor-pointer active:opacity-80">
            Copy Link
          </Button>
        </div>
        <div
          className={`bg-background-light flex flex-col justify-center w-full dark:border-border-muted dark:border-2 shadow dark:shadow-none rounded-md font-normal px-2 py-1`}
        >
          <div className="text-lg">{game.rounds} Rounds</div>
          <div className="text-lg">Operators: {operators.join(", ")}</div>
        </div>
        <div className="flex w-full justify-start gap-2">
          {game.host_id === currentPlayerRef.current ? (
            <>
              <Button className="bg-background-reverse text-text-reverse hover:bg-background-reverse hover:opacity-90 hover:cursor-pointer active:opacity-80">
                Start Game
              </Button>
              <Button className="bg-danger text-text-reverse dark:text-text hover:bg-danger hover:opacity-90 hover:cursor-pointer active:opacity-80">
                Cancel Game
              </Button>
            </>
          ) : (
            <Button className="bg-background-reverse text-text-reverse hover:bg-background-reverse hover:opacity-90 hover:cursor-pointer active:opacity-80">
              Join Game
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col min-[900px]:ml-12 gap-6 w-full min-[900px]:w-sm max-w-[32rem]">
        <h2 className="flex text-2xl sm:text-3xl h-[54px] items-center">
          Players ({players.length}/{game.max_players})
        </h2>
        <div className="flex flex-col gap-6">
          {players.map((user) => (
            <div key={user.id} className="flex w-full rounded-2xl items-center">
              <div>
                {user.avatarUrl ? (
                  <img
                    className="rounded-full w-14 aspect-square"
                    src={user.avatarUrl}
                    alt={user.nickname}
                  />
                ) : (
                  <div className="flex items-center justify-center rounded-full w-14 aspect-square text-3xl bg-gray-300 dark:bg-gray-600">
                    {user.nickname.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center px-4 flex-grow">
                <div className="text-lg font-medium">
                  {user.nickname}
                  {user.active ? "" : " (Disconnected)"}
                </div>
                {user.wantsToSkip ? (
                  <div className="text-sm text-green-700 dark:text-green-500">
                    Wants to skip
                  </div>
                ) : null}
              </div>
              <div className="flex items-center font-semibold text-xl">
                {user.score} Points
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  /*
  return (
    <div className="flex flex-col items-center gap-6 xl:flex-row xl:justify-center xl:items-start">
      <div className="flex flex-col gap-6 justify-center items-center w-full max-w-[50rem]">
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
              +{points} Points
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
        <div className="flex w-full justify-start gap-2">
          <Button
            onClick={submitAnswer}
            className="bg-background-reverse text-text-reverse hover:bg-background-reverse hover:opacity-90 hover:cursor-pointer active:opacity-80"
          >
            Submit Answer
          </Button>
          <Button
            onClick={() => changeSkipStatus(!wantsToSkip)}
            className="bg-background-light border-1 border-border hover:bg-background-light hover:opacity-90 hover:cursor-pointer active:opacity-80"
          >
            {wantsToSkip ? "Cancel Skip" : "Request Skip"}
          </Button>
        </div>
      </div>
      <div className="flex flex-col xl:ml-12 gap-6 w-full xl:w-sm max-w-[50rem]">
        <h2 className="flex text-2xl sm:text-3xl h-[54px] items-center">
          Players ({players.length}/{game.max_players})
        </h2>
        <div className="flex flex-col gap-6">
          {players.map((user) => (
            <div key={user.id} className="flex w-full rounded-2xl items-center">
              <div>
                {user.avatarUrl ? (
                  <img
                  className="rounded-full w-14 aspect-square"
                  src={user.avatarUrl}
                  alt={user.nickname}
                  />
                ) : (
                  <div className="flex items-center justify-center rounded-full w-14 aspect-square text-3xl bg-gray-300 dark:bg-gray-600">
                    {user.nickname.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center px-4 flex-grow">
                <div className="text-lg font-medium">
                  {user.nickname}
                  {user.active ? "" : " (Disconnected)"}
                </div>
                {user.wantsToSkip ? (
                  <div className="text-sm text-green-700 dark:text-green-500">
                    Wants to skip
                  </div>
                ) : null}
              </div>
              <div className="flex items-center font-semibold text-xl">
                {user.score} Points
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  */
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

function calculatePoints(complexity: number) {
  if (complexity === 1) return 5;
  if (complexity === 2) return 10;
  if (complexity === 3) return 20;
  return 0;
}
