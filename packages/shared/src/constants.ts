export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;
export const ROOM_CODE_LENGTH = 6;
// Uppercase alphanumeric, omitting visually ambiguous chars: 0 O 1 I L
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const MAX_NAME_LENGTH = 20;
export const IDLE_EVICTION_MS = 5 * 60_000;
export const READY_DEBOUNCE_MS = 150;

export const PLAYER_COUNT_TABLE: Record<number, { good: number; evil: number }> = {
  5:  { good: 3, evil: 2 },
  6:  { good: 4, evil: 2 },
  7:  { good: 4, evil: 3 },
  8:  { good: 5, evil: 3 },
  9:  { good: 6, evil: 3 },
  10: { good: 6, evil: 4 },
};
