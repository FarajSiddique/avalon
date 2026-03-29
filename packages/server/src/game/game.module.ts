import { Module } from "@nestjs/common";
import { RoomModule } from "../room/room.module";
import { AuthModule } from "../auth/auth.module";
import { GameGateway } from "./game.gateway";

@Module({
	imports: [RoomModule, AuthModule],
	providers: [GameGateway],
})
export class GameModule {}
