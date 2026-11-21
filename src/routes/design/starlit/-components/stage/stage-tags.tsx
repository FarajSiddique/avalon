import { useRef } from "react";
import { IconCrown, IconStar } from "../icons";
import type { TablePlayer } from "../three/types";
import { STATUS, type SeatStatus } from "../table/seat-ring";
import "../table/table-stage.css";
import { useTagLayer } from "./stage-context";

/** What a tag over a head says during the game. Display only. */
export interface SeatMark {
  status?: SeatStatus;
  leader?: boolean;
  /** Picked for the team (propose) or on it (vote, quest, result). */
  chosen?: boolean;
}

/** The words a tag says: "Mira, leader, chosen" (also its accessible name). */
export function tagLabel(player: TablePlayer, mark?: SeatMark): string {
  const status = statusOf(player, mark);
  const parts = [player.isYou ? `${player.name} (you)` : player.name];
  if (mark?.leader) parts.push("leader");
  if (mark?.chosen && status !== "chosen") parts.push("on the team");
  if (status) parts.push(STATUS[status].label.toLowerCase());
  return parts.join(", ");
}

/** A step's own state wins; otherwise someone who has left is "Away". */
function statusOf(
  player: TablePlayer,
  mark?: SeatMark,
): SeatStatus | undefined {
  return mark?.status ?? (player.connected ? undefined : "away");
}

function TagBody({ player, mark }: { player: TablePlayer; mark?: SeatMark }) {
  const status = statusOf(player, mark);
  const shown = status ? STATUS[status] : null;
  return (
    <>
      {mark?.leader ? (
        <IconCrown size={14} className="text-accent shrink-0" />
      ) : null}
      {mark?.chosen && status !== "chosen" ? (
        <IconStar size={13} className="text-accent shrink-0" />
      ) : null}
      <span className="min-w-0 truncate">{player.name}</span>
      {player.isYou ? <span className="sl-name-tag__you">You</span> : null}
      {shown ? (
        // Keyed by the state so a change shows at once, with a small pop.
        <span
          key={status}
          className={`sl-seat-tag__status ${shown.tone}`}
          data-status={status}
        >
          <shown.icon size={13} />
          <span className="text-ink">{shown.label}</span>
        </span>
      ) : null}
    </>
  );
}

/**
 * The name tags over the figures, owned by the screen so they can be
 * buttons. The engine moves each `[data-tag]` child over its figure's head
 * every frame (it writes their transform and opacity, so React never does).
 * Each tag says its state with an icon and a word: crown for the leader,
 * a star for the team, and the step's state (Chosen, Voted, Approve, ...).
 */
export function StageTags({
  players,
  marks,
  pickable = false,
  onPick,
}: {
  players: readonly TablePlayer[];
  marks?: Readonly<Record<string, SeatMark>>;
  /** Tags are buttons (`aria-pressed` = chosen) that call `onPick`. */
  pickable?: boolean;
  onPick?: (id: string) => void;
}) {
  const layer = useRef<HTMLDivElement>(null);
  useTagLayer(layer);
  return (
    <div ref={layer} className="sl-stage-tags">
      {players.map((player) => {
        const mark = marks?.[player.id];
        const className = `sl-name-tag sl-seat-tag absolute top-0 left-0 opacity-0 ${mark?.chosen ? "sl-seat-tag--chosen" : ""}`;
        return pickable ? (
          <button
            key={player.id}
            type="button"
            data-tag={player.id}
            aria-pressed={mark?.chosen ?? false}
            aria-label={tagLabel(player, mark)}
            onClick={() => onPick?.(player.id)}
            className={`${className} sl-seat-tag--pick`}
          >
            <TagBody player={player} mark={mark} />
          </button>
        ) : (
          <div
            key={player.id}
            data-tag={player.id}
            data-status={statusOf(player, mark)}
            className={className}
          >
            <span className="sr-only">{tagLabel(player, mark)}</span>
            <span aria-hidden="true" className="contents">
              <TagBody player={player} mark={mark} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
