import { useMemo } from "react";
import { avatarFor } from "@/shared/avatar";
import { PLAYER_IDS } from "@/design/mock";
import { useAvatar } from "@/client/use-avatar";
import { useYourName } from "@/design/your-name";
import type { GameView } from "@/shared/views";
import type { TablePlayer } from "@/components/three/types";

/**
 * The prototype's game is always the fixed seven. You take Wren's seat
 * under the name you typed (if any). Every screen, 3D or flat, reads the
 * view through this so the name is the same everywhere.
 */
function withYourName(view: GameView, name: string | null): GameView {
  if (!name || view.you.id !== PLAYER_IDS.wren) {
    return view;
  }

  return {
    ...view,
    players: view.players.map((p) =>
      p.id === view.you.id ? { ...p, name } : p,
    ),
  };
}

/** `withYourName` with the stored name, memoised. */
export function useGameView(view: GameView): GameView {
  const name = useYourName();

  return useMemo(() => withYourName(view, name), [view, name]);
}

/** The seven at the table, as the stage draws them, with your look. */
export function useGamePlayers(view: GameView): Array<TablePlayer> {
  const yours = useAvatar();

  return useMemo(
    () =>
      view.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.id === view.you.id ? yours : avatarFor(p.id),
        isHost: p.isHost,
        isYou: p.id === view.you.id,
        connected: p.connected,
        // Once the game is on, nobody is "not ready".
        ready: true,
      })),
    [view.players, view.you.id, yours],
  );
}
