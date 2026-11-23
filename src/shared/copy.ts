/**
 * Player-facing sentences derived from view data. Kept here so every screen
 * words the same situation the same way.
 */

import type { RoomClosedReason } from "./protocol";
import { evilRoleCount, settingsHints, type SettingsHint } from "./settings";
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
  view: LobbyView,
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

    case "too_many_evil_roles": {
      const over = evilRoleCount(view.settings) - blocker.allowed;

      return `Too many Evil roles. ${view.players.length} players have ${blocker.allowed} Evil seats and the Assassin takes one, so switch off ${over} Evil ${over === 1 ? "role" : "roles"}.`;
    }
  }
}

/** Why the game cannot start yet, one sentence per reason. Empty when it can. */
export function startBlockerMessages(view: LobbyView): Array<string> {
  const nameOf = (id: PlayerId): string =>
    view.players.find((p) => p.id === id)?.name ?? "A player";

  return view.startBlockers.map((blocker) =>
    describeBlocker(blocker, view, nameOf),
  );
}

function describeHint(hint: SettingsHint): string {
  switch (hint.kind) {
    case "percival_without_morgana":
      return "Percival without Morgana sees Merlin for certain. They work best together.";
    case "morgana_without_percival":
      return "Morgana without Percival has no one to fool. They work best together.";
    case "lady_few_players":
      return `The Lady of the Lake is best with ${hint.bestFrom} or more players.`;
  }
}

/** Advice about the settings, one sentence each. Never stops Start. */
export function settingsHintMessages(view: LobbyView): Array<string> {
  return settingsHints(view.players.length, view.settings).map(describeHint);
}

/** The start blockers that come from the settings, for the host settings list. */
export function settingsBlockerMessages(view: LobbyView): Array<string> {
  return view.startBlockers
    .filter((blocker) => blocker.kind === "too_many_evil_roles")
    .map((blocker) => describeBlocker(blocker, view, () => "A player"));
}

/** What a browser shows when the room closes for it. */
export function closedMessage(reason: RoomClosedReason | null): string {
  switch (reason) {
    case "kicked":
      return "The host removed you from this room. You can join again.";
    case "left":
      return "You left the room.";
    case "expired":
    case "not_found":
    case null:
      return "This room does not exist or has ended.";
  }
}
