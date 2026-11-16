import type { CSSProperties, ReactNode } from "react";
import { PLAYER_IDS, tableViews } from "@/design/mock";
import type { GameView, PlayerId, SeatView } from "@/shared/views";
import { Fire } from "../art/campfire";
import { makeStars } from "../art/seeded";
import { StarField } from "../art/star-field";
import { initialOf } from "../names";
import { seatLayout } from "../table/seat-layout";
import { SeatRing, type SeatStatus } from "../table/seat-ring";

/* ------------------------------------------------------------ mock table */

/** The seven players of the mock game, in seat order. */
export const PLAYERS: readonly SeatView[] = tableViews.propose.players;
export const YOU = PLAYER_IDS.wren;
export const IDS = PLAYER_IDS;
export const BASE_VIEW: GameView = tableViews.propose;

/* --------------------------------------------------------------- the sky */

const SKY = makeStars({
  count: 90,
  seed: 77,
  width: 600,
  height: 300,
  topBias: 1.1,
  twinkleEvery: 4,
});

/** A patch of the night sky behind a scene. */
export function MiniSky() {
  return (
    <svg
      viewBox="0 0 600 300"
      preserveAspectRatio="xMidYMid slice"
      className="sl-minisky"
      aria-hidden="true"
      focusable="false"
    >
      <StarField stars={SKY} />
    </svg>
  );
}

/* ---------------------------------------------------------- a seat ring */

/**
 * The real seat ring in a scene. `timing` sets the motion variables
 * (--crown-at, --turn-at, ...) for this scene.
 */
export function RingScene({
  litIds = [],
  status,
  leaderId = YOU,
  players = PLAYERS,
  crown,
  turnFrom,
  timing,
  label = "Seats",
  children,
}: {
  litIds?: readonly PlayerId[];
  status?: Readonly<Record<PlayerId, SeatStatus | undefined>>;
  leaderId?: PlayerId;
  players?: readonly SeatView[];
  crown?: "arrive" | PlayerId;
  turnFrom?: SeatStatus;
  timing?: Record<string, string>;
  label?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="relative px-1 pt-5 pb-2 lg:px-3"
      style={timing as CSSProperties | undefined}
    >
      <SeatRing
        label={label}
        players={players}
        youId={YOU}
        leaderId={leaderId}
        litIds={litIds}
        status={status}
        crown={crown}
        turnFrom={turnFrom}
      />
      {children}
    </div>
  );
}

/* ---------------------------------------------------- the lobby's stars */

const LOBBY_W = 320;
const LOBBY_H = 210;

/** Where seat n sits in the lobby sky: the table's ring, drawn small. */
function lobbyPoint(index: number, count: number): readonly [number, number] {
  const point = seatLayout(count)[index];
  if (!point) return [LOBBY_W / 2, LOBBY_H / 2];
  return [(point.dx / 100) * LOBBY_W, (point.dy / 100) * LOBBY_H + 8];
}

/**
 * The lobby as a small sky: an empty dashed ring for each seat, a star for
 * each player who has joined, and lines that link the stars once everyone
 * is ready. A new star flares as it lights.
 */
export function LobbySky({
  names,
  joined,
  linked = false,
  seats = 7,
}: {
  names: readonly string[];
  /** How many of the names have joined, in order. */
  joined: number;
  linked?: boolean;
  seats?: number;
}) {
  const points = Array.from({ length: seats }, (_, index) =>
    lobbyPoint(index, seats),
  );
  return (
    <svg
      viewBox={`0 0 ${LOBBY_W} ${LOBBY_H}`}
      className="relative mx-auto block h-auto w-full max-w-[26rem]"
      aria-hidden="true"
      focusable="false"
    >
      <g
        transform={`translate(${LOBBY_W / 2} ${LOBBY_H / 2 + 22}) scale(0.42)`}
      >
        <Fire />
      </g>
      {linked &&
        points.map(([x, y], index) => {
          const [nx, ny] = points[(index + 1) % points.length] ?? [x, y];
          return (
            <path
              key={`link-${index}`}
              className="sl-joinline sl-joinline--linked sl-seq"
              pathLength={1}
              d={`M${x} ${y}L${nx} ${ny}`}
              style={{ "--at": `${index * 70}ms` } as CSSProperties}
            />
          );
        })}
      {points.map(([x, y], index) => {
        const name = names[index];
        const isIn = index < joined && name;
        if (!isIn) {
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={13}
              fill="none"
              stroke="var(--line-strong)"
              strokeDasharray="3 4"
            />
          );
        }
        return (
          <g key={`${index}-${name}`} transform={`translate(${x} ${y})`}>
            <circle
              className="sl-joinstar__flare sl-seq"
              r={17}
              fill="none"
              stroke="var(--accent-strong)"
              strokeWidth={2}
            />
            <g className="sl-joinstar sl-seq">
              <circle
                r={15}
                fill={linked ? "var(--accent)" : "var(--surface)"}
                stroke={linked ? "var(--accent-strong)" : "var(--line-strong)"}
                strokeWidth={1.5}
              />
              <text
                y={6}
                textAnchor="middle"
                fontSize={16}
                className="font-display"
                fontWeight={600}
                fill={linked ? "var(--on-accent)" : "var(--ink)"}
              >
                {initialOf(name)}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

export const LOBBY_NAMES = PLAYERS.map((player) => player.name);

/** A caption line inside a scene, for what the screen would say. */
export function SceneLine({
  children,
  className = "",
  at,
}: {
  children: ReactNode;
  className?: string;
  /** Rise in after this many ms. */
  at?: number;
}) {
  return (
    <p
      className={`text-center text-base leading-snug font-bold ${at !== undefined ? "sl-rise sl-seq" : ""} ${className}`}
      style={
        at !== undefined ? ({ "--at": `${at}ms` } as CSSProperties) : undefined
      }
    >
      {children}
    </p>
  );
}
