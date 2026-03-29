export interface JwtPayload {
	/** Player UUID — stable, safe to broadcast */
	sub: string;
	/** Room code the player joined via HTTP */
	roomCode: string;
	/** Display name chosen at join time */
	playerName: string;
}

export function buildJwtPayload(
	playerId: string,
	roomCode: string,
	playerName: string,
): JwtPayload {
	return { sub: playerId, roomCode, playerName };
}
