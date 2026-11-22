import { useCallback, useState } from "react";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  TEAM_BALANCE,
  isPlayerCount,
} from "@/shared/constants";
import { ROLES, type OptionalRole } from "@/shared/roles";
import type { LobbyView, StartBlocker } from "@/shared/views";
import { lobbyView } from "./mock";

/**
 * Local stand-in for the live lobby. Same shape the server will send, so a
 * prototype lobby screen only has to swap this hook for the real one.
 */
interface MockLobby {
  view: LobbyView;
  /** Toggle your own ready state. */
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
  const waiting = view.players.filter((p) => !p.ready).map((p) => p.id);

  if (away.length > 0) {
    blockers.push({ kind: "disconnected", playerIds: away });
  }

  if (waiting.length > 0) {
    blockers.push({ kind: "not_ready", playerIds: waiting });
  }

  const count = view.players.length;

  if (isPlayerCount(count)) {
    // The Assassin is always in, plus every Evil optional role switched on.
    const evilRoles =
      1 +
      view.settings.optionalRoles.filter(
        (role) => ROLES[role].alignment === "evil",
      ).length;
    const allowed = TEAM_BALANCE[count].evil;

    if (evilRoles > allowed) {
      blockers.push({ kind: "too_many_evil_roles", allowed });
    }
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
      .map((p, index) => ({ ...p, isHost: index === 0 }));
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

export function useMockLobby(options: MockLobbyOptions = {}): MockLobby {
  const [view, setView] = useState<LobbyView>(() => openingView(options));
  const arriveNext = useCallback(
    () =>
      setView((current) => {
        const next = missing(current)[0];

        if (!next || current.players.length >= MAX_PLAYERS) {
          return current;
        }

        return withBlockers({
          ...current,
          players: [...current.players, next],
        });
      }),
    [],
  );

  const withPlayers = (
    current: LobbyView,
    players: LobbyView["players"],
  ): LobbyView => withBlockers({ ...current, players });

  return {
    view,
    toArrive: missing(view).length,
    canStart: view.startBlockers.length === 0,
    arriveNext,
    toggleReady: () =>
      setView((current) =>
        withPlayers(
          current,
          current.players.map((p) =>
            p.id === current.you.id ? { ...p, ready: !p.ready } : p,
          ),
        ),
      ),
    toggleRole: (role) =>
      setView((current) => {
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
      setView((current) => ({
        ...current,
        settings: {
          ...current.settings,
          ladyOfTheLake: !current.settings.ladyOfTheLake,
        },
      })),
    simulateEveryoneReady: () =>
      setView((current) =>
        withPlayers(
          current,
          current.players.map((p) => ({ ...p, ready: true, connected: true })),
        ),
      ),
    addGuest: () =>
      setView((current) => {
        if (current.players.length >= MAX_PLAYERS) {
          return current;
        }

        const name = GUESTS.find(
          (n) => !current.players.some((p) => p.name === n),
        );

        if (!name) {
          return current;
        }

        return withPlayers(current, [
          ...current.players,
          {
            id: `p-guest-${name.toLowerCase()}`,
            name,
            isHost: false,
            connected: true,
            ready: false,
          },
        ]);
      }),
    removeGuest: () =>
      setView((current) => {
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
  };
}
