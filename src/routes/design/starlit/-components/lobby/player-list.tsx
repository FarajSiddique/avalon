import type { LobbyView, SeatView } from "@/shared/views";
import { cssVars } from "../art/css-vars";
import { IconCheck, IconCrown, IconMoon, IconRing } from "../icons";
import { initialOf } from "../names";

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

  return player.ready ? "ready" : "waiting";
}

/**
 * Everyone in the room, with host, you, and ready, not ready or away. When
 * `allReady` turns on, the stars by each name flare one after another. Sits
 * inside a lobby section, which carries the heading; the Ready button is in
 * the lobby's action bar.
 */
export function PlayerList({
  view,
  allReady = false,
}: {
  view: LobbyView;
  allReady?: boolean;
}) {
  return (
    <ul data-all-ready={allReady}>
      {view.players.map((player, index) => (
        <PlayerRow
          key={player.id}
          player={player}
          index={index}
          isYou={player.id === view.you.id}
        />
      ))}
    </ul>
  );
}

function PlayerRow({
  player,
  index,
  isYou,
}: {
  player: SeatView;
  index: number;
  isYou: boolean;
}) {
  return (
    <li className="border-line flex min-h-[3.75rem] items-center gap-3 border-t border-dashed py-2 first:border-t-0">
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
        </span>
        {isYou && <span className="sl-chip text-accent-cool">You</span>}
        {player.isHost && (
          <span className="sl-chip text-accent">
            <IconCrown size={14} />
            Host
          </span>
        )}
      </span>
      <PlayerState key={stateKey(player)} player={player} />
    </li>
  );
}
