import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	ConnectedSocket,
	OnGatewayConnection,
	OnGatewayDisconnect,
} from "@nestjs/websockets";
import { UseGuards, UsePipes, ValidationPipe, Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { LobbyErrorCode, Room, RoomSnapshot } from "@avalon/shared";
import { RoomService, LobbyException } from "../room/room.service";
import { WsGuard } from "../auth/ws.guard";
import { JwtPayload } from "../auth/jwt-payload.interface";

@WebSocketGateway({
	cors: { origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" },
})
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseGuards(WsGuard)
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server!: Server;

	private readonly logger = new Logger(GameGateway.name);

	/**
	 * Debounce tracker for player_ready events.
	 * Maps socketId → timestamp (ms) of last accepted event.
	 * Events arriving within READY_DEBOUNCE_MS of the previous one are silently dropped.
	 */
	private readonly readyLastEvent: Map<string, number> = new Map();
	private static readonly READY_DEBOUNCE_MS = 200;

	constructor(
		private readonly roomService: RoomService,
		private readonly wsGuard: WsGuard,
	) {}

	// -------------------------------------------------------------------------
	// Connection lifecycle
	// -------------------------------------------------------------------------

	async handleConnection(client: Socket): Promise<void> {
		const payload: JwtPayload | null =
			this.wsGuard.verifyHandshakeToken(client);

		if (!payload) {
			this.logger.warn({
				eventId: "WS_AUTH_FAILED",
				message: "WebSocket connection rejected — invalid or missing token",
				socketId: client.id,
			});
			client.emit("unauthorized", { message: "Invalid or missing token" });
			client.disconnect(true);
			return;
		}

		// Attach decoded identity to the socket so downstream guards and handlers
		// can read it from client.data.player without re-verifying the token.
		client.data.player = payload;

		// Link this socket ID to the player record that was created during the HTTP
		// join.  If linkSocket returns false the player no longer exists in the room
		// (token-valid-after-removal edge case), so we reject the connection.
		const linked = this.roomService.linkSocket(
			payload.sub,
			client.id,
			payload.roomCode,
		);

		if (!linked) {
			this.logger.warn({
				eventId: "WS_LINK_FAILED",
				message: "WebSocket connection rejected — player not found in room",
				socketId: client.id,
				payload: { playerId: payload.sub, roomCode: payload.roomCode },
			});
			client.emit("unauthorized", {
				message: "Player session not found. Please rejoin the room.",
			});
			client.disconnect(true);
			return;
		}

		// Subscribe the socket to the Socket.io room so broadcasts reach it.
		// Awaited — the in-memory adapter resolves synchronously, but the Redis adapter
		// is async. Not awaiting here would cause a race where broadcastRoomUpdate fires
		// before the socket has joined the room on the Redis adapter path.
		await client.join(payload.roomCode);

		const room = this.roomService.getRoom(payload.roomCode);
		if (room) {
			this.broadcastRoomUpdate(room);
		}

		this.logger.log({
			eventId: "WS_CONNECTED",
			message: "WebSocket client connected and authenticated",
			socketId: client.id,
			payload: { playerId: payload.sub, playerName: payload.playerName, roomCode: payload.roomCode },
		});
	}

	// -------------------------------------------------------------------------
	// player_ready
	// -------------------------------------------------------------------------

	@SubscribeMessage("player_ready")
	handlePlayerReady(@ConnectedSocket() client: Socket): void {
		// Debounce: ignore events arriving too quickly from the same socket
		const now = Date.now();
		const last = this.readyLastEvent.get(client.id) ?? 0;
		if (now - last < GameGateway.READY_DEBOUNCE_MS) {
			return;
		}
		this.readyLastEvent.set(client.id, now);

		try {
			const room = this.roomService.toggleReady(client.id);
			this.broadcastRoomUpdate(room);
		} catch (err) {
			if (err instanceof LobbyException) {
				this.emitError(client, err.code, err.message);
			} else {
				this.emitError(client, "INVALID_PAYLOAD", "Unexpected error while toggling ready state");
				this.logger.error({
					eventId: "PLAYER_READY_ERROR",
					message: "Unexpected error in player_ready handler",
					socketId: client.id,
					error: err,
				});
			}
		}
	}

	// -------------------------------------------------------------------------
	// disconnect (built-in Socket.io lifecycle)
	// -------------------------------------------------------------------------

	handleDisconnect(client: Socket): void {
		this.logger.log({
			eventId: "WS_DISCONNECTED",
			message: "WebSocket client disconnected",
			socketId: client.id,
		});

		// Always clean debounce state first — must NOT be guarded by room membership checks
		this.readyLastEvent.delete(client.id);

		const { room, wasLastPlayer } = this.roomService.removePlayer(client.id);

		if (wasLastPlayer || room === null) {
			// Room was deleted or socket was not in a room — nothing to broadcast
			return;
		}

		this.broadcastRoomUpdate(room);
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	private broadcastRoomUpdate(room: Room): void {
		const snapshot: RoomSnapshot = this.roomService.toSnapshot(room);
		this.server.to(room.code).emit("room_updated", snapshot);
	}

	private emitError(client: Socket, code: LobbyErrorCode, message: string): void {
		client.emit("error", { code, message });
	}
}
