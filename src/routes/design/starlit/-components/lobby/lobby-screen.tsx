import { useEffect, useRef } from "react";
import { play } from "@/client/sound";
import { designPaths } from "@/design/directions";
import { useMockLobby } from "@/design/use-mock-lobby";
import { startBlockerMessages } from "@/shared/copy";
import { IconArrowRight, IconCheck, IconRing } from "../icons";
import { SoundLink } from "../sound-link";
import { AvatarMaker } from "./avatar-maker";
import { HostSettings } from "./host-settings";
import { LobbyTable } from "./lobby-table";
import { PlayerList } from "./player-list";
import { RoomCode } from "./room-code";

const paths = designPaths("starlit");

/**
 * The moment the last blocker clears, the table plays one chord. Only on the
 * change: opening a lobby that can already start stays quiet.
 */
function useEveryoneReadyChord(canStart: boolean): void {
  const was = useRef(canStart);
  useEffect(() => {
    if (canStart && !was.current) play("all-ready");
    was.current = canStart;
  }, [canStart]);
}

/** The lobby as the host sees it. */
export function LobbyScreen() {
  const lobby = useMockLobby();
  const { view, canStart } = lobby;
  const reasons = startBlockerMessages(view);
  useEveryoneReadyChord(canStart);

  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-4 px-4 pt-6 lg:grid lg:flex-none lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,27rem)] lg:grid-rows-[auto_auto_auto_auto_auto_1fr] lg:items-start lg:gap-6 lg:px-8 lg:pt-10 lg:pb-12">
      <header className="lg:col-span-3">
        <p className="sl-eyebrow">The lobby</p>
        <h1 className="font-display mt-1 text-[2rem] leading-tight font-medium lg:text-5xl">
          Gather at the fire
        </h1>
        <p className="text-ink-muted mt-1.5 max-w-[34rem] text-[1.0625rem] leading-relaxed">
          Share the code. The game can start once everyone here is ready.
        </p>
      </header>

      <div className="lg:col-span-3 lg:row-start-2">
        <LobbyTable view={view} />
      </div>

      <div className="lg:col-start-1 lg:row-start-3">
        <RoomCode code={view.code} />
      </div>

      <div className="lg:col-start-2 lg:row-span-4 lg:row-start-3">
        <PlayerList
          view={view}
          onToggleReady={lobby.toggleReady}
          allReady={canStart}
        />
      </div>

      <div className="lg:col-start-3 lg:row-start-3">
        <AvatarMaker />
      </div>

      <div className="lg:col-start-3 lg:row-span-3 lg:row-start-4">
        <HostSettings
          view={view}
          onToggleRole={lobby.toggleRole}
          onToggleLady={lobby.toggleLady}
        />
      </div>

      <div className="sl-bar -mx-4 lg:col-start-1 lg:row-start-4 lg:mx-0">
        <div className="lg:border-line lg:bg-surface flex flex-col gap-2.5 lg:rounded-lg lg:border lg:p-5">
          <div role="status" aria-live="polite">
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
                    <IconRing size={18} className="text-warning mt-0.5" />
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {canStart ? (
            <SoundLink
              href={paths.role("merlin")}
              cue="start"
              className="sl-btn sl-btn--primary sl-wake sl-seq w-full"
            >
              Start the game
              <IconArrowRight size={18} />
            </SoundLink>
          ) : (
            <button
              type="button"
              className="sl-btn sl-btn--primary w-full"
              disabled
            >
              Start the game
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-x-4 pb-6 lg:col-start-1 lg:row-start-5 lg:pb-0">
        <button
          type="button"
          className="sl-plain"
          onClick={lobby.simulateEveryoneReady}
        >
          Prototype: everyone ready
        </button>
        <button type="button" className="sl-plain" onClick={lobby.addGuest}>
          Prototype: someone joins
        </button>
        <button type="button" className="sl-plain" onClick={lobby.removeGuest}>
          Prototype: someone leaves
        </button>
      </div>
    </main>
  );
}
