"use client";

import { useState } from "react";
import type { OptionalRole } from "@/shared/roles";
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

function blockersFor(players: LobbyView["players"]): StartBlocker[] {
  const blockers: StartBlocker[] = [];
  const away = players.filter((p) => !p.connected).map((p) => p.id);
  const waiting = players.filter((p) => !p.ready).map((p) => p.id);
  if (away.length > 0) blockers.push({ kind: "disconnected", playerIds: away });
  if (waiting.length > 0) {
    blockers.push({ kind: "not_ready", playerIds: waiting });
  }
  return blockers;
}

export function useMockLobby(): MockLobby {
  const [view, setView] = useState<LobbyView>(lobbyView);

  const withPlayers = (
    current: LobbyView,
    players: LobbyView["players"],
  ): LobbyView => ({
    ...current,
    players,
    startBlockers: blockersFor(players),
  });

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
        return {
          ...current,
          settings: {
            ...current.settings,
            optionalRoles: on
              ? current.settings.optionalRoles.filter((r) => r !== role)
              : [...current.settings.optionalRoles, role],
          },
        };
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
