/**
 * Setting up a game from the lobby. Phase 1 has the start blockers that
 * come from the settings; `rolesFor` joins them with the engine in Phase 2.
 */

import { tooManyEvilRoles } from "@/shared/settings";
import type { GameSettings, StartBlocker } from "@/shared/views";

/**
 * Why these settings cannot start with this many seats. Empty when they can.
 * Checked on every view, since seats change after the settings are saved.
 */
export function settingsBlockers(
  playerCount: number,
  settings: GameSettings,
): Array<StartBlocker> {
  const evil = tooManyEvilRoles(playerCount, settings);

  return evil ? [evil] : [];
}
