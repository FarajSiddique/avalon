import type { CSSProperties } from "react";
import type { GameView, PlayerId } from "@/shared/views";
import { PixelIcon } from "../pixel/pixel-sprite";
import { CampGround } from "./camp-ground";
import { Seat, type SeatStatus } from "./seat";

/** Seat positions around the fire, clockwise, with "you" nearest the viewer. */
function ringPosition(index: number, count: number): CSSProperties {
  const angle = Math.PI / 2 + (index / count) * Math.PI * 2;
  return {
    "--seat-x": `${(50 + 40 * Math.cos(angle)).toFixed(2)}%`,
    "--seat-y": `${(50 + 36 * Math.sin(angle)).toFixed(2)}%`,
  } as CSSProperties;
}

/**
 * Every seat. A compact four-column grid on a phone; a ring around the
 * campfire on a wide, shared screen.
 */
export function SeatRing({
  view,
  teamIds,
  statusOf,
  onToggle,
}: {
  view: GameView;
  teamIds: readonly PlayerId[];
  statusOf: (id: PlayerId) => SeatStatus;
  /** Present only while you are the leader choosing a team. */
  onToggle?: (id: PlayerId) => void;
}) {
  const count = view.players.length;
  return (
    <section aria-label="Seats" className="relative flex flex-col gap-2">
      <div className="relative lg:h-[468px]">
        <CampGround className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block" />
        <ul className="grid grid-cols-4 gap-x-[calc(var(--px)*4)] gap-y-[calc(var(--px)*6)] pt-[calc(var(--px)*3)] lg:block lg:pt-0">
          {view.players.map((player, index) => (
            <li
              key={player.id}
              style={ringPosition(index, count)}
              className="lg:absolute lg:top-[var(--seat-y)] lg:left-[var(--seat-x)] lg:w-[124px] lg:-translate-x-1/2 lg:-translate-y-1/2"
            >
              <Seat
                player={player}
                seatIndex={index}
                isYou={player.id === view.you.id}
                isLeader={player.id === view.leaderId}
                onTeam={teamIds.includes(player.id)}
                status={statusOf(player.id)}
                onToggle={onToggle ? () => onToggle(player.id) : undefined}
              />
            </li>
          ))}
        </ul>
      </div>
      <p
        aria-hidden
        className="lv-small text-ink-muted flex flex-wrap items-center justify-center gap-x-5 gap-y-1 lg:absolute lg:top-0 lg:left-0 lg:flex-col lg:items-start lg:gap-y-2"
      >
        <span className="flex items-center gap-2">
          <PixelIcon name="crown" className="text-accent-strong" />
          Leader
        </span>
        <span className="flex items-center gap-2">
          <PixelIcon name="sword" className="text-accent" />
          On the team
        </span>
      </p>
    </section>
  );
}
