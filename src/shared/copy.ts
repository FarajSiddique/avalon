/**
 * Player-facing sentences derived from view data. Kept here so every screen
 * words the same situation the same way.
 */

import type { LobbyView, PlayerId, StartBlocker } from "./views";

export function listNames(names: Array<string>): string {
  if (names.length <= 1) {
    return names[0] ?? "";
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function describeBlocker(
  blocker: StartBlocker,
  nameOf: (id: PlayerId) => string,
): string {
  switch (blocker.kind) {
    case "too_few_players":
      return blocker.needed === 1
        ? "One more player is needed."
        : `${blocker.needed} more players are needed.`;

    case "not_ready": {
      const names = blocker.playerIds.map(nameOf);

      return `Waiting for ${listNames(names)} to ready up.`;
    }

    case "disconnected": {
      const names = blocker.playerIds.map(nameOf);

      return `${listNames(names)} ${names.length === 1 ? "is" : "are"} away.`;
    }

    case "too_many_evil_roles":
      return `Too many Evil roles. This player count allows ${blocker.allowed}.`;
  }
}

/** Why the game cannot start yet, one sentence per reason. Empty when it can. */
export function startBlockerMessages(view: LobbyView): Array<string> {
  const nameOf = (id: PlayerId): string =>
    view.players.find((p) => p.id === id)?.name ?? "A player";

  return view.startBlockers.map((blocker) => describeBlocker(blocker, nameOf));
}
