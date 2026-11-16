import { useMockLobby } from "@/design/use-mock-lobby";
import { startBlockerMessages } from "@/shared/copy";
import { HostSettings } from "./host-settings";
import { PlayerRoster } from "./player-roster";
import { RoomCodeNote } from "./room-code-note";
import { StartDock } from "./start-dock";

/**
 * The lobby as the host sees it. On a phone it is one column with the Start
 * area fixed at the bottom; on a wide screen it is three columns.
 */
export function LobbyScreen() {
  const lobby = useMockLobby();
  const { view } = lobby;
  const you = view.players.find((player) => player.id === view.you.id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-6 lg:grid lg:max-w-7xl lg:grid-cols-[21rem_minmax(0,1fr)_25rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-8 lg:gap-y-6 lg:px-10 lg:py-10">
      <div className="lg:col-start-1 lg:row-start-1">
        <h1 className="ember-carved text-accent-strong mb-4 text-xl lg:text-2xl">
          The gathering
        </h1>
        <RoomCodeNote code={view.code} />
      </div>
      <PlayerRoster
        view={view}
        className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
      />
      {view.you.isHost ? (
        <HostSettings
          view={view}
          onToggleRole={lobby.toggleRole}
          onToggleLady={lobby.toggleLady}
          className="lg:col-start-3 lg:row-span-2 lg:row-start-1"
        />
      ) : null}
      <StartDock
        blockers={startBlockerMessages(view)}
        canStart={lobby.canStart}
        youReady={you?.ready ?? false}
        onToggleReady={lobby.toggleReady}
        onSimulateReady={lobby.simulateEveryoneReady}
        className="sticky bottom-0 z-10 -mx-4 mt-auto lg:static lg:col-start-1 lg:row-start-2 lg:mx-0 lg:mt-0"
      />
    </main>
  );
}
