import type { CSSProperties, ReactNode } from "react";
import type { PlayerId, SeatView } from "@/shared/views";
import { Campfire } from "../art/campfire";
import {
  IconApprove,
  IconCheck,
  IconCrown,
  IconMoon,
  IconReject,
  IconRing,
  IconStar,
} from "../icons";
import { initialOf } from "../names";
import { seatLayout, seatsPerRow, type SeatPoint } from "./seat-layout";

export type SeatStatus =
  | "chosen"
  | "voted"
  | "waiting"
  | "approve"
  | "reject"
  | "played"
  | "choosing"
  | "away";

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
  away: { label: "Away", tone: "text-ink-muted", icon: IconMoon },
};

type Mode = "mobile" | "desktop";

function at(point: SeatPoint, mode: Mode): readonly [number, number] {
  return mode === "mobile" ? [point.mx, point.my] : [point.dx, point.dy];
}

function points(
  layout: readonly SeatPoint[],
  mode: Mode,
  indexes: readonly number[],
): string {
  return indexes
    .map((index) => {
      const point = layout[index];
      return point ? at(point, mode).join(",") : "";
    })
    .join(" ");
}

/**
 * The team's own constellation, one line per pair of neighbouring stars.
 * Each line is keyed by its two seats, so when a seat is picked only the new
 * lines mount, and each grows out of the star that was already lit.
 */
function teamSegments(
  litIndexes: readonly number[],
  pickOrder: readonly number[],
): { key: string; from: number; to: number }[] {
  if (litIndexes.length < 2) return [];
  const pairs: [number, number][] = [];
  for (let i = 0; i < litIndexes.length - 1; i += 1) {
    pairs.push([litIndexes[i] ?? 0, litIndexes[i + 1] ?? 0]);
  }
  if (litIndexes.length > 2) {
    pairs.push([litIndexes.at(-1) ?? 0, litIndexes[0] ?? 0]);
  }
  return pairs.map(([a, b]) => {
    const aFirst = pickOrder.indexOf(a) <= pickOrder.indexOf(b);
    return {
      key: `${Math.min(a, b)}-${Math.max(a, b)}`,
      from: aFirst ? a : b,
      to: aFirst ? b : a,
    };
  });
}

function Lines({
  layout,
  mode,
  litIndexes,
  pickOrder,
}: {
  layout: readonly SeatPoint[];
  mode: Mode;
  litIndexes: readonly number[];
  pickOrder: readonly number[];
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
      {teamSegments(litIndexes, pickOrder).map(({ key, from, to }) => {
        const a = layout[from];
        const b = layout[to];
        if (!a || !b) return null;
        const [x1, y1] = at(a, mode);
        const [x2, y2] = at(b, mode);
        return (
          <line
            key={key}
            className="sl-ring__line sl-ring__line--team sl-seq"
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            style={{ transformOrigin: `${x1}% ${y1}%` }}
          />
        );
      })}
    </svg>
  );
}

/** Where the crown flies in from, as offsets in ring units (cqw / cqh). */
function crownOffset(
  layout: readonly SeatPoint[],
  fromIndex: number,
  toIndex: number,
): CSSProperties {
  const from = layout[fromIndex];
  const to = layout[toIndex];
  if (!from || !to) return {};
  return {
    "--from-mx": `${from.mx - to.mx}cqw`,
    "--from-my": `${from.my - to.my}cqh`,
    "--from-dx": `${from.dx - to.dx}cqw`,
    "--from-dy": `${from.dy - to.dy}cqh`,
  } as CSSProperties;
}

/**
 * Every seat as a star, joined into a ring by fine lines. A lit star is on
 * the team, a crown marks the leader, and one short status sits under each
 * name. Pass `onToggle` to make the stars buttons (the leader picking a team).
 *
 * Motion (all optional, all with a correct resting state):
 * - `crown`: "arrive" drops the crown onto the leader; a player id flies it
 *   in from that seat (the crown passing clockwise).
 * - `turnFrom`: every status starts as this one ("Voted") and turns over to
 *   its real value at the same moment (`--turn-at` on a parent).
 */
export function SeatRing({
  players,
  youId,
  leaderId,
  litIds,
  status = {},
  onToggle,
  label,
  crown,
  turnFrom,
}: {
  players: readonly SeatView[];
  youId: PlayerId;
  leaderId: PlayerId;
  litIds: readonly PlayerId[];
  status?: Readonly<Record<PlayerId, SeatStatus | undefined>>;
  onToggle?: (id: PlayerId) => void;
  label: string;
  crown?: "arrive" | PlayerId;
  turnFrom?: SeatStatus;
}) {
  const layout = seatLayout(players.length);
  const litIndexes = players.flatMap((player, index) =>
    litIds.includes(player.id) ? [index] : [],
  );
  const pickOrder = litIds.map((id) =>
    players.findIndex((player) => player.id === id),
  );
  const leaderIndex = players.findIndex((player) => player.id === leaderId);
  const crownFromIndex =
    crown && crown !== "arrive"
      ? players.findIndex((player) => player.id === crown)
      : -1;
  const crownMotion =
    crown === "arrive" ? "arrive" : crownFromIndex >= 0 ? "pass" : undefined;

  return (
    <div
      className="sl-ring"
      style={{ "--per-row": seatsPerRow(players.length) } as CSSProperties}
    >
      <Lines
        layout={layout}
        mode="mobile"
        litIndexes={litIndexes}
        pickOrder={pickOrder}
      />
      <Lines
        layout={layout}
        mode="desktop"
        litIndexes={litIndexes}
        pickOrder={pickOrder}
      />
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
          const seatStatus =
            status[player.id] ?? (player.connected ? undefined : "away");
          const state = seatStatus ? STATUS[seatStatus] : null;
          const ghost = turnFrom && state ? STATUS[turnFrom] : null;

          const body = (
            <>
              <span className="sl-seat__star">
                {isLeader && (
                  <IconCrown
                    size={22}
                    className={`sl-seat__crown sl-seq ${crownMotion ? `sl-seat__crown--${crownMotion}` : ""}`}
                  />
                )}
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
                  <span
                    className={`sl-swap ${ghost ? "sl-swap--flip" : ""}`}
                    data-status={seatStatus}
                  >
                    {ghost && (
                      <span
                        className={`sl-seat__status sl-swap__old sl-seq ${ghost.tone}`}
                        aria-hidden="true"
                      >
                        <ghost.icon size={14} />
                        {ghost.label}
                      </span>
                    )}
                    {/* Keyed by status, so a change pops in instead of snapping. */}
                    <span
                      key={seatStatus}
                      className={`sl-seat__status sl-swap__new sl-seq ${state.tone}`}
                    >
                      <state.icon size={14} />
                      {state.label}
                    </span>
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
              data-away={!player.connected}
              data-side={point.side}
              style={
                {
                  "--mx": `${point.mx}%`,
                  "--my": `${point.my}%`,
                  "--dx": `${point.dx}%`,
                  "--dy": `${point.dy}%`,
                  ...(isLeader && crownMotion === "pass"
                    ? crownOffset(layout, crownFromIndex, leaderIndex)
                    : {}),
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
