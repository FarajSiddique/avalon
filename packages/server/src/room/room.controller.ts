import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Logger,
	NotFoundException,
	Param,
	Post,
	UseGuards,
} from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "crypto";
import { RoomService, LobbyException } from "./room.service";
import { CreateRoomRequestDto } from "./dto/create-room-request.dto";
import { CreateRoomResponseDto } from "./dto/create-room-response.dto";
import { JoinRoomRequestDto } from "./dto/join-room-request.dto";
import { JoinRoomResponseDto } from "./dto/join-room-response.dto";
import { JwtPayload } from "../auth/jwt-payload.interface";
import { Player, RoomSnapshot } from "@avalon/shared";

@Controller()
export class RoomController {
	private readonly logger = new Logger(RoomController.name);

	constructor(
		private readonly roomService: RoomService,
		private readonly jwtService: JwtService,
	) {}

	// GET /health — Railway health check probe
	@Get("health")
	@HttpCode(HttpStatus.OK)
	health(): { status: string } {
		return { status: "ok" };
	}

	/**
	 * GET /rooms/:code
	 * Returns the room snapshot (players, phase, canStart, etc.).
	 * Throws 404 if the room does not exist.
	 */
	@Get("rooms/:code")
	@HttpCode(HttpStatus.OK)
	getRoom(@Param("code") code: string): RoomSnapshot {
		const upperCode = code.toUpperCase();
		const room = this.roomService.getRoom(upperCode);
		if (!room) {
			throw new NotFoundException(`Room "${upperCode}" not found`);
		}
		return this.roomService.toSnapshot(room);
	}

	/**
	 * POST /rooms
	 * Creates a new room and registers the requesting player as the host.
	 * Returns the room code and a signed JWT for the host to use when connecting
	 * via WebSocket.
	 */
	@Post("rooms")
	@HttpCode(HttpStatus.CREATED)
	@UseGuards(ThrottlerGuard)
	@Throttle({ default: { limit: 5, ttl: 60000 } })
	create(@Body() dto: CreateRoomRequestDto): CreateRoomResponseDto {
		const code = this.roomService.createRoom();

		// Add the host with a UUID placeholder socketId.  The real socket ID is linked
		// in GameGateway.handleConnection once the client opens the WS connection.
		// Using a UUID (rather than "") prevents key collisions when multiple players
		// join the same room via HTTP before any of them connects via WebSocket.
		const placeholderSocketId = randomUUID();
		let player: Player;

		try {
			player = this.roomService.addPlayer(
				code,
				placeholderSocketId,
				dto.playerName,
			);
		} catch (err) {
			if (err instanceof LobbyException) {
				this.logger.error({
					eventId: "CREATE_ROOM_ADD_PLAYER_FAILED",
					message: "addPlayer failed after room creation",
					payload: { code, error: err.code },
				});
			}
			throw err;
		}

		// TO-DO shared utility to create JWTPayload
		const jwtPayload: JwtPayload = {
			sub: player.id,
			roomCode: code,
			playerName: player.name,
		};
		const token = this.jwtService.sign(jwtPayload);

		this.logger.log({
			eventId: "ROOM_CREATED",
			message: "Room created",
			payload: { code, playerId: player.id, playerName: player.name },
		});

		return new CreateRoomResponseDto(code, token);
	}

	/**
	 * POST /rooms/:code/join
	 * Validates that a room is joinable, adds the player, and returns a signed JWT.
	 * The client must present this token when establishing the WebSocket connection.
	 */
	@Post("rooms/:code/join")
	@HttpCode(HttpStatus.CREATED)
	@UseGuards(ThrottlerGuard)
	@Throttle({ default: { limit: 10, ttl: 60000 } })
	join(
		@Param("code") code: string,
		@Body() dto: JoinRoomRequestDto,
	): JoinRoomResponseDto {
		const upperCode = code.toUpperCase();

		// Same UUID placeholder pattern as POST /rooms — prevents key collisions.
		const placeholderSocketId = randomUUID();

		let player: Player;

		try {
			player = this.roomService.addPlayer(
				upperCode,
				placeholderSocketId,
				dto.playerName,
			);
		} catch (err) {
			if (err instanceof LobbyException) {
				this.logger.warn({
					eventId: "JOIN_ROOM_FAILED",
					message: "Player could not join room",
					payload: { code: upperCode, error: err.code },
				});
			}
			throw err;
		}

		const jwtPayload: JwtPayload = {
			sub: player.id,
			roomCode: upperCode,
			playerName: player.name,
		};
		const token = this.jwtService.sign(jwtPayload);

		this.logger.log({
			eventId: "ROOM_JOINED",
			message: "Player joined room via HTTP",
			payload: {
				code: upperCode,
				playerId: player.id,
				playerName: player.name,
			},
		});

		return new JoinRoomResponseDto(token);
	}
}
