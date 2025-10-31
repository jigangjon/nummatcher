import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import type { GameConfig } from "~/types/games";

export default function Play() {
  const [gameList, setGameList] = useState<GameConfig[]>([]);
  const { user } = useOutletContext();
  const dummyGames: GameConfig[] = [
    {
      hostId: "user1",
      rounds: 5,
      maxPlayers: 4,
      numberSet: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      operators: ["+", "-", "*", "/"],
    },
    {
      hostId: "user2",
      rounds: 3,
      maxPlayers: 2,
      numberSet: [10, 20, 30, 40, 50],
      operators: ["+", "-", "*"],
      invitations: ["friend1", "friend2", user.id],
    },
    {
      hostId: user.id,
      rounds: 4,
      maxPlayers: 3,
      numberSet: [5, 10, 15, 20, 25],
      operators: ["+", "-", "/"],
      invitations: ["friend3", "friend4"],
    },
  ];
  useEffect(() => {
    dummyGames.sort((game1, game2) => {
      const status1 = computeInvitationStatus(game1, user.id).index;
      const status2 = computeInvitationStatus(game2, user.id).index;
      return status1 - status2;
    });
    setGameList(dummyGames);
  }, []);
  return (
    <div>
      Play Page
      <ul>
        {gameList.map((game) => {
          const invitationStatus = computeInvitationStatus(
            game,
            user.id
          ).status;
          return (
            <li key={game.hostId}>
              <GameBrief game={game} invitationStatus={invitationStatus} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GameBrief({
  game,
  invitationStatus,
}: {
  game: GameConfig;
  invitationStatus: "invited" | "open" | "host";
}) {
  return (
    <div
      className={`flex ${invitationStatus === "invited" ? "bg-yellow-100" : invitationStatus === "host" ? "bg-green-100" : "bg-white"} p-4 mb-4 rounded shadow`}
    >
      <div>Host: {game.hostId}</div>
      <div>Rounds: {game.rounds}</div>
      <div>Max Players: {game.maxPlayers}</div>
      <div>Number Set: {game.numberSet.join(", ")}</div>
      <div>Operators: {game.operators.join(", ")}</div>
    </div>
  );
}

function computeInvitationStatus(
  game: GameConfig,
  userId: string
): { status: "invited" | "open" | "host"; index: number } {
  if (game.hostId === userId) {
    return { status: "host", index: 0 };
  } else if (game.invitations && game.invitations.includes(userId)) {
    return { status: "invited", index: 1 };
  } else {
    return { status: "open", index: 2 };
  }
}
