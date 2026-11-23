import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { noSnapshot, noSubscription } from "@/client/no-subscription";
import { play } from "@/client/sound";
import { avatarFor, lookSummary } from "@/client/avatar";
import { designPaths } from "@/design/directions";
import { useAvatar } from "@/client/use-avatar";
import { useMockLobby } from "@/design/use-mock-lobby";
import { startBlockerMessages } from "@/shared/copy";
import type { LobbySearch } from "../../lobby";
import { cssVars } from "@/client/css-vars";
import { IconArrowRight, IconCheck, IconRing } from "@/components/ui/icons";
import { SoundLink } from "../sound-link";
import {
  useStage,
  useStagePlayers,
  useStageSlot,
} from "@/components/stage/stage-context";
import type { TablePlayer } from "@/components/three/types";
import { AvatarMaker } from "./avatar-maker";
import { Disclosure } from "./disclosure";
import { HostSettings } from "./host-settings";
import { PlayerList } from "./player-list";
import { RoomCode } from "./room-code";
import { playersSummary, settingsSummary } from "./summaries";

const paths = designPaths();

/** Seconds between friends arriving in a new room (prototype). */
const ARRIVAL_MS = 1300;
/** When the overlays rise in, if the camera is still flying here. */
const AFTER_FLIGHT_MS = 1700;

type Section = "players" | "look" | "settings";

const WIDE = "(min-width: 1024px)";

