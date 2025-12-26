import { useEffect, useState } from "react";
import { Form, redirect, useNavigation } from "react-router";
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

  const navigation = useNavigation();

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
          className="flex bg-background-light border-2 border-border py-2 px-3 rounded-full hover:cursor-pointer hover:opacity-80"
        >
          {navigation.state === "submitting" ? (
            <>
              <svg
                className="w-5 mr-1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 200 200"
              >
                <radialGradient
                  id="a12"
                  cx=".66"
                  fx=".66"
                  cy=".3125"
                  fy=".3125"
                  gradientTransform="scale(1.5)"
                >
                  <stop offset="0" stop-color="#000000"></stop>
                  <stop
                    offset=".3"
                    stop-color="#000000"
                    stop-opacity=".9"
                  ></stop>
                  <stop
                    offset=".6"
                    stop-color="#000000"
                    stop-opacity=".6"
                  ></stop>
                  <stop
                    offset=".8"
                    stop-color="#000000"
                    stop-opacity=".3"
                  ></stop>
                  <stop offset="1" stop-color="#000000" stop-opacity="0"></stop>
                </radialGradient>
                <circle
                  transform-origin="center"
                  fill="none"
                  stroke="url(#a12)"
                  stroke-width="15"
                  stroke-linecap="round"
                  stroke-dasharray="200 1000"
                  stroke-dashoffset="0"
                  cx="100"
                  cy="100"
                  r="70"
                >
                  <animateTransform
                    type="rotate"
                    attributeName="transform"
                    calcMode="spline"
                    dur="2"
                    values="360;0"
                    keyTimes="0;1"
                    keySplines="0 0 1 1"
                    repeatCount="indefinite"
                  ></animateTransform>
                </circle>
                <circle
                  transform-origin="center"
                  fill="none"
                  opacity=".2"
                  stroke="#000000"
                  stroke-width="15"
                  stroke-linecap="round"
                  cx="100"
                  cy="100"
                  r="70"
                ></circle>
              </svg>
              Creating...
            </>
          ) : (
            "Create Game!"
          )}
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
