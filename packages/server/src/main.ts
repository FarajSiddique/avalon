import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
	// Fail fast before NestJS bootstraps if JWT_SECRET is absent.
	// ConfigService.getOrThrow() inside AuthModule provides the same guard at DI
	// init time, but this message fires before module wiring and is easier to see
	// in production logs.
	if (!process.env.JWT_SECRET) {
		console.error(
			"[bootstrap] FATAL: JWT_SECRET environment variable is not set. " +
				"Set it in .env (development) or your deployment config (production). " +
				"The server will not start without it.",
		);
		process.exit(1);
	}

	const app = await NestFactory.create(AppModule);
	app.useWebSocketAdapter(new IoAdapter(app));
	app.useGlobalPipes(
		new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
	);

	const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
	if (!process.env.CLIENT_ORIGIN) {
		console.warn(
			"[bootstrap] CLIENT_ORIGIN not set — falling back to http://localhost:5173 (development only)",
		);
	}

	app.enableCors({
		origin: clientOrigin,
		methods: ["GET", "POST"],
		credentials: true,
	});

	const port = process.env.PORT ?? 3000;
	await app.listen(port);
	console.log(`Avalon server running on http://localhost:${port}`);
}
bootstrap();
