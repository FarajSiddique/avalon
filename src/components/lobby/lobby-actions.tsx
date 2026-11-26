import { useState } from "react";
import { play } from "@/client/sound";
import { IconArrowRight, IconCheck, IconRing } from "@/components/ui/icons";
import { startBlockerMessages } from "@/shared/copy";
import type { ProtocolError } from "@/shared/protocol";
import type { LobbyView } from "@/shared/views";

/**
 * The lobby's action bar: why the game cannot start yet, Ready (guests) or
 * Start (the host), the room's last refusal, and Leave.
 */
export function LobbyActions({
  view,
  error,
  onReady,
  onStart,
  onLeave,
}: {
  view: LobbyView;
  error: ProtocolError | null;
  onReady: (ready: boolean) => void;
  onStart: () => void;
  onLeave: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const reasons = startBlockerMessages(view);
  const canStart = reasons.length === 0;
  const isHost = view.you.isHost;
  const youReady =
    view.players.find((p) => p.id === view.you.id)?.ready ?? false;
  const hostName = view.players.find((p) => p.isHost)?.name ?? "The host";

  return (
    <div className="border-line flex flex-col gap-2.5 border-t px-4 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] lg:px-5 lg:pb-5">
      <div role="status" aria-live="polite" aria-label="Before the game starts">
        {canStart ? (
          <p className="text-success sl-rise sl-seq flex items-center gap-2 text-base font-bold">
            <IconCheck size={18} />
            Everyone is here and ready.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {reasons.map((reason) => (
              <li
                key={reason}
                className="text-ink flex items-start gap-2 text-base leading-snug"
              >
                <IconRing size={18} className="text-warning mt-0.5 flex-none" />
                {reason}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex gap-2.5">
        {isHost ? (
          <button
            type="button"
            className={`sl-btn sl-btn--primary flex-1 ${canStart ? "sl-wake sl-seq" : ""}`}
            disabled={!canStart}
            onClick={() => {
              play("start");
              onStart();
            }}
          >
            Start
            {canStart ? <IconArrowRight size={18} /> : null}
          </button>
        ) : (
          <>
            {/* The host has no ready: pressing Start is the host's ready. */}
            <button
              type="button"
              aria-pressed={youReady}
              onClick={() => {
                play(youReady ? "unready" : "ready");
                onReady(!youReady);
              }}
              className="sl-btn sl-btn--ghost flex-1"
            >
              {youReady ? (
                <IconCheck size={18} className="sl-pop sl-seq" />
              ) : (
                <IconRing size={18} />
              )}
              I&apos;m ready
            </button>
            <p className="text-ink-muted flex flex-1 items-center text-base leading-snug">
              {hostName} starts the game.
            </p>
          </>
        )}
      </div>
      <p role="alert" className="text-fail text-sm empty:hidden">
        {error?.message}
      </p>
      {leaving ? (
        <div
          role="group"
          aria-label="Leave the room?"
          className="flex items-center gap-2"
        >
          <p className="flex-1 font-bold">Leave the room?</p>
          <button
            type="button"
            className="sl-btn sl-btn--primary px-4"
            onClick={onLeave}
          >
            Leave
          </button>
          <button
            type="button"
            className="sl-btn sl-btn--ghost px-4"
            onClick={() => setLeaving(false)}
          >
            Stay
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="sl-plain self-center"
          onClick={() => setLeaving(true)}
        >
          Leave room
        </button>
      )}
    </div>
  );
}
