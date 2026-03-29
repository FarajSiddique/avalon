# Backend Implementation: Ephemeral JWT Authentication

## Files Created

| File | Purpose |
|---|---|
| `src/auth/jwt-payload.interface.ts` | `JwtPayload` interface — `{ sub, roomCode, playerName }` |
| `src/auth/auth.module.ts` | Registers `JwtModule.registerAsync` with `ConfigService.getOrThrow("JWT_SECRET")`; exports `JwtModule` + `WsGuard` |
| `src/auth/ws.guard.ts` | Message-level `CanActivate` guard; also exposes `verifyHandshakeToken()` for use in `handleConnection` |
| `src/types/socket.d.ts` | Socket.io type augmentation — adds `data.player?: JwtPayload` to `Socket` |
| `src/room/dto/create-room-request.dto.ts` | `{ playerName }` — `@IsString @IsNotEmpty @MaxLength(20)` |
| `src/room/dto/join-room-request.dto.ts` | Same shape as above |
| `src/room/dto/join-room-response.dto.ts` | `{ token: string }` |
| `packages/server/.env.example` | Documents `JWT_SECRET` (required), `PORT`, `CLIENT_ORIGIN` |

## Files Modified

| File | Key Changes |
|---|---|
| `src/room/dto/create-room-response.dto.ts` | Added `token` field; constructor now `(code, token)` |
| `src/room/room.controller.ts` | `POST /rooms` accepts `CreateRoomRequestDto`, adds host via `addPlayer`, signs JWT, returns `{ code, token }`. New `POST /rooms/:code/join` endpoint — same pattern, returns `{ token }` |
| `src/room/room.module.ts` | Imports `AuthModule` |
| `src/room/room.service.ts` | Added `linkSocket(playerId, newSocketId, roomCode): boolean` — re-keys the players map entry from UUID placeholder to real socket ID when the socket connects |
| `src/game/game.gateway.ts` | Removed `join_room` handler. Added `handleConnection` with manual token verification via `WsGuard.verifyHandshakeToken()`, `linkSocket` call, and `client.join(roomCode)`. Added `@UseGuards(WsGuard)` to `handlePlayerReady`. All `console.log/error` replaced with `Logger` |
| `src/game/game.module.ts` | Imports `AuthModule` |
| `src/app.module.ts` | Imports `ConfigModule.forRoot({ isGlobal: true })` |
| `src/main.ts` | Pre-bootstrap `JWT_SECRET` check — calls `process.exit(1)` if unset |
| `package.json` | Added `@nestjs/config ^3.0.0` and `@nestjs/jwt ^10.0.0` to dependencies |

## Key Implementation Decisions

### UUID placeholder socketId at HTTP join time
`addPlayer()` is called during `POST /rooms` and `POST /rooms/:code/join` with a `randomUUID()` placeholder for `socketId`. When the socket connects in `handleConnection`, `linkSocket()` re-keys the `room.players` map from the placeholder to the real `socket.id` and updates `socketToRoom`. This keeps `RoomService` changes minimal — only one new method added.

### Dual verification (connection + message)
NestJS WebSocket guards only fire on message events, not on the connection lifecycle hook. `handleConnection` manually calls `WsGuard.verifyHandshakeToken()` to reject unauthenticated sockets at connect time. `@UseGuards(WsGuard)` on each handler provides defence-in-depth at the message level.

### Token-valid-after-removal protection
`handleConnection` calls `linkSocket()` which returns `false` if the `playerId` from the JWT is no longer in the room. The connection is rejected and the socket is disconnected. This handles the edge case where a player was removed between HTTP join and WebSocket connect.

### No @nestjs/passport
Manual `JwtService.verify()` is used throughout. Passport adds unnecessary complexity for a symmetric HS256 token with no strategy negotiation required.

## Deviations from Architecture

None. All constraints and design decisions from `02-architecture.md` were implemented as specified.
