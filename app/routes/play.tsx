import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import {
  type GameConfig,
  type GameBrief,
  type OperatorSymbol,
  matchDefaultOperators,
} from "~/utils/games";
import type { Route } from "./+types/play";
import supabase from "~/lib/supabase/client";
import { cn } from "~/lib/utils";
import { useUser } from "~/layouts/header";

export default function Play({ loaderData }: Route.ComponentProps) {
  const [gameList, setGameList] = useState<GameBrief[]>([]);
  const { user } = useUser();
  if (!user)
    return (
      <button className="bg-background border-2 border-border">
        <Link to="/create-game">Create Anonymous Game</Link>
      </button>
    );
  const sortedGames = useMemo(
    () =>
      [...gameList].sort((game1, game2) => {
        const status1 = computeInvitationStatus(game1, user.id).index;
        const status2 = computeInvitationStatus(game2, user.id).index;
        return status1 - status2;
      }),
    [gameList]
  );
  const fetchGames = async () => {
    const dummyGames: GameConfig[] = [
      {
        hostId: "cc7be87c-d52d-4f49-9aba-bcb15c7084a8",
        rounds: 5,
        maxPlayers: 4,
        numberSet: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        operators: ["+", "-", "*", "/"],
      },
      {
        hostId: "cc7be87c-d52d-4f49-9aba-bcb15c7084a8",
        rounds: 3,
        maxPlayers: 2,
        numberSet: [10, 20, 30, 40, 50],
        operators: ["+", "-", "*"],
        invitations: [
          "friend1",
          "friend2",
          "ebf27319-620c-4f51-bc8b-cc497a791d0b",
        ],
      },
      {
        hostId: "ebf27319-620c-4f51-bc8b-cc497a791d0b",
        rounds: 4,
        maxPlayers: 3,
        numberSet: [5, 10, 15, 20, 25],
        operators: ["+", "-", "/"],
        invitations: ["friend3", "friend4"],
      },
    ];
    const dummyBriefs = await Promise.all(
      dummyGames.map(async (game) => {
        const { data, error } = await supabase
          .from("users")
          .select("nickname")
          .eq("id", game.hostId)
          .single();
        const hostNickname = data?.nickname;
        return {
          ...game,
          hostNickname,
        } as GameBrief;
      })
    );
    setGameList(dummyBriefs);
  };
  useEffect(() => {
    fetchGames();
  }, []);
  return (
    <div>
      <ul>
        {sortedGames.map((game, index) => {
          const invitationStatus = computeInvitationStatus(
            game,
            user.id
          ).status;
          return (
            <li key={index}>
              <GameBrief
                game={game}
                invitationStatus={invitationStatus}
                hostNickname={game.hostNickname}
                gameUrl="/game/1"
              />
            </li>
          );
        })}
      </ul>
      <Button>Create Game</Button>
    </div>
  );
}
function GameBrief({
  game,
  invitationStatus,
  hostNickname,
  gameUrl,
}: Readonly<{
  game: GameConfig;
  invitationStatus: "invited" | "open" | "host";
  hostNickname: string;
  gameUrl: string;
}>) {
  return (
    <Link
      to={gameUrl}
      className={cn(
        `flex p-4 mb-4 rounded shadow`,
        invitationStatus === "invited"
          ? "bg-yellow-100"
          : invitationStatus === "host"
            ? "bg-green-100"
            : "bg-white"
      )}
    >
      <div>Host: {hostNickname}</div>
      <div>Rounds: {game.rounds}</div>
      <div>Max Players: {game.maxPlayers}</div>
      <div>Number Set: {game.numberSet.join(", ")}</div>
      <div>Operators: {showOperatorsConfig(game.operators)}</div>
    </Link>
  );
}

function showOperatorsConfig(operators: OperatorSymbol[]) {
  const matchLevel = matchDefaultOperators(operators);
  if (matchLevel === 1) return "Basic";
  if (matchLevel === 2) return "Extended";
  if (matchLevel === 3) return "All";
  return operators.join(", ");
}

function computeInvitationStatus(
  game: GameConfig,
  userId: string
): { status: "invited" | "open" | "host"; index: number } {
  if (game.hostId === userId) {
    return { status: "host", index: 0 };
  } else if (game.invitations?.includes(userId)) {
    return { status: "invited", index: 1 };
  } else {
    return { status: "open", index: 2 };
  }
}
