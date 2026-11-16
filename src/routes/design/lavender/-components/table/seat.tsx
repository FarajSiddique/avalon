import type { SeatView } from "@/shared/views";
import { Helm, PixelIcon } from "../pixel/pixel-sprite";
import type { IconName } from "../pixel/sprites";

/** What a seat is showing this moment, beyond who sits there. */
export type SeatStatus =
  | "none"
  | "picked"
  | "voted"
  | "voting"
  | "approve"
  | "reject"
  | "played"
  | "choosing";

const STATUS: Record<
  Exclude<SeatStatus, "none">,
  { icon: IconName | null; label: string; className: string }
> = {
  // The sword on the frame already marks a picked seat.
  picked: { icon: null, label: "Picked", className: "text-accent" },
  voted: { icon: "sealed", label: "Voted", className: "text-ink" },
  voting: { icon: "hourglass", label: "Waiting", className: "text-ink-muted" },
  approve: { icon: "check", label: "Approve", className: "text-success" },
  reject: { icon: "cross", label: "Reject", className: "text-fail" },
  played: { icon: "sealed", label: "Played", className: "text-ink" },
  choosing: {
    icon: "hourglass",
    label: "Waiting",
    className: "text-ink-muted",
  },
};

export interface SeatProps {
  player: SeatView;
  seatIndex: number;
  isYou: boolean;
  isLeader: boolean;
  onTeam: boolean;
  status: SeatStatus;
  /** Set when the leader is choosing: the seat becomes a toggle button. */
  onToggle?: () => void;
}

/**
 * One knight at the fire. Leader (crown), team (sword) and "you" are pinned
 * along the top edge of the frame; the vote or card state sits beside the
 * helm with its word underneath. Nothing is told by colour alone.
 */
export function Seat({
  player,
  seatIndex,
  isYou,
  isLeader,
  onTeam,
  status,
  onToggle,
}: SeatProps) {
  const state = status === "none" ? null : STATUS[status];
  const className = `lv-frame relative flex h-full w-full flex-col items-center px-1 pt-[calc(var(--px)*3)] pb-[var(--px)] text-center lg:pb-[var(--px)] ${
    onTeam
      ? "bg-[var(--seat-face-team)] [--frame-color:var(--seat-frame-team)]"
      : "bg-[var(--seat-face)] [--frame-color:var(--seat-frame)]"
  }`;

  const body = (
    <>
      <span className="absolute inset-x-0 -top-[calc(var(--px)*3)] grid grid-cols-[1fr_auto_1fr] items-center">
        <span className="justify-self-start">
          {isLeader ? (
            <span className="bg-well text-accent-strong block p-[var(--px)]">
              <PixelIcon name="crown" />
              <span className="sr-only">Leader.</span>
            </span>
          ) : null}
        </span>
        <span>
          {isYou ? (
            <span className="lv-tag [--tag-face:var(--accent)] [--tag-ink:var(--on-accent)]">
              You
            </span>
          ) : null}
        </span>
        <span className="justify-self-end">
          {onTeam ? (
            <span className="bg-well text-accent block p-[var(--px)]">
              <PixelIcon name="sword" />
              <span className="sr-only">On the team.</span>
            </span>
          ) : null}
        </span>
      </span>
      <span className="relative mt-[var(--px)]">
        <Helm seatIndex={seatIndex} />
        {state?.icon ? (
          <span
            className={`bg-well absolute -right-[calc(var(--px)*8)] -bottom-[var(--px)] p-[var(--px)] ${state.className}`}
          >
            <PixelIcon name={state.icon} />
          </span>
        ) : null}
      </span>
      <span className="mt-1 block max-w-full truncate text-[22px] leading-none lg:text-[24px]">
        {player.name}
      </span>
      <span
        className={`lv-small block min-h-[1.1em] leading-[1.1] ${state?.className ?? ""}`}
      >
        {state?.label ?? ""}
      </span>
    </>
  );

  if (onToggle) {
    return (
      <button
        type="button"
        aria-pressed={onTeam}
        onClick={onToggle}
        className={`${className} cursor-pointer [--seat-frame:var(--line-strong)] aria-pressed:translate-y-[var(--px)] aria-pressed:[--frame-drop:transparent]`}
      >
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}
