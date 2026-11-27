import { useMemo, useRef, useState } from "react";
import { cssVars } from "@/client/css-vars";
import { lookSummary } from "@/client/avatar";
import type { RoomClient } from "@/client/room-client";
import { saveAvatar } from "@/client/use-avatar";
import { useWide } from "@/client/use-wide";
import {
  useStage,
  useStagePlayers,
  useStageSlot,
  useStageStore,
} from "@/components/stage/stage-context";
import type { TablePlayer } from "@/components/three/types";
import { IconArrowRight } from "@/components/ui/icons";
import { ConnectionStatus } from "@/components/room/connection-status";
import { OPTIONAL_ROLES, type OptionalRole } from "@/shared/roles";
import { avatarKey, type Avatar } from "@/shared/avatar";
import type { ProtocolError } from "@/shared/protocol";
import type { LobbyView } from "@/shared/views";
import { Disclosure } from "./disclosure";
import { HostSettings } from "./host-settings";
import { LobbyActions } from "./lobby-actions";
import { LookPicker } from "./look-picker";
import { PlayerList } from "./player-list";
import { RoomCode } from "./room-code";
import { playersSummary, settingsSummary } from "./summaries";

/** When the overlays rise in, if the camera is still flying here. */
const AFTER_FLIGHT_MS = 1700;

type Section = "players" | "settings";

/**
 * The lobby: the Star Table fills the screen, everyone who has joined stands
 * at it, and the room's information and settings sit over it in sections
 * that open and close. Everything comes from the room's `LobbyView`; every
 * change is a request to the room, which answers with a new view.
 */
