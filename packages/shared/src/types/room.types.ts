// Room and player types shared between client and server.

export type PlayerStatus = 'not_ready' | 'ready' | 'disconnected';

export type CharacterName = 'PERCIVAL' | 'MORGANA' | 'MORDRED' | 'OBERON';

export interface GameSettings {
  characters: CharacterName[];
  ladyOfLake: boolean;
}

export interface Player {
  id: string;          // Stable opaque UUID — safe to broadcast to all clients
  socketId: string;    // Socket.io socket ID — internal only, never sent to clients
  name: string;        // Display name, max 20 chars
  isHost: boolean;
  status: PlayerStatus;
  joinedAt: number;    // Unix timestamp ms
}

export type RoomPhase = 'lobby' | 'in_progress';

export interface Room {
  code: string;
  hostSocketId: string;
  players: Map<string, Player>; // keyed by socket ID
  phase: RoomPhase;
  settings: GameSettings;
  createdAt: number;
  maxPlayers: number;  // 10
  minPlayers: number;  // 5
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  isHost: boolean;
  status: PlayerStatus;
  joinedAt: number;
}

export interface RoomSnapshot {
  code: string;
  phase: RoomPhase;
  players: PlayerSnapshot[];  // ordered by joinedAt ascending
  playerCount: number;
  canStart: boolean;          // playerCount >= 5 && all players ready (lobby only)
  isFull: boolean;            // playerCount >= 10
  settings: GameSettings;
}
