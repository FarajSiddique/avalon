import { Link } from "@tanstack/react-router";
import { useId } from "react";
import { useRoom } from "@/client/use-room";
import {
  IconArrowRight,
  IconCheck,
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
import type { RoomCode } from "@/shared/views";

/**
 * The room, flat for now: the code, who is here, and the connection. It
 * proves the real-time round trip (join, presence, reconnect). The 3D lobby,
 * ready, settings and the start button are Phase 1. It renders in the
 * browser only and does not claim the stage.
 */
export function RoomScreen({ code }: { code: RoomCode }) {
  const room = useRoom(code);
  const nameId = useId();

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
          <p className="text-lg">This room does not exist or has ended.</p>
          <Link to="/" className="sl-btn sl-btn--primary w-full">
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
                className="border-line flex min-h-[3.75rem] items-center gap-3 border-t border-dashed py-2 first:border-t-0"
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
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer
        className="text-ink-muted mt-auto inline-flex items-center gap-2 text-sm"
        data-testid="connection"
        data-online={room.online}
      >
        {room.online ? <IconCheck size={16} /> : <IconRing size={16} />}
        {room.online ? "Connected" : "Reconnecting…"}
      </footer>
    </main>
  );
}
