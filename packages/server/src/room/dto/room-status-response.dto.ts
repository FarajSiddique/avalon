export class RoomStatusResponseDto {
  code: string;
  joinable: boolean;
  reason?: string;

  constructor(code: string, joinable: boolean, reason?: string) {
    this.code = code;
    this.joinable = joinable;
    if (reason !== undefined) {
      this.reason = reason;
    }
  }
}
