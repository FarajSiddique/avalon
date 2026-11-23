import type { TableStep } from "@/design/directions";
import { tableViews } from "@/design/mock";
import { useGamePlayers, useGameView } from "../stage/game-players";
import { useStagePlayers } from "@/components/stage/stage-context";
import { TableStageStep } from "./table-stage-steps";

/**
 * One step of the round over the 3D Star Table, seen by Wren (under the
 * name you typed in the lobby). The step owns its own state (the draft,
 * your vote, your card, the result's clock) and the shell lays it out.
 */
export function TableStageScreen({ step }: { step: TableStep }) {
  const view = useGameView(tableViews[step]);
  const players = useGamePlayers(view);

  useStagePlayers(players);

  return <TableStageStep step={step} view={view} players={players} />;
}
