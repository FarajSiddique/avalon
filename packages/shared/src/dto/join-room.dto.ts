import { IsString, Length, Matches } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^[A-Z0-9]{6}$/, { message: 'roomCode must be 6 uppercase alphanumeric characters' })
  roomCode!: string;

  @IsString()
  @Length(1, 20)
  @Matches(/^[a-zA-Z0-9 _\-]+$/, { message: 'playerName contains invalid characters' })
  playerName!: string;
}
