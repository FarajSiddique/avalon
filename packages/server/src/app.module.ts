import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RoomModule } from "./room/room.module";
import { GameModule } from "./game/game.module";
import { HealthModule } from "./health/health.module";

@Module({
	imports: [
		// ConfigModule must be registered globally so ConfigService is available
		// everywhere, including inside AuthModule.JwtModule.registerAsync.
		ConfigModule.forRoot({ isGlobal: true }),
		RoomModule,
		GameModule,
		HealthModule,
	],
})
export class AppModule {}
