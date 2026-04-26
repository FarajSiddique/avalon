export type PlayerStatus = 'not_ready' | 'ready' | 'disconnected';
export type OptionalCharacter = 'PERCIVAL' | 'MORGANA' | 'MORDRED' | 'OBERON';
export type RoomPhase = 'lobby' | 'in_progress';

export interface GameSettings {
  characters: OptionalCharacter[];
  ladyOfLake: boolean;
}

// Server-side player record — never sent to clients directly
export interface Player {
  id: string;
  socketId: string | null;
  name: string;
  isHost: boolean;
  status: PlayerStatus;
  joinedAt: number;
}

// Server-side room record — never sent to clients directly
export interface Room {
  code: string;
  hostPlayerId: string;
  players: Map<string, Player>;
  phase: RoomPhase;
  settings: GameSettings;
  createdAt: number;
  // non-null only while the room is host-only; cleared on first non-host join
  idleEvictAt: number | null;
}

// Safe client-facing projection of a Player
export interface PlayerSnapshot {
  id: string;
  name: string;
  isHost: boolean;
  status: PlayerStatus;
  joinedAt: number;
}

// Safe client-facing projection of a Room
export interface RoomSnapshot {
  code: string;
  phase: RoomPhase;
  players: PlayerSnapshot[];
  playerCount: number;
  settings: GameSettings;
  canStart: boolean;
}
