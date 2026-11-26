import { useState, useSyncExternalStore } from "react";
import type { StoreApi } from "zustand/vanilla";
import { createDevStore } from "@/client/dev-store";
import { play } from "@/client/sound";
import { avatarFor } from "@/shared/avatar";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/shared/constants";
import type { OptionalRole } from "@/shared/roles";
import { tooManyEvilRoles } from "@/shared/settings";
import type { LobbyView, StartBlocker } from "@/shared/views";
import { lobbyView } from "./mock";

/**
 * Local stand-in for the live lobby. Same shape the server will send, so a
 * prototype lobby screen only has to swap this hook for the real one.
 */
interface MockLobby {
  view: LobbyView;
  /** Toggle your own ready state. Does nothing for the host, who has none. */
  toggleReady: () => void;
  /** Host: switch an optional role on or off. */
  toggleRole: (role: OptionalRole) => void;
  /** Host: switch the Lady of the Lake on or off. */
  toggleLady: () => void;
  /** Prototype helper: everyone comes back and readies up, so Start enables. */
  simulateEveryoneReady: () => void;
  /** Prototype helper: someone new joins (up to the table's ten seats). */
  addGuest: () => void;
  /** Prototype helper: the most recent guest leaves. */
  removeGuest: () => void;
  /** A new room fills up: the next of the usual players arrives. */
  arriveNext: () => void;
  /** How many of the usual players have not arrived yet. */
  toArrive: number;
  canStart: boolean;
}

interface MockLobbyOptions {
  /** "create": you host a new, empty room. "join": you are a guest. */
  via?: "create" | "join";
  /** Your name, as typed on the landing. */
  name?: string;
  /** The code you typed to join. */
  code?: string;
}

/** The same checks the server will run, so the prototype behaves like the game. */
function blockersFor(view: LobbyView): Array<StartBlocker> {
  const blockers: Array<StartBlocker> = [];

  if (view.players.length < MIN_PLAYERS) {
    blockers.push({
      kind: "too_few_players",
      needed: MIN_PLAYERS - view.players.length,
    });
  }

  const away = view.players.filter((p) => !p.connected).map((p) => p.id);
  // The host has no ready: pressing Start is the host's ready.
  const waiting = view.players
    .filter((p) => !p.isHost && !p.ready)
    .map((p) => p.id);

  if (away.length > 0) {
    blockers.push({ kind: "disconnected", playerIds: away });
  }

  if (waiting.length > 0) {
    blockers.push({ kind: "not_ready", playerIds: waiting });
  }

  // The same rule the room runs, against the seats there are now.
  const evil = tooManyEvilRoles(view.players.length, view.settings);

  if (evil) {
    blockers.push(evil);
  }

  return blockers;
}

/** Prototype guests, one long name among them to test the name tags. */
const GUESTS = ["Elowen", "Maximilliana", "Rowan", "Tamsin"] as const;

function withBlockers(view: LobbyView): LobbyView {
  return { ...view, startBlockers: blockersFor(view) };
}

/** The usual players who have not arrived yet. */
function missing(current: LobbyView): LobbyView["players"] {
  return lobbyView.players.filter(
    (usual) => !current.players.some((p) => p.id === usual.id),
  );
}

/** The lobby as it opens, for how you got here. */
export function openingView({ via, name, code }: MockLobbyOptions): LobbyView {
  const youId = lobbyView.you.id;
  const named = lobbyView.players.map((p) =>
    p.id === youId && name ? { ...p, name } : p,
  );

  if (via === "create") {
    // A new room: only you, the host, until friends type the code.
    return withBlockers({
      ...lobbyView,
      players: named.filter((p) => p.id === youId),
    });
  }

  if (via === "join") {
    // Someone else's room: the first of them hosts, and you arrive last.
    const others = named
      .filter((p) => p.id !== youId)
      .map((p, index) =>
        index === 0 ? { ...p, isHost: true, ready: false } : p,
      );
    const you = named.find((p) => p.id === youId);

    if (!you) {
      return lobbyView;
    }

    return withBlockers({
      ...lobbyView,
      code: code ?? lobbyView.code,
      players: [...others, { ...you, isHost: false, ready: false }],
      you: { id: youId, isHost: false },
    });
  }

  return withBlockers({ ...lobbyView, players: named });
}

