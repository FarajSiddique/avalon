import { useMockLobby } from "@/design/use-mock-lobby";
import { startBlockerMessages } from "@/shared/copy";
import { DialogBox } from "../ui/panel";
import { SceneFooter } from "../ui/scene-footer";
import { HostSettings } from "./host-settings";
import { PlayerList } from "./player-list";
import { RoomCode } from "./room-code";
import { StartBar } from "./start-bar";

export function LobbyScreen() {
  const lobby = useMockLobby();
  const { view } = lobby;
  const me = view.players.find((player) => player.id === view.you.id);

  return (
    <>
      <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col gap-8 px-4 pt-6 pb-[230px] lg:grid lg:max-w-[1360px] lg:grid-cols-[340px_minmax(0,1fr)_420px] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-10 lg:gap-y-10 lg:px-10 lg:pt-10 lg:pb-12">
        <h1 className="sr-only">Lobby for room {view.code}</h1>

        <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-1">
          <RoomCode code={view.code} />
          <DialogBox speaker="Herald" className="p-4 pt-6">
            <p>Share the code. The vigil begins when every knight is ready.</p>
          </DialogBox>
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <PlayerList view={view} />
        </div>

        <div className="lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <HostSettings
            view={view}
            onToggleRole={lobby.toggleRole}
            onToggleLady={lobby.toggleLady}
          />
        </div>

        <div className="lg:col-start-1 lg:row-start-2">
          <StartBar
            ready={me?.ready ?? false}
            canStart={lobby.canStart}
            reasons={startBlockerMessages(view)}
            onToggleReady={lobby.toggleReady}
            onEveryoneReady={lobby.simulateEveryoneReady}
          />
        </div>
      </main>
      <SceneFooter />
    </>
  );
}
