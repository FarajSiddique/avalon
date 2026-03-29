export class CreateRoomResponseDto {
	code: string;
	token: string;

	constructor(code: string, token: string) {
		this.code = code;
		this.token = token;
	}
}
