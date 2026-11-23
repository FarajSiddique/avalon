/**
 * Checks on the host's settings against the seats at the table. Pure, and
 * shared so the prototype lobby and the room run the same rule. See
 * "Choosing roles for a game" in `.claude/rules/roles.md`.
 *
 * The settings are never refused when saved: seats change after the host
 * picks roles, so these run on every view instead.
 */

import { TEAM_BALANCE, isPlayerCount } from "./constants";
import { ROLES } from "./roles";
import type { GameSettings, StartBlocker } from "./views";

/** Fewer seats than this and the Lady of the Lake gets a settings hint. */
export const LADY_BEST_FROM = 7;

/** Evil roles the settings put in play: the Assassin plus every Evil optional role. */
export function evilRoleCount(settings: GameSettings): number {
  return (
    1 +
    settings.optionalRoles.filter((role) => ROLES[role].alignment === "evil")
      .length
  );
}

/**
 * The blocker when the settings ask for more Evil roles than the seats have
 * Evil places for. Null when they fit, or when there is no player count yet
 * (fewer than 5 seats is its own blocker).
 */
export function tooManyEvilRoles(
  playerCount: number,
  settings: GameSettings,
): Extract<StartBlocker, { kind: "too_many_evil_roles" }> | null {
  if (!isPlayerCount(playerCount)) {
    return null;
  }

  const allowed = TEAM_BALANCE[playerCount].evil;

  return evilRoleCount(settings) > allowed
    ? { kind: "too_many_evil_roles", allowed }
    : null;
}

/** Advice about the settings. Never stops Start. */
export type SettingsHint =
  | { kind: "lady_few_players"; bestFrom: number }
  | { kind: "percival_without_morgana" }
  | { kind: "morgana_without_percival" };

export function settingsHints(
  playerCount: number,
  settings: GameSettings,
): Array<SettingsHint> {
  const hints: Array<SettingsHint> = [];
  const percival = settings.optionalRoles.includes("percival");
  const morgana = settings.optionalRoles.includes("morgana");

  if (percival && !morgana) {
    hints.push({ kind: "percival_without_morgana" });
  }

  if (morgana && !percival) {
    hints.push({ kind: "morgana_without_percival" });
  }

  if (settings.ladyOfTheLake && playerCount < LADY_BEST_FROM) {
    hints.push({ kind: "lady_few_players", bestFrom: LADY_BEST_FROM });
  }

  return hints;
}
