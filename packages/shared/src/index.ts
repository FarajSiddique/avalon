// @avalon/shared
// Shared TypeScript types, DTOs, and game constants used by both client and server.

export * from './types/room.types';
export * from './types/error.types';
export * from './dto/join-room.dto';
export * from './dto/player-ready.dto';

// Game constants
export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;
