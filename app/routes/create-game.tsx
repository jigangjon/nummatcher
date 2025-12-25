import { useEffect, useState } from "react";
import { Form, redirect } from "react-router";
import { Input } from "~/components/ui/input";
import {
  ALL_OPERATOR_SYMBOLS,
  BASIC_OPERATOR_SYMBOLS,
  getAnonymousPlayerId,
  type OperatorSymbol,
} from "~/utils/games";
import type { Route } from "./+types/create-game";
import { createClient } from "~/lib/supabase/server";

export default function CreateGame() {
  const [hostId, setHostId] = useState("");
  const [hostName, setHostName] = useState("");
  const [rounds, setRounds] = useState(20);
  const [operators, setOperators] = useState<OperatorSymbol[]>(
    BASIC_OPERATOR_SYMBOLS
  );
  const [maxPlayers, setMaxPlayers] = useState(5);

  useEffect(() => {
    const playerId = getAnonymousPlayerId();
    setHostId(playerId);
  }, []);
  return (
    <>
      <div className="font-bold text-2xl">Create Game</div>
      <Form method="POST">
        <input type="text" name="host-id" value={hostId} readOnly hidden />
        <label>
          Host Nickname:
          <Input
            type="text"
            name="host-name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
          />
        </label>
        <br />
        <label>
          Rounds:
          <Input
            type="number"
            name="rounds"
            value={rounds}
            onChange={(e) => setRounds(parseInt(e.target.value, 10))}
          />
        </label>
        <br />
        <label>
          Max Players:
          <Input
            type="number"
            name="max-players"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))}
          />
        </label>
        <br />
        <fieldset>
          <legend>Operators (not customizable yet):</legend>
          <div className="flex gap-2">
            {BASIC_OPERATOR_SYMBOLS.map((op, index) => (
              <label key={op}>
                <input
                  type="checkbox"
                  name="operators"
                  value={op}
                  checked={operators.includes(op as OperatorSymbol)}
                  disabled
                  onChange={(e) => {
                    const value = e.target.value as OperatorSymbol;
                    setOperators((prev) =>
                      e.target.checked
                        ? [...prev, value]
                        : prev.filter((o) => o !== value)
                    );
                  }}
                />
                {op}
              </label>
            ))}
          </div>
        </fieldset>
        <br />
        <button
          type="submit"
          className="bg-background-light border-2 border-border py-2 px-4 rounded-full hover:cursor-pointer hover:opacity-80"
        >
          Create Game!
        </button>
      </Form>
    </>
  );
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const hostId = String(formData.get("host-id"));

  const { supabase, headers } = createClient(request);
  const { data, error: gameError } = await supabase
    .from("anonymous-games")
    .insert({
      status: "lobby",
      rounds: Number(formData.get("rounds")),
      host_id: hostId,
      max_players: Number(formData.get("max-players")),
    })
    .select()
    .single();
  if (gameError) {
    console.log("Error creating game:", gameError);
    return;
  }
  const { error: playerError } = await supabase
    .from("anonymous-game-players")
    .insert({
      game_id: data.id,
      player_id: hostId,
      nickname: String(formData.get("host-name")) || undefined,
      score: 0,
    });
  if (playerError) {
    console.log("Error creating host player:", playerError);
    return;
  }
  return redirect(`/game/${data.id}`, { headers });
}
