import { useEffect, useState } from "react";
import { Form } from "react-router";
import { Input } from "~/components/ui/input";
import {
  ALL_OPERATOR_SYMBOLS,
  BASIC_OPERATOR_SYMBOLS,
  getAnonymousPlayerId,
  type OperatorSymbol,
} from "~/utils/games";

export default function CreateGame() {
  const [hostName, setHostName] = useState("");
  const [rounds, setRounds] = useState(20);
  const [operators, setOperators] = useState<OperatorSymbol[]>(
    BASIC_OPERATOR_SYMBOLS
  );
  const [maxPlayers, setMaxPlayers] = useState(5);

  useEffect(() => {
    const playerId = getAnonymousPlayerId();
    console.log("Anonymous Player ID:", playerId);
  }, []);
  return (
    <>
      <div className="font-bold text-2xl">Create Game</div>
      <Form>
        <label>
          Host Nickname:
          <Input
            type="text"
            name="hostName"
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
            name="maxPlayers"
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
