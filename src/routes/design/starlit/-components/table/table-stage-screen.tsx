import { useMemo, useRef } from "react";
import type { TableStep } from "@/design/directions";
import { tableViews } from "@/design/mock";
import { useGamePlayers, useGameView } from "../stage/game-players";
import {
  useStagePlay,
  useStagePlayers,
  useStageSlot,
} from "../stage/stage-context";
import { StageTags } from "../stage/stage-tags";
import type { TablePlay } from "../three/types";

/**
 * CONTRACT STUB (the table UI task builds it out): one step of the round
 * over the 3D table.
 */
export function TableStageScreen({ step }: { step: TableStep }) {
  const view = useGameView(tableViews[step]);
  const focus = useRef<HTMLDivElement>(null);
  useStageSlot({ mode: "table", reveal: "whole", fade: 0 }, focus);
  const players = useGamePlayers(view);
  useStagePlayers(players);
  const play = useMemo<TablePlay>(
    () => ({
      shot: step === "quest" ? "team" : step === "result" ? "cards" : "table",
      leaderId: view.leaderId,
      teamIds: [],
      cards: null,
      cardsShown: 0,
    }),
    [step, view.leaderId],
  );
  useStagePlay(play);
  return (
    <main className="relative z-10 flex h-[calc(100dvh-2.75rem)] flex-col overflow-hidden">
      <StageTags players={players} />
      <div ref={focus} data-stage-slot="table" className="absolute inset-0" />
      <h1 className="font-display relative p-4 text-3xl">Table: {step}</h1>
    </main>
  );
}
