import { useState } from "react";
import { TEAM_BALANCE, isPlayerCount } from "@/shared/constants";
import { ROLES, type OptionalRole } from "@/shared/roles";
import type { LobbyView, StartBlocker } from "@/shared/views";
import { lobbyView } from "./mock";

/**
 * Local stand-in for the live lobby. Same shape the server will send, so a
 * prototype lobby screen only has to swap this hook for the real one.
 */
export interface MockLobby {
  view: LobbyView;
  /** Toggle your own ready state. */
  toggleReady: () => void;
  /** Host: switch an optional role on or off. */
  toggleRole: (role: OptionalRole) => void;
  /** Host: switch the Lady of the Lake on or off. */
  toggleLady: () => void;
  /** Prototype helper: everyone comes back and readies up, so Start enables. */
  simulateEveryoneReady: () => void;
  canStart: boolean;
}

/** The same checks the server will run, so the prototype behaves like the game. */
function blockersFor(view: LobbyView): StartBlocker[] {
  const blockers: StartBlocker[] = [];
  const away = view.players.filter((p) => !p.connected).map((p) => p.id);
  const waiting = view.players.filter((p) => !p.ready).map((p) => p.id);
  if (away.length > 0) blockers.push({ kind: "disconnected", playerIds: away });
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

function withBlockers(view: LobbyView): LobbyView {
  return { ...view, startBlockers: blockersFor(view) };
}

export function useMockLobby(): MockLobby {
  const [view, setView] = useState<LobbyView>(lobbyView);

  const withPlayers = (
    current: LobbyView,
    players: LobbyView["players"],
  ): LobbyView => withBlockers({ ...current, players });

  return {
    view,
    canStart: view.startBlockers.length === 0,
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
  };
}
