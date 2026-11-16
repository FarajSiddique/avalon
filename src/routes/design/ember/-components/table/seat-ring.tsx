import type { CSSProperties, ReactNode } from "react";
import type { SeatView } from "@/shared/views";
import { Candle } from "../art/candle";
import { CheckIcon, CrossIcon, CrownIcon, SwordIcon } from "../art/icons";
import { Medallion } from "../art/medallion";
import { RuneCircle } from "../art/rune-circle";
import { WaxSeal } from "../art/wax-seal";

/** A public mark pressed next to a seat. */
export type SeatSeal = "voted" | "played" | "approve" | "reject";

export interface SeatModel {
  player: SeatView;
  isYou: boolean;
  isLeader: boolean;
  onTeam: boolean;
  seal?: SeatSeal;
  /** Set to make the seat a toggle button (the leader picking a team). */
  onToggle?: () => void;
}

/** Where the seats sit, in percent of the table area. */
const RING = { cx: 50, cy: 47, rx: 39, ry: 35.5 } as const;

function seatPosition(slot: number, count: number) {
  // Slot 0 is the near edge of the table (you); the rest go clockwise.
  const angle = Math.PI / 2 + (slot * 2 * Math.PI) / count;
  return {
    left: `${(RING.cx + RING.rx * Math.cos(angle)).toFixed(2)}%`,
    top: `${(RING.cy + RING.ry * Math.sin(angle)).toFixed(2)}%`,
    // Seats on the far side carry their name above, clear of the circle.
    labelAbove: Math.sin(angle) < -0.5,
  };
}

const SEAL_TEXT: Record<SeatSeal, string> = {
  voted: "has voted",
  played: "has played a card",
  approve: "voted Approve",
  reject: "voted Reject",
};

function SealMark({ seal, raised }: { seal: SeatSeal; raised: boolean }) {
  // Your own seat carries the "You" tag along its lower edge, so its seal
  // sits a little higher to stay clear of it.
  const corner = raised
    ? "absolute -right-2.5 bottom-2.5 lg:-right-2 lg:bottom-4"
    : "absolute -right-1.5 -bottom-1 lg:right-0 lg:bottom-0";
  switch (seal) {
    case "approve":
      return (
        <WaxSeal tone="laurel" size={24} className={`${corner} lg:scale-125`}>
          <CheckIcon size={15} />
        </WaxSeal>
      );
    case "reject":
      return (
        <WaxSeal size={24} className={`${corner} lg:scale-125`}>
          <CrossIcon size={15} />
        </WaxSeal>
      );
    case "voted":
    case "played":
      // A blank seal: something was committed, face down.
      return (
        <WaxSeal size={22} className={`${corner} lg:scale-125`}>
          <svg viewBox="-6 -6 12 12" width={10} height={10} focusable="false">
            <path d="M0-4 4 0 0 4-4 0Z" fill="currentColor" opacity={0.75} />
          </svg>
        </WaxSeal>
      );
  }
}

function describeSeat(seat: SeatModel): string {
  const parts: string[] = [];
  if (seat.isYou) parts.push("you");
  if (seat.isLeader) parts.push("leader");
  if (seat.onTeam) parts.push("on the team");
  if (seat.seal) parts.push(SEAL_TEXT[seat.seal]);
  return parts.length > 0 ? `, ${parts.join(", ")}` : "";
}

function Seat({
  seat,
  slot,
  count,
}: {
  seat: SeatModel;
  slot: number;
  count: number;
}) {
  const { left, top, labelAbove } = seatPosition(slot, count);
  const style: CSSProperties = {
    left,
    top,
    width: "var(--seat-size)",
    height: "var(--seat-size)",
  };
  const nameColor = seat.onTeam
    ? "text-accent-strong"
    : seat.isYou
      ? "text-accent-strong"
      : "text-ink";

  const body = (
    <>
      <Medallion name={seat.player.name} you={seat.isYou} team={seat.onTeam} />
      {seat.isLeader ? (
        <WaxSeal
          tone="gold"
          size={24}
          className="absolute -top-1.5 -left-1.5 lg:top-0 lg:left-0 lg:scale-125"
        >
          <CrownIcon size={15} />
        </WaxSeal>
      ) : null}
      {seat.onTeam ? (
        <WaxSeal
          tone="ember"
          size={24}
          className="absolute -top-1.5 -right-1.5 lg:top-0 lg:right-0 lg:scale-125"
        >
          <SwordIcon size={15} />
        </WaxSeal>
      ) : null}
      {seat.seal ? <SealMark seal={seat.seal} raised={seat.isYou} /> : null}
      {seat.isYou ? (
        <span
          className="ember-seat-tag absolute -bottom-2 left-1/2 -translate-x-1/2"
          aria-hidden="true"
        >
          You
        </span>
      ) : null}

      <span
        className={`absolute left-1/2 flex -translate-x-1/2 items-center whitespace-nowrap ${
          labelAbove
            ? "bottom-full mb-1 flex-col-reverse"
            : `top-full flex-col ${seat.isYou ? "mt-2.5" : "mt-1"}`
        }`}
      >
        <span className={`ember-seat-name ${nameColor}`}>
          {seat.player.name}
        </span>
        {seat.seal === "approve" || seat.seal === "reject" ? (
          <span
            className={`ember-seat-caption ${
              seat.seal === "approve" ? "text-success" : "text-fail"
            }`}
            aria-hidden="true"
          >
            {seat.seal === "approve" ? "Approve" : "Reject"}
          </span>
        ) : null}
        <span className="sr-only">{describeSeat(seat)}</span>
      </span>
    </>
  );

  return (
    <li className="absolute -translate-x-1/2 -translate-y-1/2" style={style}>
      {seat.onToggle ? (
        <button
          type="button"
          aria-pressed={seat.onTeam}
          onClick={seat.onToggle}
          className="ember-seat-button relative block h-full w-full rounded-full"
        >
          {body}
        </button>
      ) : (
        <div className="relative h-full w-full">{body}</div>
      )}
    </li>
  );
}

