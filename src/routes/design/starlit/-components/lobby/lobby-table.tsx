import { useMemo } from "react";
import { avatarFor } from "@/design/avatar";
import { useAvatar } from "@/design/use-avatar";
import type { LobbyView } from "@/shared/views";
import { Campfire } from "../art/campfire";
import { Hero3D } from "../three/hero-3d";
import type { TablePlayer } from "../three/types";

/**
 * The Star Table in the lobby: everyone who has joined stands at a seat, in
 * their own look, with a name tag. Decorative: the player list beside it
 * says the same in words. Without WebGL, the drawn campfire stands in.
 */
export function LobbyTable({ view }: { view: LobbyView }) {
  const yours = useAvatar();
  const players = useMemo<TablePlayer[]>(
    () =>
      view.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.id === view.you.id ? yours : avatarFor(p.id),
        isHost: p.isHost,
        isYou: p.id === view.you.id,
        connected: p.connected,
        ready: p.ready,
      })),
    [view.players, view.you.id, yours],
  );
  return (
    <section
      aria-label="The table"
      className="sl-panel relative overflow-hidden p-0"
    >
      <Hero3D
        concept="table"
        backdrop={false}
        players={players}
        className="block h-[19rem] w-full lg:h-[27rem]"
        fallback={
          <div className="flex h-[19rem] items-end justify-center lg:h-[27rem]">
            <Campfire className="w-[14rem]" />
          </div>
        }
      />
    </section>
  );
}
