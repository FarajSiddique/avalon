// Lobby error codes and shape shared between client and server.

export type LobbyErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_IN_PROGRESS'
  | 'NAME_TAKEN'
  | 'ALREADY_IN_ROOM'
  | 'NOT_IN_ROOM'
  | 'INVALID_PAYLOAD';

export interface LobbyError {
  code: LobbyErrorCode;
  message: string;
}
