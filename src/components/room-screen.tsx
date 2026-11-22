import { Link } from "@tanstack/react-router";
import { useId } from "react";
import { useRoom } from "@/client/use-room";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  NAME_MAX_LENGTH,
  normalizeName,
} from "@/shared/constants";
import type { RoomCode } from "@/shared/views";

/**
 * Placeholder room screen: proves the real-time round trip (join, presence,
 * reconnect). The lobby controls and the game arrive in the next run.
 */
export function RoomScreen({ code }: { code: RoomCode }) {
  const room = useRoom(code);
  const nameId = useId();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-10">
      <header className="space-y-1">
        <p className="text-ink-muted text-sm">Room code</p>
        <h1
          className="font-display text-5xl font-semibold tracking-[0.25em]"
          data-testid="room-code"
        >
          {code}
        </h1>
      </header>

      {room.status === "connecting" && (
        <p className="text-ink-muted" role="status">
          Connecting…
        </p>
      )}

      {room.status === "closed" && (
        <div className="space-y-3" role="alert">
          <p>This room does not exist or has ended.</p>
          <Link
            to="/"
            className="text-accent-strong underline underline-offset-4"
          >
            Start a new room
          </Link>
        </div>
      )}

      {room.status === "needs_name" && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("name");
            const name = normalizeName(typeof value === "string" ? value : "");

            if (name) {
              room.join(name);
            }
          }}
        >
          <label htmlFor={nameId} className="block text-sm font-medium">
            Your name
          </label>
          <input
            id={nameId}
            name="name"
            className="border-line bg-well text-ink h-12 w-full rounded-md border px-3 text-base"
            maxLength={NAME_MAX_LENGTH}
            autoComplete="nickname"
            autoCapitalize="words"
            enterKeyHint="go"
            required
          />
          <button
            type="submit"
            className="bg-accent text-on-accent hover:bg-accent-strong h-12 w-full cursor-pointer rounded-md px-4 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Join room
          </button>
          <p role="alert" className="text-fail min-h-5 text-sm">
            {room.error?.message}
          </p>
        </form>
      )}

      {room.status === "seated" && room.view && (
        <section className="space-y-3" aria-labelledby="players-heading">
          <h2 id="players-heading" className="text-sm font-medium">
            Players ({room.view.players.length} of {MAX_PLAYERS}, {MIN_PLAYERS}{" "}
            needed)
          </h2>
          <ul className="divide-line border-line bg-surface divide-y rounded-lg border">
            {room.view.players.map((player) => (
              <li
                key={player.id}
                data-testid="player"
                data-connected={player.connected}
                className="flex min-h-12 items-center justify-between gap-3 px-4 py-2"
              >
                <span className="truncate font-medium">
                  {player.name}
                  {player.id === room.view?.you.id && (
                    <span className="text-ink-muted font-normal"> (you)</span>
                  )}
                </span>
                <span className="text-ink-muted flex shrink-0 items-center gap-3 text-sm">
                  {player.isHost && <span>Host</span>}
                  <span
                    className={
                      player.connected ? "text-success" : "text-warning"
                    }
                  >
                    {player.connected ? "Online" : "Away"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-ink-muted text-sm">
            Others join at this page&apos;s address or with the room code.
          </p>
        </section>
      )}

      <footer
        className="text-ink-muted mt-auto text-xs"
        data-testid="connection"
        data-online={room.online}
      >
        {room.online ? "Connected" : "Reconnecting…"}
      </footer>
    </main>
  );
}
