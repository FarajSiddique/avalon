/**
 * Game constants. Source of truth for the tables in `.claude/rules/game-rules.md`.
 * Pure data and pure helpers only. No runtime dependencies.
 */

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;

export type PlayerCount = 5 | 6 | 7 | 8 | 9 | 10;

export function isPlayerCount(n: number): n is PlayerCount {
  return Number.isInteger(n) && n >= MIN_PLAYERS && n <= MAX_PLAYERS;
}

/** How many Good and Evil players there are at each player count. */
export const TEAM_BALANCE: Readonly<
  Record<PlayerCount, { readonly good: number; readonly evil: number }>
> = {
  5: { good: 3, evil: 2 },
  6: { good: 4, evil: 2 },
  7: { good: 4, evil: 3 },
  8: { good: 5, evil: 3 },
  9: { good: 6, evil: 3 },
  10: { good: 6, evil: 4 },
};

export const QUEST_COUNT = 5;
export const QUESTS_TO_WIN = 3;
/** Five rejected team proposals in a row hand the game to Evil. */
export const MAX_REJECTIONS = 5;

export type QuestSizes = readonly [number, number, number, number, number];

/** Team size for quests 1 to 5 at each player count. */
export const QUEST_TEAM_SIZES: Readonly<Record<PlayerCount, QuestSizes>> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

/**
 * Fail cards needed to fail a quest. The 4th quest (index 3) needs two Fail
 * cards in games with 7 or more players. Every other quest needs one.
 */
export function failsRequired(
  playerCount: PlayerCount,
  questIndex: number,
): 1 | 2 {
  return playerCount >= 7 && questIndex === 3 ? 2 : 1;
}

/** Room codes: 4 letters. No vowels (no accidental words), no I, L or O. */
export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_ALPHABET = "BCDFGHJKMNPQRSTVWXZ";
export const ROOM_CODE_PATTERN = new RegExp(
  `^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`,
);

/** Player names: 1 to 16 characters, letters and digits in any script. */
export const NAME_MAX_LENGTH = 16;
export const NAME_PATTERN = /^[\p{L}\p{N}](?:[\p{L}\p{N} _'-]*[\p{L}\p{N}])?$/u;

/** Trim and collapse inner whitespace. Run this before validating a name. */
export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Normalize what a player typed into a room code field. */
export function normalizeRoomCode(raw: string): string {
  return raw.replace(/[^a-zA-Z]/g, "").toUpperCase();
}

/** A room with nobody connected is deleted after this long. */
export const EMPTY_ROOM_TTL_MS = 10 * 60_000;
/** Hard cap on room lifetime. */
export const ROOM_MAX_AGE_MS = 12 * 60 * 60_000;
