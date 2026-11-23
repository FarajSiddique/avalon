import { Link, Navigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { useRoom } from "@/client/use-room";
import {
  IconArrowRight,
  IconCheck,
  IconCross,
  IconCrown,
  IconMoon,
  IconRing,
  IconStar,
} from "@/components/ui/icons";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  NAME_MAX_LENGTH,
  normalizeName,
} from "@/shared/constants";
import { closedMessage } from "@/shared/copy";
import type { RoomCode } from "@/shared/views";

/**
 * The room, flat for now: the code, who is here, and the connection. It
 * proves the real-time round trip (join, presence, reconnect, kick, leave).
 * The 3D lobby, ready, settings and the start button are Phase 1. It renders
 * in the browser only and does not claim the stage.
 */
export function RoomScreen({ code }: { code: RoomCode }) {
  const room = useRoom(code);
  const nameId = useId();
  /** The seat the host is about to remove, waiting for the confirm. */
  const [removing, setRemoving] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  if (room.status === "closed" && room.closedReason === "left") {
    return <Navigate to="/" />;
  }

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-7 pb-8 lg:pt-16">
      <header className="sl-rise sl-seq">
        <p className="sl-eyebrow">Room code</p>
        <h1 className="sl-code mt-2" data-testid="room-code">
          {code}
        </h1>
        <p className="text-ink-muted mt-3 text-base leading-snug">
          Others join at this page&apos;s address or with the room code.
        </p>
      </header>

      {room.status === "connecting" && (
        <p
          className="text-ink-muted inline-flex items-center gap-2"
          role="status"
        >
          <IconRing size={18} />
          Connecting…
        </p>
      )}

      {room.status === "closed" && (
        <div
          className="sl-panel sl-rise sl-seq flex flex-col gap-4 p-5"
          role="alert"
        >
          <p className="text-lg">{closedMessage(room.closedReason)}</p>
          {room.closedReason === "kicked" && (
            <button
              type="button"
              className="sl-btn sl-btn--primary w-full"
              onClick={room.rejoin}
            >
              Join again
              <IconArrowRight size={18} />
            </button>
          )}
          <Link
            to="/"
            className={`sl-btn w-full ${
              room.closedReason === "kicked"
                ? "sl-btn--ghost"
                : "sl-btn--primary"
            }`}
          >
            <IconStar size={18} />
            Start a new room
          </Link>
        </div>
      )}

      {room.status === "needs_name" && (
        <form
          className="sl-panel sl-rise sl-seq flex flex-col gap-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("name");
            const name = normalizeName(typeof value === "string" ? value : "");

            if (name) {
              room.join(name);
            }
          }}
        >
          <div>
            <label htmlFor={nameId} className="sl-label">
              Your name
            </label>
            <input
              id={nameId}
              name="name"
              type="text"
              className="sl-input"
              placeholder="What the table calls you"
              maxLength={NAME_MAX_LENGTH}
              autoComplete="nickname"
              autoCapitalize="words"
              spellCheck={false}
              enterKeyHint="go"
              required
            />
          </div>
          <button type="submit" className="sl-btn sl-btn--primary w-full">
            Join room
            <IconArrowRight size={18} />
          </button>
          <p role="alert" className="text-fail -mt-2 min-h-5 text-sm">
            {room.error?.message}
          </p>
        </form>
      )}

      {room.status === "seated" && room.view && (
        <section
          className="sl-panel sl-rise sl-seq p-5"
          aria-labelledby="players-heading"
        >
          <h2 id="players-heading" className="sl-eyebrow">
            Players ({room.view.players.length} of {MAX_PLAYERS}, {MIN_PLAYERS}{" "}
            needed)
          </h2>
          <ul className="mt-2">
            {room.view.players.map((player) => (
              <li
                key={player.id}
                data-testid="player"
                data-connected={player.connected}
                className="border-line flex min-h-[3.75rem] flex-wrap items-center gap-3 border-t border-dashed py-2 first:border-t-0"
              >
                <span
                  aria-hidden="true"
                  className={`font-display bg-well grid size-11 flex-none place-items-center rounded-full border-[1.5px] text-xl font-semibold ${
                    player.connected
                      ? "border-line-strong text-ink"
                      : "border-line text-ink-muted border-dashed"
                  }`}
                >
                  {player.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 truncate text-lg font-bold">
                    {player.name}
                    {player.id === room.view?.you.id && (
                      <span className="text-accent-cool text-base font-semibold">
                        {" "}
                        (you)
                      </span>
                    )}
                  </span>
                  {player.isHost && (
                    <span className="sl-chip text-accent">
                      <IconCrown size={14} />
                      Host
                    </span>
                  )}
                </span>
                {player.connected ? (
                  <span className="text-success inline-flex flex-none items-center gap-1.5 text-base font-bold">
                    <IconCheck size={18} />
                    Online
                  </span>
                ) : (
                  <span className="text-ink-muted inline-flex flex-none items-center gap-1.5 text-base font-bold">
                    <IconMoon size={18} />
                    Away
                  </span>
                )}
                {room.view?.you.isHost &&
                  player.id !== room.view.you.id &&
                  removing !== player.id && (
                    <button
                      type="button"
                      className="sl-btn sl-btn--ghost flex-none px-3"
                      aria-label={`Remove ${player.name}`}
                      onClick={() => setRemoving(player.id)}
                    >
                      <IconCross size={18} />
                    </button>
                  )}
                {/* Gated on host too: host can pass on while this is open. */}
                {room.view?.you.isHost && removing === player.id && (
                  <div
                    role="group"
                    aria-label={`Remove ${player.name}?`}
                    className="flex w-full items-center gap-2"
                  >
                    <p className="flex-1 font-bold">Remove {player.name}?</p>
                    <button
                      type="button"
                      className="sl-btn sl-btn--primary px-4"
                      onClick={() => {
                        setRemoving(null);
                        room.kick(player.id);
                      }}
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      className="sl-btn sl-btn--ghost px-4"
                      onClick={() => setRemoving(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p role="alert" className="text-fail min-h-5 text-sm">
            {room.error?.message}
          </p>
          {leaving ? (
            <div
              role="group"
              aria-label="Leave the room?"
              className="mt-2 flex items-center gap-2"
            >
              <p className="flex-1 font-bold">Leave the room?</p>
              <button
                type="button"
                className="sl-btn sl-btn--primary px-4"
                onClick={room.leave}
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
              className="sl-btn sl-btn--ghost mt-2 w-full"
              onClick={() => setLeaving(true)}
            >
              Leave room
            </button>
          )}
        </section>
      )}

      {/* On a panel: at the bottom of the page the hills and clouds behind
          it are too light for muted text. */}
      <footer
        className="sl-panel text-ink-muted mt-auto inline-flex items-center gap-2 self-start px-3 py-2 text-sm"
        data-testid="connection"
        data-online={room.online}
      >
        {room.online ? <IconCheck size={16} /> : <IconRing size={16} />}
        {room.online ? "Connected" : "Reconnecting…"}
      </footer>
    </main>
  );
}