/** A wide screen, read after hydration (the server renders the phone's). */
function useWide(): boolean {
  return useSyncExternalStore(
    (change) => {
      const query = window.matchMedia(WIDE);

      query.addEventListener("change", change);

      return () => query.removeEventListener("change", change);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

/**
 * While `filling`, the next friend arrives after a pause. Each arrival
 * changes `count`, which gives a new subscription and so the next timer.
 */
function useArrivals(
  filling: boolean,
  count: number,
  arrive: () => void,
): void {
  const wait = useCallback(() => {
    const timer = window.setTimeout(
      arrive,
      count === 1 ? ARRIVAL_MS * 1.4 : ARRIVAL_MS,
    );

    return () => window.clearTimeout(timer);
  }, [count, arrive]);

  useSyncExternalStore(filling ? wait : noSubscription, noSnapshot, noSnapshot);
}

/**
 * The lobby: the Star Table fills the screen, everyone who has joined stands
 * at it, and the room's information and settings sit over it in sections
 * that open and close. Arriving from the landing, the camera flies in: from
 * above when you create the room, in from the trees when you join one.
 */
export function LobbyScreen({ via, name, code }: LobbySearch) {
  const lobby = useMockLobby({ via, name, code });
  const { view, canStart } = lobby;
  const reasons = startBlockerMessages(view);
  const isHost = view.you.isHost;
  const hostName = view.players.find((p) => p.isHost)?.name ?? "The host";

  // The table's open space, claimed from the shared stage.
  const stage = useStage();
  const focus = useRef<HTMLDivElement>(null);

  useStageSlot({ mode: "lobby", reveal: "whole", fade: 0 }, focus);
  const [arriveAt] = useState(() => (stage.pending ? AFTER_FLIGHT_MS : 0));
  const landed = stage.phase === "lobby";

  // Your figure rises once the camera has landed; everyone else is already
  // here (joining) or arrives one by one (a new room).
  const yours = useAvatar();
  const players = useMemo<Array<TablePlayer>>(
    () =>
      view.players
        .filter((p) => landed || p.id !== view.you.id)
        .map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.id === view.you.id ? yours : avatarFor(p.id),
          isHost: p.isHost,
          isYou: p.id === view.you.id,
          connected: p.connected,
          // The host has no ready, so the table lights the host's seat as
          // set: nobody waits on the host to ready up.
          ready: p.isHost || p.ready,
        })),
    [view.players, view.you.id, yours, landed],
  );

  useStagePlayers(players);

  const { arriveNext } = lobby;
  const filling = via === "create" && landed && lobby.toArrive > 0;
  const count = view.players.length;

  useArrivals(filling, count, arriveNext);

  // Sections start closed so the table shows; a wide screen has room to
  // open the player list. A section you open or close stays that way.
  const wide = useWide();
  const [chosen, setChosen] = useState<Partial<Record<Section, boolean>>>({});
  const open: Record<Section, boolean> = {
    players: chosen.players ?? wide,
    look: chosen.look ?? false,
    settings: chosen.settings ?? false,
  };
  const toggle = (section: Section) => () =>
    setChosen((o) => ({ ...o, [section]: !open[section] }));

  const you = view.players.find((p) => p.id === view.you.id);
  const youReady = you?.ready ?? false;
  const lead =
    via === "join"
      ? `You are at ${hostName}'s table. Get ready, and ${hostName} starts the game.`
      : via === "create"
        ? "Your room is open. Share the code and friends appear at the table."
        : "Share the code. The game can start once everyone here is ready.";
  const short =
    via === "join"
      ? `Get ready, and ${hostName} starts the game.`
      : "Friends type this code to join you.";
  const arrive = (extra: number) =>
    cssVars({ "--arrive-at": `${arriveAt + extra}ms` });

  return (
    <main
      className="relative z-10 flex h-[calc(100dvh-2.75rem)] flex-col overflow-hidden"
      data-via={via ?? "host"}
    >
      <header
        className="sl-overlay-in px-4 pt-4 pr-32 lg:absolute lg:top-8 lg:left-8 lg:flex lg:flex-col lg:items-start lg:gap-5 lg:p-0"
        style={arrive(0)}
      >
        <div className="sl-over-scene min-w-0 lg:max-w-[30rem]">
          <p className="sl-eyebrow">
            {via === "join" ? "You joined" : "The lobby"}
          </p>
          <h1 className="font-display mt-0.5 text-[1.75rem] leading-tight font-medium lg:text-5xl">
            Gather at the fire
          </h1>
          <p className="text-ink mt-1.5 hidden text-lg leading-relaxed lg:block">
            {lead}
          </p>
        </div>
        <div className="hidden lg:block">
          <RoomCode code={view.code} />
        </div>
      </header>

      {/* The table's place: the stage frames it here. */}
      <div
        ref={focus}
        data-stage-slot="lobby"
        className="absolute inset-x-0 top-[4.5rem] bottom-[24rem] lg:top-28 lg:right-[28rem] lg:bottom-0"
      />

      <section
        aria-label="Room"
        className="sl-panel sl-overlay-in absolute inset-x-0 bottom-0 flex max-h-[78%] flex-col rounded-b-none border-b-0 lg:inset-x-auto lg:top-6 lg:right-6 lg:bottom-6 lg:max-h-none lg:w-[26rem] lg:rounded-b-[var(--corner-lg)] lg:border-b"
        style={arrive(140)}
      >
        <div className="flex items-center gap-3 px-4 pt-3 lg:hidden">
          <RoomCode code={view.code} />
          <p className="text-ink-muted min-w-0 text-base leading-snug">
            {short}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 lg:px-5 lg:pt-3">
          <Disclosure
            name="players"
            title="Around the fire"
            summary={playersSummary(view)}
            open={open.players}
            onToggle={toggle("players")}
          >
            <PlayerList view={view} allReady={canStart} />
            <div className="mt-3 flex flex-wrap gap-x-4">
              <button
                type="button"
                className="sl-plain"
                onClick={lobby.simulateEveryoneReady}
              >
                Prototype: everyone ready
              </button>
              <button
                type="button"
                className="sl-plain"
                onClick={lobby.addGuest}
              >
                Prototype: someone joins
              </button>
              <button
                type="button"
                className="sl-plain"
                onClick={lobby.removeGuest}
              >
                Prototype: someone leaves
              </button>
            </div>
          </Disclosure>
          <Disclosure
            name="look"
            title="Your look"
            summary={lookSummary(yours)}
            open={open.look}
            onToggle={toggle("look")}
          >
            <AvatarMaker />
          </Disclosure>
          <Disclosure
            name="settings"
            title={isHost ? "Host settings" : "Game settings"}
            summary={settingsSummary(view)}
            open={open.settings}
            onToggle={toggle("settings")}
          >
            <HostSettings
              view={view}
              onToggleRole={lobby.toggleRole}
              onToggleLady={lobby.toggleLady}
              readOnly={!isHost}
            />
          </Disclosure>
        </div>

        <div className="border-line flex flex-col gap-2.5 border-t px-4 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] lg:px-5 lg:pb-5">
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
          <div className="flex gap-2.5">
            {/* The host has no ready: pressing Start is the host's ready. */}
            {isHost ? null : (
              <button
                type="button"
                aria-pressed={youReady}
                onClick={() => {
                  play(youReady ? "unready" : "ready");
                  lobby.toggleReady();
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
            )}
            {isHost ? (
              canStart ? (
                <SoundLink
                  href={paths.role("merlin")}
                  cue="start"
                  className="sl-btn sl-btn--primary sl-wake sl-seq flex-1"
                >
                  Start
                  <IconArrowRight size={18} />
                </SoundLink>
              ) : (
                <button
                  type="button"
                  className="sl-btn sl-btn--primary flex-1"
                  disabled
                >
                  Start
                </button>
              )
            ) : (
              <p className="text-ink-muted flex flex-1 items-center text-base leading-snug">
                {hostName} starts the game.
              </p>
            )}
          </div>
          {!isHost && canStart ? (
            <SoundLink
              href={paths.role("merlin")}
              cue="start"
              className="sl-plain self-center"
            >
              Prototype: the host starts
            </SoundLink>
          ) : null}
        </div>
      </section>
    </main>
  );
}
