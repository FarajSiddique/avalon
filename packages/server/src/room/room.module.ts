import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { RoomController } from "./room.controller";
import { RoomService } from "./room.service";
import { AuthModule } from "../auth/auth.module";

@Module({
	imports: [
		ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
		AuthModule,
	],
	controllers: [RoomController],
	providers: [RoomService],
	exports: [RoomService],
})
export class RoomModule {}