function LegendItem({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <li className="flex items-center gap-1.5">
      {children}
      <span className="ember-label text-ink-muted text-[0.6875rem] lg:text-[0.8125rem]">
        {label}
      </span>
    </li>
  );
}

/**
 * The table seen from above: the rune circle in the middle, every player on
 * the rim, you at the near edge. The same layout at every width; only the
 * sizes change (see --seat-size and --rune-size).
 */
export function SeatRing({
  seats,
  youId,
  centre,
  bareCentre = false,
  sealLabel,
}: {
  seats: SeatModel[];
  youId: string;
  /** Shown in the middle of the rune circle. */
  centre: ReactNode;
  /** Lay `centre` over the circle instead of on its dark core. */
  bareCentre?: boolean;
  /** What a blank seal means on this step, for the legend. */
  sealLabel?: string;
}) {
  const youIndex = Math.max(
    0,
    seats.findIndex((seat) => seat.player.id === youId),
  );
  const count = seats.length;
  const tabletop: CSSProperties = {
    left: `${RING.cx - RING.rx - 3}%`,
    right: `${RING.cx - RING.rx - 3}%`,
    top: `${RING.cy - RING.ry - 4}%`,
    bottom: `${100 - RING.cy - RING.ry - 4}%`,
  };
  const middle: CSSProperties = {
    left: `${RING.cx}%`,
    top: `${RING.cy}%`,
    width: "var(--rune-size)",
  };

  return (
    <section
      aria-label="The table"
      className="order-2 px-4 pt-3 lg:col-start-2 lg:row-start-1 lg:px-0 lg:pt-0"
    >
      <div className="relative mx-auto h-[23rem] w-full max-w-[26rem] lg:h-[36rem] lg:max-w-[46rem]">
        <div className="ember-tabletop absolute" style={tabletop} />

        {/* Three candles stand on the table, between the seats. */}
        <div
          className="absolute top-[12.5%] left-1/2 -translate-x-1/2 lg:top-[10%]"
          aria-hidden="true"
        >
          <Candle height={28} className="origin-bottom lg:scale-[1.8]" />
        </div>
        <div
          className="absolute bottom-[19.5%] left-[31.5%] lg:bottom-[19%] lg:left-[33%]"
          aria-hidden="true"
        >
          <Candle height={28} className="origin-bottom lg:scale-[1.8]" />
        </div>
        <div
          className="absolute right-[31.5%] bottom-[19.5%] lg:right-[33%] lg:bottom-[19%]"
          aria-hidden="true"
        >
          <Candle height={28} className="origin-bottom lg:scale-[1.8]" />
        </div>

        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={middle}
        >
          <RuneCircle bare={bareCentre}>
            {bareCentre ? null : centre}
          </RuneCircle>
          {bareCentre ? (
            <div className="absolute inset-0 grid place-items-center">
              {centre}
            </div>
          ) : null}
        </div>

        <ul aria-label="Seats, clockwise from you">
          {seats.map((seat, index) => (
            <Seat
              key={seat.player.id}
              seat={seat}
              slot={(index - youIndex + count) % count}
              count={count}
            />
          ))}
        </ul>

        <div className="pointer-events-none absolute right-0 bottom-0 left-0 flex items-end justify-between">
          <ul aria-label="Key" className="flex flex-col gap-1">
            <LegendItem label="Leader">
              <WaxSeal tone="gold" size={18}>
                <CrownIcon size={11} />
              </WaxSeal>
            </LegendItem>
            <LegendItem label="On team">
              <WaxSeal tone="ember" size={18}>
                <SwordIcon size={11} />
              </WaxSeal>
            </LegendItem>
          </ul>
          {sealLabel ? (
            <ul aria-label="Key, continued" className="flex flex-col gap-1">
              <LegendItem label={sealLabel}>
                <WaxSeal size={18} />
              </LegendItem>
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** "2 of 3" with a word under it, for the core of the rune circle. */
export function CentreCount({
  value,
  total,
  label,
}: {
  value: number;
  total: number;
  label: string;
}) {
  return (
    <p className="flex flex-col items-center leading-none" aria-hidden="true">
      <span className="font-display text-accent-strong text-[1.375rem] font-bold lg:text-4xl">
        {value}
        <span className="text-ink-muted mx-1 text-[0.75rem] font-semibold tracking-[0.1em] uppercase lg:text-base">
          of
        </span>
        {total}
      </span>
      <span className="ember-label text-ink mt-1 text-[0.6875rem] tracking-[0.1em] lg:mt-2 lg:text-sm">
        {label}
      </span>
    </p>
  );
}
