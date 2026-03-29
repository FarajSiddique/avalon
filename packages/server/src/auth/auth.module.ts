import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { WsGuard } from "./ws.guard";

@Module({
	imports: [
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				secret: config.getOrThrow<string>("JWT_SECRET"),
				signOptions: { expiresIn: "4h" },
			}),
		}),
	],
	providers: [WsGuard],
	exports: [JwtModule, WsGuard],
})
export class AuthModule {}
