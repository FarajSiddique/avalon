import {
	CanActivate,
	ExecutionContext,
	Injectable,
	Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";
import { JwtPayload } from "./jwt-payload.interface";

@Injectable()
export class WsGuard implements CanActivate {
	private readonly logger = new Logger(WsGuard.name);

	constructor(private readonly jwtService: JwtService) {}

	canActivate(context: ExecutionContext): boolean {
		const client: Socket = context.switchToWs().getClient<Socket>();

		const payload = client.data.player as JwtPayload | undefined;

		if (!payload) {
			this.logger.warn({
				eventId: "WS_GUARD_REJECTED",
				message: "Guard rejected message — no decoded payload on socket",
				socketId: client.id,
			});
			client.emit("unauthorized", { message: "Authentication required" });
			client.disconnect(true);
			return false;
		}

		return true;
	}

	/**
	 * Extracts and verifies a JWT token from a socket's handshake.
	 * Returns the decoded payload on success, or null on failure.
	 * Intended for use in handleConnection before the guard lifecycle runs.
	 */
	verifyHandshakeToken(client: Socket): JwtPayload | null {
		const token = this.extractToken(client);
		if (!token) {
			return null;
		}

		let payload: JwtPayload;
		try {
			payload = this.jwtService.verify<JwtPayload>(token);
		} catch {
			return null;
		}

		// Runtime validation of custom claims — the TypeScript interface provides no
		// runtime enforcement; a crafted or legacy token with a valid signature but
		// missing fields must be rejected here before it reaches any handler.
		if (
			typeof payload.sub !== "string" || !payload.sub ||
			typeof payload.roomCode !== "string" || !payload.roomCode ||
			typeof payload.playerName !== "string" || !payload.playerName
		) {
			return null;
		}

		return payload;
	}

	private extractToken(client: Socket): string | null {
		// Support both Authorization header and auth object sent via socket.io handshake
		const authHeader =
			client.handshake.headers?.authorization ??
			(client.handshake.auth as Record<string, unknown>)?.token;

		if (typeof authHeader !== "string") {
			return null;
		}

		if (authHeader.startsWith("Bearer ")) {
			return authHeader.slice(7);
		}

		// Plain token (passed via socket.io auth object: { token: "..." })
		return authHeader;
	}
}
