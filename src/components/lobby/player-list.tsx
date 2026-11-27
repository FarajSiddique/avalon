import { useState } from "react";
import type { LobbyView, PlayerId, SeatView } from "@/shared/views";
import { cssVars } from "@/client/css-vars";
import {
  IconCheck,
  IconCross,
  IconCrown,
  IconMoon,
  IconRing,
} from "@/components/ui/icons";
import { initialOf } from "./names";

/** Keyed by state where it is used, so a change pops in instead of snapping. */
function PlayerState({ player }: { player: SeatView }) {
  if (!player.connected) {
    return (
      <span className="text-ink-muted sl-pop sl-seq inline-flex items-center gap-1.5 text-base font-bold">
        <IconMoon size={18} />
        Away
      </span>
    );
  }

  if (player.isHost) {
    // The host has no ready: pressing Start is the host's ready.
    return (
      <span className="text-ink-muted sl-pop sl-seq inline-flex items-center gap-1.5 text-base font-bold">
        Starts the game
      </span>
    );
  }

  if (!player.ready) {
    return (
      <span className="text-warning sl-pop sl-seq inline-flex items-center gap-1.5 text-base font-bold">
        <IconRing size={18} />
        Not ready
      </span>
    );
  }

  return (
    <span className="text-success sl-pop sl-seq sl-tick inline-flex items-center gap-1.5 text-base font-bold">
      <IconCheck size={18} />
      Ready
    </span>
  );
}

function stateKey(player: SeatView): string {
  if (!player.connected) {
    return "away";
  }

  if (player.isHost) {
    return "host";
  }

  return player.ready ? "ready" : "waiting";
}

/**
 * Everyone in the room, with host, you, and ready, not ready or away. When
 * `allReady` turns on, the stars by each name flare one after another. Sits
 * inside a lobby section, which carries the heading; the Ready button is in
 * the lobby's action bar. With `onKick` (the host's own list) each other
 * seat has a remove button that asks before it acts.
 */
export function PlayerList({
  view,
  allReady = false,
  onKick,
}: {
  view: LobbyView;
  allReady?: boolean;
  onKick?: (id: PlayerId) => void;
}) {
  /** The seat about to be removed, waiting for the confirm. */
  const [removing, setRemoving] = useState<PlayerId | null>(null);

  return (
    <ul data-all-ready={allReady}>
      {view.players.map((player, index) => (
        <PlayerRow
          key={player.id}
          player={player}
          index={index}
          isYou={player.id === view.you.id}
          confirming={removing === player.id}
          onRemove={
            onKick && player.id !== view.you.id
              ? () => setRemoving(player.id)
              : undefined
          }
          onConfirm={() => {
            setRemoving(null);
            onKick?.(player.id);
          }}
          onCancel={() => setRemoving(null)}
        />
      ))}
    </ul>
  );
}

function PlayerRow({
  player,
  index,
  isYou,
  confirming,
  onRemove,
  onConfirm,
  onCancel,
}: {
  player: SeatView;
  index: number;
  isYou: boolean;
  confirming: boolean;
  /** Unset: this seat cannot be removed from here. */
  onRemove?: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <li
      data-testid="player"
      data-connected={player.connected}
      className="border-line flex min-h-[3.75rem] flex-wrap items-center gap-3 border-t border-dashed py-2 first:border-t-0"
    >
      <span
        aria-hidden="true"
        style={cssVars({ "--i": index })}
        className={`sl-avatar sl-seq font-display grid size-11 flex-none place-items-center rounded-full border-[1.5px] text-xl font-semibold ${
          player.connected
            ? "border-line-strong bg-well text-ink"
            : "border-line bg-well text-ink-muted border-dashed"
        }`}
      >
        {initialOf(player.name)}
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 truncate text-lg font-bold">
          {player.name}
          {isYou && <span className="sr-only"> (you)</span>}
        </span>
        {isYou && (
          <span className="sl-chip text-accent-cool" aria-hidden="true">
            You
          </span>
        )}
        {player.isHost && (
          <span className="sl-chip text-accent">
            <IconCrown size={14} />
            Host
          </span>
        )}
      </span>
      <PlayerState key={stateKey(player)} player={player} />
      {onRemove && !confirming && (
        <button
          type="button"
          className="sl-btn sl-btn--ghost flex-none px-3"
          aria-label={`Remove ${player.name}`}
          onClick={onRemove}
        >
          <IconCross size={18} />
        </button>
      )}
      {onRemove && confirming && (
        <div
          role="group"
          aria-label={`Remove ${player.name}?`}
          className="flex w-full items-center gap-2"
        >
          <p className="flex-1 font-bold">Remove {player.name}?</p>
          <button
            type="button"
            className="sl-btn sl-btn--primary px-4"
            onClick={onConfirm}
          >
            Remove
          </button>
          <button
            type="button"
            className="sl-btn sl-btn--ghost px-4"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      )}
    </li>
  );
}
