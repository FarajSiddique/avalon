# Backend Implementation: Lobby / Game Creation

## Files Created / Modified

### packages/shared

| File | Action | Description |
|---|---|---|
| `packages/shared/src/types/room.types.ts` | Created | `Player`, `Room`, `PlayerSnapshot`, `RoomSnapshot`, `PlayerStatus`, `RoomPhase` |
| `packages/shared/src/types/error.types.ts` | Created | `LobbyErrorCode` union, `LobbyError` interface |
| `packages/shared/src/dto/join-room.dto.ts` | Created | `JoinRoomDto` with class-validator decorators |
| `packages/shared/src/dto/player-ready.dto.ts` | Created | `PlayerReadyDto` (empty class) |
| `packages/shared/src/index.ts` | Modified | Barrel re-exports + `MIN_PLAYERS`, `MAX_PLAYERS` constants |
| `packages/shared/package.json` | Modified | Added `class-validator ^0.14.0` |
| `packages/shared/tsconfig.json` | Modified | Added `emitDecoratorMetadata`, `experimentalDecorators` |

### packages/server

| File | Action | Description |
|---|---|---|
| `packages/server/src/main.ts` | Created/Modified | NestJS bootstrap per spec |
| `packages/server/src/app.module.ts` | Created/Modified | Imports RoomModule, GameModule |
| `packages/server/src/room/room.module.ts` | Modified | Added ThrottlerModule, exports RoomService |
| `packages/server/src/room/room.controller.ts` | Modified | POST /rooms, GET /rooms/:code (throttled), GET /health |
| `packages/server/src/room/room.service.ts` | Modified | Full implementation with all state mutation methods |
| `packages/server/src/room/dto/create-room-response.dto.ts` | Created | `{ code: string }` |
| `packages/server/src/room/dto/room-status-response.dto.ts` | Created | `RoomStatusResponseDto` |
| `packages/server/src/game/game.module.ts` | Modified | Imports RoomModule, declares GameGateway |
| `packages/server/src/game/game.gateway.ts` | Modified | Full WebSocket implementation |
| `packages/server/package.json` | Modified | Added `@nestjs/throttler`, `class-transformer`, `class-validator` |

## Key Implementation Decisions

1. **`LobbyException`** — typed error subclass in `RoomService` carrying `LobbyErrorCode`, allows Gateway to re-emit structured errors without string matching
2. **Host detection** — first player to call `join_room` on a room with zero players becomes host; no host socket ID stored at HTTP creation time
3. **`player_ready` debounce** — 200ms per-socket debounce tracked in `Map<string, number>` in Gateway to prevent broadcast storms
4. **`toSnapshot()` owns `canStart`** — computed as `playerCount >= 5 && all ready`; lives exclusively in `RoomService`
5. **`@UsePipes`** on Gateway class (not just globally) — ensures ValidationPipe applies to all WebSocket message handlers
6. **`ThrottlerGuard`** on `GET /rooms/:code` — 10 req/min per IP via `@nestjs/throttler`
7. **Host promotion** — on host disconnect, oldest remaining player (lowest `joinedAt`) promoted; room deleted if last player disconnects
8. **`socketToRoom` invariant** — only mutated inside `addPlayer()`/`removePlayer()`, never directly in Gateway

## Deviations from Architecture

None. All files match the architecture exactly.
