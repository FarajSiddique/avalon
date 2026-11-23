import { MAX_PLAYERS } from "@/shared/constants";
import { ROLES } from "@/shared/roles";
import type { LobbyView } from "@/shared/views";

/*
 * Each lobby section, closed, says its state in a few words: the canvas and
 * the name tags are decorative, so these carry the same news in text.
 */

/** "7 of 10, 5 ready, 1 away". The host has no ready, so is not counted. */
export function playersSummary(view: LobbyView): string {
  const ready = view.players.filter(
    (p) => !p.isHost && p.connected && p.ready,
  ).length;
  const away = view.players.filter((p) => !p.connected).length;
  const parts = [`${view.players.length} of ${MAX_PLAYERS}`, `${ready} ready`];

  if (away > 0) {
    parts.push(`${away} away`);
  }

  return parts.join(", ");
}

/** "Percival, Morgana, Lady of the Lake", or "No extra roles". */
export function settingsSummary(view: LobbyView): string {
  const roles = view.settings.optionalRoles.map((role) => ROLES[role].name);
  const parts = [roles.length ? roles.join(", ") : "No extra roles"];

  if (view.settings.ladyOfTheLake) {
    parts.push("Lady of the Lake");
  }

  return parts.join(", ");
}