export function LobbyScreen({
  view,
  client,
  error,
  online,
}: {
  view: LobbyView;
  client: RoomClient;
  error: ProtocolError | null;
  online: boolean;
}) {
  const isHost = view.you.isHost;
  const hostName = view.players.find((p) => p.isHost)?.name ?? "The host";
  const canStart = view.startBlockers.length === 0;

  const you = view.players.find((p) => p.id === view.you.id);
  const saved = you?.avatar ?? null;

  // The look picker. While it is open your figure wears the draft; nobody
  // else sees it until it is saved, once, when the picker closes. Until the
  // room answers, your figure keeps the look being saved.
  const [draft, setDraft] = useState<Avatar | null>(null);
  const [saving, setSaving] = useState<Avatar | null>(null);
  const picking = draft !== null;
  const closing = useRef(false);

  const openPicker = () => {
    if (saved) {
      closing.current = false;
      setDraft(saved);
    }
  };

  const closePicker = () => {
    // Done, Escape and a tap outside can land together: save once.
    if (closing.current || !draft) {
      return;
    }

    closing.current = true;
    setDraft(null);

    if (saved && avatarKey(draft) === avatarKey(saved)) {
      return;
    }

    setSaving(draft);
    void client.setAvatar(draft).then((ok) => {
      if (ok) {
        saveAvatar(draft);
      }

      setSaving(null);
    });
  };

  // The table's open space, claimed from the shared stage. The picker asks
  // for a close shot of your figure.
  const store = useStageStore();
  const stage = useStage();
  const focus = useRef<HTMLDivElement>(null);
  const [arriveAt] = useState(() =>
    store.getState().pending ? AFTER_FLIGHT_MS : 0,
  );

  useStageSlot(
    picking
      ? { mode: "lobby", reveal: "whole", fade: 0, shot: "portrait" }
      : { mode: "lobby", reveal: "whole", fade: 0 },
    focus,
  );
  const landed = stage.phase === "lobby";
  const yourLook = draft ?? saving;
  const shownLook = yourLook ?? saved;

  // Your figure rises once the camera has landed; everyone else is here.
  const players = useMemo<Array<TablePlayer>>(
    () =>
      view.players
        .filter((p) => landed || p.id !== view.you.id)
        .map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.id === view.you.id && yourLook ? yourLook : p.avatar,
          isHost: p.isHost,
          isYou: p.id === view.you.id,
          connected: p.connected,
          // The host has no ready, so the table lights the host's seat as
          // set: nobody waits on the host to ready up.
          ready: p.isHost || p.ready,
        })),
    [view.players, view.you.id, landed, yourLook],
  );

  useStagePlayers(players);

  // Sections start closed so the table shows; a wide screen has room to
  // open the player list. A section you open or close stays that way.
  const wide = useWide();
  const [chosen, setChosen] = useState<Partial<Record<Section, boolean>>>({});
  const open: Record<Section, boolean> = {
    players: chosen.players ?? wide,
    settings: chosen.settings ?? false,
  };
  // Read from the state the update starts from, not this render's.
  const toggle = (section: Section) => () =>
    setChosen((o) => {
      const isOpen = o[section] ?? (section === "players" ? wide : false);

      return { ...o, [section]: !isOpen };
    });

  const lead = isHost
    ? "Share the code. The game can start once everyone here is ready."
    : `You are at ${hostName}'s table. Get ready, and ${hostName} starts the game.`;
  const short = isHost
    ? "Friends type this code to join you."
    : `Get ready, and ${hostName} starts the game.`;
  const arrive = (extra: number) =>
    cssVars({ "--arrive-at": `${arriveAt + extra}ms` });

  const toggleRole = (role: OptionalRole) => {
    const on = view.settings.optionalRoles.includes(role);

    client.setSettings({
      ...view.settings,
      optionalRoles: OPTIONAL_ROLES.filter((r) =>
        r === role ? !on : view.settings.optionalRoles.includes(r),
      ),
    });
  };

  return (
    <main className="relative z-10 flex h-dvh flex-col overflow-hidden">
      <header
        className="sl-overlay-in px-4 pt-4 pr-32 lg:absolute lg:top-8 lg:left-8 lg:flex lg:flex-col lg:items-start lg:gap-5 lg:p-0"
        style={arrive(0)}
      >
        <div className="sl-over-scene min-w-0 lg:max-w-[30rem]">
          <p className="sl-eyebrow">The lobby</p>
          <h1 className="font-display mt-0.5 text-[1.75rem] leading-tight font-medium lg:text-5xl">
            Gather at the fire
          </h1>
          <p className="text-ink mt-1.5 hidden text-lg leading-relaxed lg:block">
            {lead}
          </p>
        </div>
        {wide ? <RoomCode code={view.code} /> : null}
        <ConnectionStatus
          online={online}
          className="mt-2 lg:mt-0 lg:self-start"
        />
      </header>

      {/* The table's place: the stage frames it here. */}
      <div
        ref={focus}
        data-stage-slot="lobby"
        className="absolute inset-x-0 top-[4.5rem] bottom-[24rem] lg:top-28 lg:right-[28rem] lg:bottom-0"
      />

      <section
        aria-label="Room"
        hidden={picking}
        className="sl-panel sl-overlay-in absolute inset-x-0 bottom-0 flex max-h-[78%] flex-col rounded-b-none border-b-0 lg:inset-x-auto lg:top-20 lg:right-6 lg:bottom-6 lg:max-h-none lg:w-[26rem] lg:rounded-b-[var(--corner-lg)] lg:border-b"
        style={arrive(140)}
      >
        {wide ? null : (
          <div className="flex items-center gap-3 px-4 pt-3">
            <RoomCode code={view.code} />
            <p className="text-ink-muted min-w-0 text-base leading-snug">
              {short}
            </p>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 lg:px-5 lg:pt-3">
          <Disclosure
            name="players"
            title="Around the fire"
            summary={playersSummary(view)}
            open={open.players}
            onToggle={toggle("players")}
          >
            <PlayerList
              view={view}
              allReady={canStart}
              onKick={isHost ? client.kick : undefined}
            />
          </Disclosure>
          <div className="sl-disclosure" data-section="look">
            <h2>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={picking}
                onClick={openPicker}
                className="sl-disclosure__summary"
              >
                <span className="flex min-w-0 flex-1 items-baseline gap-3">
                  <span className="font-display flex-none text-xl leading-tight font-medium">
                    Your look
                  </span>
                  <span className="text-ink-muted min-w-0 flex-1 truncate text-right text-base leading-snug">
                    {shownLook ? lookSummary(shownLook) : null}
                  </span>
                </span>
                <IconArrowRight size={20} className="flex-none" />
              </button>
            </h2>
          </div>
          <Disclosure
            name="settings"
            title={isHost ? "Host settings" : "Game settings"}
            summary={settingsSummary(view)}
            open={open.settings}
            onToggle={toggle("settings")}
          >
            <HostSettings
              view={view}
              onToggleRole={toggleRole}
              onToggleLady={() =>
                client.setSettings({
                  ...view.settings,
                  ladyOfTheLake: !view.settings.ladyOfTheLake,
                })
              }
              readOnly={!isHost}
            />
          </Disclosure>
        </div>

        <LobbyActions
          view={view}
          error={error}
          onReady={client.setReady}
          onStart={client.start}
          onLeave={client.leave}
        />
      </section>

      {draft ? (
        <LookPicker value={draft} onChange={setDraft} onClose={closePicker} />
      ) : null}
    </main>
  );
}
