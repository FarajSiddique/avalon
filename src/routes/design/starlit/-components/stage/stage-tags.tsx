import { useRef } from "react";
import type { TablePlayer } from "../three/types";
import type { SeatStatus } from "../table/seat-ring";
import { useTagLayer } from "./stage-context";

/** What a tag over a head says during the game. Display only. */
export interface SeatMark {
  status?: SeatStatus;
  leader?: boolean;
  /** Picked for the team (propose) or on it (vote, quest, result). */
  chosen?: boolean;
}

/**
 * CONTRACT STUB (the table UI task builds it out): the name tags over the
 * figures, owned by the screen so they can be buttons. The engine moves each
 * `[data-tag]` child over its figure's head every frame.
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
        return pickable ? (
          <button
            key={player.id}
            type="button"
            data-tag={player.id}
            aria-pressed={mark?.chosen ?? false}
            onClick={() => onPick?.(player.id)}
            className="sl-name-tag absolute top-0 left-0 opacity-0"
          >
            {player.name}
          </button>
        ) : (
          <div
            key={player.id}
            data-tag={player.id}
            className="sl-name-tag absolute top-0 left-0 opacity-0"
          >
            {player.name}
          </div>
        );
      })}
    </div>
  );
}
