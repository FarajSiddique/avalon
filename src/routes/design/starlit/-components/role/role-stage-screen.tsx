import { useMemo, useRef } from "react";
import type { RoleVariant } from "@/design/directions";
import { roleViews } from "@/design/mock";
import { useGamePlayers, useGameView } from "../stage/game-players";
import {
  useStagePlay,
  useStagePlayers,
  useStageSlot,
} from "../stage/stage-context";
import { StageTags } from "../stage/stage-tags";
import type { TablePlay } from "../three/types";

/**
 * CONTRACT STUB (the role task builds it out): the role card over the 3D
 * table, the camera low behind your seat.
 */
export function RoleStageScreen({ variant }: { variant: RoleVariant }) {
  const view = useGameView(roleViews[variant]);
  const focus = useRef<HTMLDivElement>(null);
  useStageSlot({ mode: "role", reveal: "whole", fade: 0 }, focus);
  const players = useGamePlayers(view);
  useStagePlayers(players);
  const play = useMemo<TablePlay>(
    () => ({
      shot: "role",
      leaderId: null,
      teamIds: [],
      cards: null,
      cardsShown: 0,
    }),
    [],
  );
  useStagePlay(play);
  return (
    <main className="relative z-10 flex h-[calc(100dvh-2.75rem)] flex-col overflow-hidden">
      <StageTags players={players} />
      <div ref={focus} data-stage-slot="role" className="absolute inset-0" />
      <h1 className="font-display relative p-4 text-3xl">Your role</h1>
    </main>
  );
}
