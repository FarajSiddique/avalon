import type { Player } from '@avalon/shared';

export interface JwtPayload {
  sub: string;       // playerId
  roomCode: string;
  playerName: string;
}

export function buildJwtPayload(player: Player, roomCode: string): JwtPayload {
  return { sub: player.id, roomCode, playerName: player.name };
}