function withPlayers(
  current: LobbyView,
  players: LobbyView["players"],
): LobbyView {
  return withBlockers({ ...current, players });
}

/** Nothing stands in the way of Start. */
function canStartIn(view: LobbyView): boolean {
  return view.startBlockers.length === 0;
}

type MockLobbyActions = Omit<MockLobby, "view" | "toArrive" | "canStart">;

/** One mounted lobby: its state and the actions that change it. */
interface MockLobbyInstance {
  store: StoreApi<LobbyView>;
  actions: MockLobbyActions;
}

/**
 * One lobby's state, in a store of its own. The moment the last blocker
 * clears, the table plays one chord: the store hears every change, so the
 * chord comes from the change itself. A lobby that opens able to start has
 * not changed, so it stays quiet.
 */
function createMockLobby(options: MockLobbyOptions): MockLobbyInstance {
  const store = createDevStore<LobbyView>("mock-lobby", () =>
    openingView(options),
  );

  store.subscribe((next, prev) => {
    if (canStartIn(next) && !canStartIn(prev)) {
      play("all-ready");
    }
  });

  const update = (change: (current: LobbyView) => LobbyView) =>
    store.setState(change, true);

  return {
    store,
    actions: {
      arriveNext: () =>
        update((current) => {
          const next = missing(current)[0];

          if (!next || current.players.length >= MAX_PLAYERS) {
            return current;
          }

          return withBlockers({
            ...current,
            players: [...current.players, next],
          });
        }),
      toggleReady: () =>
        update((current) =>
          current.you.isHost
            ? current
            : withPlayers(
                current,
                current.players.map((p) =>
                  p.id === current.you.id ? { ...p, ready: !p.ready } : p,
                ),
              ),
        ),
      toggleRole: (role) =>
        update((current) => {
          const on = current.settings.optionalRoles.includes(role);

          return withBlockers({
            ...current,
            settings: {
              ...current.settings,
              optionalRoles: on
                ? current.settings.optionalRoles.filter((r) => r !== role)
                : [...current.settings.optionalRoles, role],
            },
          });
        }),
      toggleLady: () =>
        update((current) => ({
          ...current,
          settings: {
            ...current.settings,
            ladyOfTheLake: !current.settings.ladyOfTheLake,
          },
        })),
      simulateEveryoneReady: () =>
        update((current) =>
          withPlayers(
            current,
            current.players.map((p) => ({
              ...p,
              ready: !p.isHost,
              connected: true,
            })),
          ),
        ),
      addGuest: () =>
        update((current) => {
          if (current.players.length >= MAX_PLAYERS) {
            return current;
          }

          const name = GUESTS.find(
            (n) => !current.players.some((p) => p.name === n),
          );

          if (!name) {
            return current;
          }

          const id = `p-guest-${name.toLowerCase()}`;

          return withPlayers(current, [
            ...current.players,
            {
              id,
              name,
              isHost: false,
              connected: true,
              ready: false,
              avatar: avatarFor(id),
            },
          ]);
        }),
      removeGuest: () =>
        update((current) => {
          const last = [...current.players]
            .reverse()
            .find((p) => p.id.startsWith("p-guest-"));

          if (!last) {
            return current;
          }

          return withPlayers(
            current,
            current.players.filter((p) => p.id !== last.id),
          );
        }),
    },
  };
}

/**
 * The lobby for this screen, from how you got here. The options are read
 * once, when the screen mounts. The actions keep their identity.
 */
export function useMockLobby(options: MockLobbyOptions = {}): MockLobby {
  const [{ store, actions }] = useState(() => createMockLobby(options));
  const view = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getInitialState,
  );

  return {
    ...actions,
    view,
    toArrive: missing(view).length,
    canStart: canStartIn(view),
  };
}
