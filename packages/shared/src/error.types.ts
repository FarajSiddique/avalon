export type LobbyErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_IN_PROGRESS'
  | 'NAME_TAKEN'
  | 'NOT_IN_ROOM'
  | 'NOT_HOST'
  | 'GAME_NOT_STARTABLE'
  | 'INVALID_PAYLOAD'
  | 'KICK_INVALID_TARGET';

export interface LobbyError {
  code: LobbyErrorCode;
  message: string;
}
