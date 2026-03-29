import { IsString, IsNotEmpty, MaxLength, MinLength } from "class-validator";

export class CreateRoomRequestDto {
	@IsString()
	@IsNotEmpty()
	@MinLength(1)
	@MaxLength(20)
	playerName!: string;
}
