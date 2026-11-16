"use client";

import Link from "next/link";
import { designPaths } from "@/design/directions";
import { useMockLobby } from "@/design/use-mock-lobby";
import { startBlockerMessages } from "@/shared/copy";
import { IconArrowRight, IconCheck, IconRing } from "../icons";
import { HostSettings } from "./host-settings";
import { PlayerList } from "./player-list";
import { RoomCode } from "./room-code";

const paths = designPaths("starlit");

/** The lobby as the host sees it. */
export function LobbyScreen() {
  const lobby = useMockLobby();
  const { view, canStart } = lobby;
  const reasons = startBlockerMessages(view);

  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-4 px-4 pt-6 lg:grid lg:flex-none lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,27rem)] lg:grid-rows-[auto_auto_auto_1fr] lg:items-start lg:gap-6 lg:px-8 lg:pt-10 lg:pb-12">
      <header className="lg:col-span-3">
        <p className="sl-eyebrow">The lobby</p>
        <h1 className="font-display mt-1 text-[2rem] leading-tight font-medium lg:text-5xl">
          Gather at the fire
        </h1>
        <p className="text-ink-muted mt-1.5 max-w-[34rem] text-[1.0625rem] leading-relaxed">
          Share the code. The game can start once everyone here is ready.
        </p>
      </header>

      <div className="lg:col-start-1 lg:row-start-2">
        <RoomCode code={view.code} />
      </div>

      <div className="lg:col-start-2 lg:row-span-3 lg:row-start-2">
        <PlayerList view={view} onToggleReady={lobby.toggleReady} />
      </div>

      <div className="lg:col-start-3 lg:row-span-3 lg:row-start-2">
        <HostSettings
          view={view}
          onToggleRole={lobby.toggleRole}
          onToggleLady={lobby.toggleLady}
        />
      </div>

      <div className="sl-bar -mx-4 lg:col-start-1 lg:row-start-3 lg:mx-0">
        <div className="lg:border-line lg:bg-surface flex flex-col gap-2.5 lg:rounded-lg lg:border lg:p-5">
          <div role="status" aria-live="polite">
            {canStart ? (
              <p className="text-success flex items-center gap-2 text-base font-bold">
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
            <Link
              href={paths.role("merlin")}
              className="sl-btn sl-btn--primary w-full"
            >
              Start the game
              <IconArrowRight size={18} />
            </Link>
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

      <div className="flex justify-center pb-6 lg:col-start-1 lg:row-start-4 lg:pb-0">
        <button
          type="button"
          className="sl-plain"
          onClick={lobby.simulateEveryoneReady}
        >
          Prototype: everyone ready
        </button>
      </div>
    </main>
  );
}
