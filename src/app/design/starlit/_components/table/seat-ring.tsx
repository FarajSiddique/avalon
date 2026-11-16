import type { CSSProperties, ReactNode } from "react";
import type { PlayerId, SeatView } from "@/shared/views";
import { Campfire } from "../art/campfire";
import {
  IconApprove,
  IconCheck,
  IconCrown,
  IconReject,
  IconRing,
  IconStar,
} from "../icons";
import { initialOf } from "../names";
import { seatLayout, seatsPerRow, type SeatPoint } from "./seat-layout";

export type SeatStatus =
  "chosen" | "voted" | "waiting" | "approve" | "reject" | "played" | "choosing";

const STATUS: Record<
  SeatStatus,
  { label: string; tone: string; icon: (props: { size?: number }) => ReactNode }
> = {
  chosen: { label: "Chosen", tone: "text-accent", icon: IconStar },
  voted: { label: "Voted", tone: "text-ink", icon: IconCheck },
  waiting: { label: "Waiting", tone: "text-ink-muted", icon: IconRing },
  approve: { label: "Approve", tone: "text-success", icon: IconApprove },
  reject: { label: "Reject", tone: "text-fail", icon: IconReject },
  played: { label: "Played", tone: "text-ink", icon: IconCheck },
  choosing: { label: "Choosing", tone: "text-ink-muted", icon: IconRing },
};

function points(
  layout: readonly SeatPoint[],
  mode: "mobile" | "desktop",
  indexes: readonly number[],
): string {
  return indexes
    .map((index) => {
      const point = layout[index];
      if (!point) return "";
      return mode === "mobile"
        ? `${point.mx},${point.my}`
        : `${point.dx},${point.dy}`;
    })
    .join(" ");
}

function Lines({
  layout,
  mode,
  litIndexes,
}: {
  layout: readonly SeatPoint[];
  mode: "mobile" | "desktop";
  litIndexes: readonly number[];
}) {
  const all = layout.map((_, index) => index);
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`sl-ring__lines sl-ring__lines--${mode}`}
      aria-hidden="true"
      focusable="false"
    >
      <polygon className="sl-ring__line" points={points(layout, mode, all)} />
      {/* The team is its own small constellation inside the ring. */}
      {litIndexes.length === 2 && (
        <polyline
          className="sl-ring__line sl-ring__line--team"
          points={points(layout, mode, litIndexes)}
        />
      )}
      {litIndexes.length > 2 && (
        <polygon
          className="sl-ring__line sl-ring__line--team"
          points={points(layout, mode, litIndexes)}
        />
      )}
    </svg>
  );
}

/**
 * Every seat as a star, joined into a ring by fine lines. A lit star is on
 * the team, a crown marks the leader, and one short status sits under each
 * name. Pass `onToggle` to make the stars buttons (the leader picking a team).
 */
export function SeatRing({
  players,
  youId,
  leaderId,
  litIds,
  status = {},
  onToggle,
  label,
}: {
  players: readonly SeatView[];
  youId: PlayerId;
  leaderId: PlayerId;
  litIds: readonly PlayerId[];
  status?: Readonly<Record<PlayerId, SeatStatus | undefined>>;
  onToggle?: (id: PlayerId) => void;
  label: string;
}) {
  const layout = seatLayout(players.length);
  const litIndexes = players.flatMap((player, index) =>
    litIds.includes(player.id) ? [index] : [],
  );

  return (
    <div
      className="sl-ring"
      style={{ "--per-row": seatsPerRow(players.length) } as CSSProperties}
    >
      <Lines layout={layout} mode="mobile" litIndexes={litIndexes} />
      <Lines layout={layout} mode="desktop" litIndexes={litIndexes} />
      <Campfire className="sl-ring__fire" />
      <ul aria-label={label}>
        {players.map((player, index) => {
          const point = layout[index];
          if (!point) return null;
          const lit = litIds.includes(player.id);
          const isLeader = player.id === leaderId;
          const tags = [
            player.id === youId ? "You" : null,
            isLeader ? "Leader" : null,
          ].filter((tag) => tag !== null);
          const seatStatus = status[player.id];
          const state = seatStatus ? STATUS[seatStatus] : null;

          const body = (
            <>
              <span className="sl-seat__star">
                {isLeader && <IconCrown size={22} className="sl-seat__crown" />}
                <span className="sl-seat__disc" aria-hidden="true">
                  {initialOf(player.name)}
                </span>
              </span>
              <span className="sl-seat__text">
                <span className="sl-seat__name">{player.name}</span>
                {tags.length > 0 && (
                  <span className="sl-seat__tags">{tags.join(" · ")}</span>
                )}
                {state ? (
                  <span className={`sl-seat__status ${state.tone}`}>
                    <state.icon size={14} />
                    {state.label}
                  </span>
                ) : (
                  lit && <span className="sr-only">On the team</span>
                )}
              </span>
            </>
          );

          return (
            <li
              key={player.id}
              className="sl-seat"
              data-lit={lit}
              data-side={point.side}
              style={
                {
                  "--mx": `${point.mx}%`,
                  "--my": `${point.my}%`,
                  "--dx": `${point.dx}%`,
                  "--dy": `${point.dy}%`,
                } as CSSProperties
              }
            >
              {onToggle ? (
                <button
                  type="button"
                  className="sl-seat__body"
                  aria-pressed={lit}
                  onClick={() => onToggle(player.id)}
                >
                  {body}
                </button>
              ) : (
                <div className="sl-seat__body">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
