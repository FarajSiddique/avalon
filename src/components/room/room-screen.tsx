import { Link, Navigate } from "@tanstack/react-router";
import { useId, useRef } from "react";
import { useRoom } from "@/client/use-room";
import { useWebGLGate } from "@/client/use-webgl-gate";
import { useStageSlot, useStageStatus } from "@/components/stage/stage-context";
import { NoWebGLNotice } from "@/components/ui/no-webgl-notice";
import { LobbyScreen } from "@/components/lobby/lobby-screen";
import { IconArrowRight, IconRing, IconStar } from "@/components/ui/icons";
import { NAME_MAX_LENGTH, normalizeName } from "@/shared/constants";
import { ConnectionStatus } from "./connection-status";
import { HostNotice } from "./host-notice";
import { closedMessage } from "@/shared/copy";
import type { RoomCode } from "@/shared/views";

/**
 * The room at /room/CODE: the join form, the closed states, and once seated
 * the lobby on the Star Table. It renders in the browser only.
 */
export function RoomScreen({ code }: { code: RoomCode }) {
  // Checked before the socket opens: a browser that cannot draw the table
  // must not join, or it would take a seat it cannot play from.
  const gate = useWebGLGate();

  if (gate !== "ok") {
    return gate === "none" ? <NoWebGLNotice /> : null;
  }

  return <RoomSession code={code} />;
}

/** The room once the browser can draw it: the socket is open while mounted. */
function RoomSession({ code }: { code: RoomCode }) {
  const room = useRoom(code);
  const stageFailed = useStageStatus() === "failed";
  const inLobby = room.status === "seated" && room.view?.stage === "lobby";
  // The table stands behind the join form and the closed states too, so a
  // flight from the landing always lands (and its pending flight clears).
  // Seated, the lobby claims the stage itself.
  const behind = useRef<HTMLDivElement>(null);

  useStageSlot(
    inLobby || stageFailed ? null : { mode: "lobby", reveal: "whole", fade: 0 },
    behind,
  );
  const nameId = useId();

  if (room.status === "closed" && room.closedReason === "left") {
    return <Navigate to="/" />;
  }

  // The GPU dropped the table after the page had it. The socket and the
  // seat stay as they are (this component stays mounted); a reload brings
  // the table back.
  if (stageFailed) {
    return <NoWebGLNotice onReload={() => window.location.reload()} />;
  }

  const notice = (
    <HostNotice notice={room.notice} onDone={room.client.dismissNotice} />
  );

  if (inLobby && room.view?.stage === "lobby") {
    return (
      <>
        <LobbyScreen
          view={room.view}
          client={room.client}
          error={room.error}
          online={room.online}
        />
        {notice}
      </>
    );
  }

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-7 pb-8 lg:pt-16">
      <div
        ref={behind}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
      />
      <header className="sl-rise sl-seq sl-over-scene">
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

      {room.status === "seated" && room.view?.stage === "game" && (
        <section className="sl-panel sl-rise sl-seq p-5">
          <p className="text-lg">The game is under way.</p>
          {notice}
        </section>
      )}

      {/* On a panel: at the bottom of the page the hills and clouds behind
          it are too light for muted text. */}
      <ConnectionStatus online={room.online} className="mt-auto self-start" />
    </main>
  );
}
