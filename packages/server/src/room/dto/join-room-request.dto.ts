import { IsString, IsNotEmpty, MaxLength, MinLength } from "class-validator";

export class JoinRoomRequestDto {
	@IsString()
	@IsNotEmpty()
	@MinLength(1)
	@MaxLength(20)
	playerName!: string;
}
