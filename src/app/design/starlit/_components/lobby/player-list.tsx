import { useId } from "react";
import { MAX_PLAYERS } from "@/shared/constants";
import type { LobbyView, SeatView } from "@/shared/views";
import { IconCheck, IconCrown, IconMoon, IconRing } from "../icons";
import { initialOf } from "../names";

function PlayerState({ player }: { player: SeatView }) {
  if (!player.connected) {
    return (
      <span className="text-ink-muted inline-flex items-center gap-1.5 text-base font-bold">
        <IconMoon size={18} />
        Away
      </span>
    );
  }
  if (!player.ready) {
    return (
      <span className="text-warning inline-flex items-center gap-1.5 text-base font-bold">
        <IconRing size={18} />
        Not ready
      </span>
    );
  }
  return (
    <span className="text-success inline-flex items-center gap-1.5 text-base font-bold">
      <IconCheck size={18} />
      Ready
    </span>
  );
}

/** Everyone in the room, with host, you, and ready, not ready or away. */
export function PlayerList({
  view,
  onToggleReady,
}: {
  view: LobbyView;
  onToggleReady: () => void;
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

      <ul className="mt-3">
        {view.players.map((player) => {
          const isYou = player.id === view.you.id;
          return (
            <li
              key={player.id}
              className="border-line flex min-h-[3.75rem] items-center gap-3 border-t border-dashed py-2 first:border-t-0"
            >
              <span
                aria-hidden="true"
                className={`font-display grid size-11 flex-none place-items-center rounded-full border-[1.5px] text-xl font-semibold ${
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
              <PlayerState player={player} />
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        aria-pressed={youReady}
        onClick={onToggleReady}
        className="sl-btn sl-btn--ghost mt-4 w-full"
      >
        {youReady ? <IconCheck size={18} /> : <IconRing size={18} />}
        I&apos;m ready
      </button>
    </section>
  );
}
