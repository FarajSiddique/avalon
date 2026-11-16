import { useId, type CSSProperties } from "react";
import { play } from "@/client/sound";
import { MAX_PLAYERS } from "@/shared/constants";
import type { LobbyView, SeatView } from "@/shared/views";
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
  if (!player.connected) return "away";
  return player.ready ? "ready" : "waiting";
}

/**
 * Everyone in the room, with host, you, and ready, not ready or away. When
 * `allReady` turns on, the stars by each name flare one after another.
 */
export function PlayerList({
  view,
  onToggleReady,
  allReady = false,
}: {
  view: LobbyView;
  onToggleReady: () => void;
  allReady?: boolean;
}) {
  const you = view.players.find((player) => player.id === view.you.id);
  const youReady = you?.ready ?? false;
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="sl-panel p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="font-display text-2xl font-medium">
          Around the fire
        </h2>
        <p className="text-ink-muted text-base font-bold">
          {view.players.length} of {MAX_PLAYERS} players
        </p>
      </div>

      <ul className="mt-3" data-all-ready={allReady}>
        {view.players.map((player, index) => {
          const isYou = player.id === view.you.id;
          return (
            <li
              key={player.id}
              className="border-line flex min-h-[3.75rem] items-center gap-3 border-t border-dashed py-2 first:border-t-0"
            >
              <span
                aria-hidden="true"
                style={{ "--i": index } as CSSProperties}
                className={`sl-avatar sl-seq font-display grid size-11 flex-none place-items-center rounded-full border-[1.5px] text-xl font-semibold ${
                  player.connected
                    ? "border-line-strong bg-well text-ink"
                    : "border-line bg-well text-ink-muted border-dashed"
                }`}
              >
                {initialOf(player.name)}
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-lg font-bold">{player.name}</span>
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
        })}
      </ul>

      <button
        type="button"
        aria-pressed={youReady}
        onClick={() => {
          play(youReady ? "unready" : "ready");
          onToggleReady();
        }}
        className="sl-btn sl-btn--ghost mt-4 w-full"
      >
        {youReady ? (
          <IconCheck size={18} className="sl-pop sl-seq" />
        ) : (
          <IconRing size={18} />
        )}
        I&apos;m ready
      </button>
    </section>
  );
}
