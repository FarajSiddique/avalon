# Architecture: Lobby / Game Creation Backend

## 1. Overview

Complete backend architecture for the Lobby and Game Creation feature. Scope: NestJS server (`packages/server`) and shared type package (`packages/shared`). No frontend, no database, no auth.

System supports 5–10 players joining a shared in-memory room, toggling ready state, and receiving live broadcasts of room state changes. Server-authoritative and in-memory.

---

## 2. Component Design

### 2.1 Module Boundaries

```
AppModule
├── RoomModule       (HTTP: create / check rooms)
└── GameModule       (WebSocket: lobby events + future game events)
```

`GameModule` imports `RoomModule` (exports `RoomService`) so the Gateway can delegate all state mutations to `RoomService`. The Gateway never owns state.

### 2.2 Component Responsibilities

| Component | File | Responsibility |
|---|---|---|
| `AppModule` | `src/app.module.ts` | Root module, imports RoomModule and GameModule |
| `RoomModule` | `src/room/room.module.ts` | Declares RoomController, RoomService, exports RoomService |
| `RoomController` | `src/room/room.controller.ts` | HTTP handlers: POST /rooms, GET /rooms/:code, GET /health |
| `RoomService` | `src/room/room.service.ts` | In-memory Map, all state mutations, room code generation |
| `GameModule` | `src/game/game.module.ts` | Declares GameGateway, imports RoomModule |
| `GameGateway` | `src/game/game.gateway.ts` | WebSocket event handlers, broadcasts, disconnect cleanup |

`RoomService` is the single source of truth. The Gateway reads/writes state exclusively through `RoomService`. No `game.service.ts` or `game.machine.ts` in this ticket.

### 2.3 Dependency Injection Flow

```
GameGateway
  └── injects RoomService
        └── owns Map<string, Room>

RoomController
  └── injects RoomService
        └── same singleton instance
```

---

## 3. Data Model

All types live in `packages/shared/src/` and exported from `packages/shared/src/index.ts`.

### 3.1 Core Types

```typescript
// packages/shared/src/types/room.types.ts

export type PlayerStatus = 'not_ready' | 'ready';

export interface Player {
  id: string;           // Socket.io socket ID
  name: string;         // Display name, max 20 chars
  isHost: boolean;      // True for the player who created the room
  status: PlayerStatus;
  joinedAt: number;     // Unix timestamp ms
}

export type RoomPhase = 'lobby';

export interface Room {
  code: string;
  hostSocketId: string;
  players: Map<string, Player>; // keyed by socket ID
  phase: RoomPhase;
  createdAt: number;
  maxPlayers: number;   // Always 10
  minPlayers: number;   // Always 5
}
```

### 3.2 Wire Format (Snapshots)

```typescript
export interface PlayerSnapshot {
  id: string;
  name: string;
  isHost: boolean;
  status: PlayerStatus;
  joinedAt: number;
}

export interface RoomSnapshot {
  code: string;
  phase: RoomPhase;
  players: PlayerSnapshot[];  // Array, ordered by joinedAt ascending
  playerCount: number;
  canStart: boolean;          // playerCount >= 5 && all players ready
  isFull: boolean;            // playerCount >= 10
}
```

`RoomSnapshot` is the payload of every `room_updated` broadcast. Clients never see raw `Room`.

### 3.3 Error Types

```typescript
// packages/shared/src/types/error.types.ts

export type LobbyErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_IN_PROGRESS'
  | 'NAME_TAKEN'
  | 'ALREADY_IN_ROOM'
  | 'NOT_IN_ROOM'
  | 'INVALID_PAYLOAD';

export interface LobbyError {
  code: LobbyErrorCode;
  message: string;
}
```

---

## 4. HTTP API

### POST /rooms — Create room

**Request:** No body.

**Response 201:**
```json
{ "code": "AX4B9K" }
```

**Response 503** (code generation failure — extremely unlikely):
```json
{ "statusCode": 503, "message": "Could not generate a unique room code. Please try again." }
```

### GET /rooms/:code — Check joinability

**Response 200** (exists + joinable):
```json
{ "code": "AX4B9K", "joinable": true, "playerCount": 3, "isFull": false, "phase": "lobby" }
```

**Response 200** (exists + full):
```json
{ "code": "AX4B9K", "joinable": false, "playerCount": 10, "isFull": true, "phase": "lobby" }
```

**Response 404** (not found):
```json
{ "statusCode": 404, "message": "Room not found." }
```

Always returns 200 for existing rooms regardless of joinability (prevents HTTP status timing oracle).

### GET /health

```json
{ "status": "ok" }
```

---

## 5. WebSocket API

Default namespace `/`. Players identified by `socket.id`.

### join_room (Client → Server)

**DTO:**
```typescript
export class JoinRoomDto {
  @IsString() @Length(6, 6) @Matches(/^[A-Z0-9]{6}$/)
  roomCode: string;

  @IsString() @Length(1, 20) @Matches(/^[a-zA-Z0-9 _\-]+$/)
  playerName: string;
}
```

**Server actions:** validate room exists + joinable + name unique → add player → `socket.join(roomCode)` → broadcast `room_updated`.

**Success (emitted to joining socket only):**
```
Event: 'join_room_ack'  →  { success: true, room: RoomSnapshot }
```

**Errors (emitted to joining socket only):**
```
Event: 'error'  →  { code: LobbyErrorCode, message: string }
```
Possible codes: `ROOM_NOT_FOUND`, `ROOM_FULL`, `ROOM_IN_PROGRESS`, `NAME_TAKEN`, `ALREADY_IN_ROOM`, `INVALID_PAYLOAD`

**Host detection:** First player to `join_room` a code (zero existing players) becomes `isHost: true`.

### player_ready (Client → Server)

**DTO:** Empty class — no payload. Player identified by `socket.id`.

**Server actions:** Toggle `player.status` (`not_ready ↔ ready`) → broadcast `room_updated`.

**Error:** `{ code: 'NOT_IN_ROOM', message: '...' }`

### room_updated (Server → All players, broadcast)

```
Event: 'room_updated'  →  RoomSnapshot
```

Triggered by: player join, player leave (disconnect), ready toggle. Full snapshot every time (no diffs — max 10 players).

### disconnect (Socket.io built-in)

Gateway implements `OnGatewayDisconnect`. On disconnect: remove player from room → if room empty delete it → if host left promote next-oldest player → broadcast `room_updated` to remaining players.

---

## 6. RoomService Interface

```typescript
@Injectable()
export class RoomService {
  private rooms: Map<string, Room>;
  private socketToRoom: Map<string, string>;  // Reverse lookup: socketId → roomCode

  createRoom(): string
  getRoom(code: string): Room | undefined
  isJoinable(code: string): boolean            // exists && lobby && playerCount < 10
  addPlayer(code: string, socketId: string, name: string): Player
  removePlayer(socketId: string): { room: Room | null; wasLastPlayer: boolean }
  toggleReady(socketId: string): Room
  getRoomBySocket(socketId: string): Room | undefined
  toSnapshot(room: Room): RoomSnapshot
}
```

**Room code generation:** 6-char uppercase alphanumeric from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (ambiguous chars O, 0, 1, I excluded). 10-retry loop. 32^6 ≈ 1.07B combinations.

**`removePlayer()` host promotion:** On host disconnect, promote player with lowest `joinedAt` among remaining players to `isHost: true` and update `hostSocketId`.

**`toSnapshot()` — `canStart` logic:**
```typescript
canStart: players.length >= 5 && players.every(p => p.status === 'ready')
```
Lives exclusively in the service — client uses this field for UI only.

**Critical invariant:** `socketToRoom` and `Room.players` must never diverge. Only `addPlayer()` writes both; only `removePlayer()` deletes both. Gateway never touches these maps directly.

---

## 7. File Layout

```
packages/
├── shared/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── types/
│       │   ├── room.types.ts        # Player, Room, PlayerSnapshot, RoomSnapshot, RoomPhase
│       │   └── error.types.ts       # LobbyErrorCode, LobbyError
│       └── dto/
│           ├── join-room.dto.ts     # JoinRoomDto
│           └── player-ready.dto.ts  # PlayerReadyDto (empty class)
│
└── server/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── main.ts
        ├── app.module.ts
        ├── room/
        │   ├── room.module.ts
        │   ├── room.controller.ts
        │   ├── room.service.ts
        │   └── dto/
        │       ├── create-room-response.dto.ts
        │       └── room-status-response.dto.ts
        └── game/
            ├── game.module.ts
            └── game.gateway.ts
```

---

## 8. Security Considerations

| Concern | Mitigation |
|---|---|
| Input injection | Global `ValidationPipe({ whitelist: true })` + `@UsePipes` on Gateway class |
| Room enumeration | Rate limit `GET /rooms/:code` — 10 req/min per IP via `@nestjs/throttler` |
| Name spoofing | Case-insensitive name uniqueness enforced per room in `addPlayer()` |
| `player_ready` broadcast storms | 200ms debounce per socket in Gateway |
| Memory leaks | Delete room when last player disconnects; optional TTL cleanup interval |
| CORS | `CLIENT_ORIGIN` env var in production; wildcard in dev only |
| ValidationPipe on WebSocket | Explicitly add `@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))` to Gateway class — global pipes may not apply to WS handlers |

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Memory leak from abandoned rooms | Medium | Medium | Delete on last disconnect + TTL cleanup |
| Room code collision | Very Low | Low | 10-retry loop; ~1B codes; single-threaded safety |
| Host disconnects mid-lobby | Medium | High | Deterministic promotion: oldest remaining player by `joinedAt` |
| `socketToRoom` diverges from `Room.players` | Low | High | Only mutated inside `addPlayer`/`removePlayer` — never directly in Gateway |
| ValidationPipe not applied to WS | Medium | Medium | Explicit `@UsePipes` on Gateway |

---

## 10. Sequence: Room Creation → Join → Ready

```
Host                  RoomController        RoomService
  |-- POST /rooms ------->|                     |
  |                       |-- createRoom() ----->|-- Map.set("AX4B9K", Room{})
  |<-- 201 { code } ------|                     |
  |                       |                     |
  |== WebSocket connect ==========================|
  |-- join_room { roomCode, playerName } -------->|-- addPlayer() → isHost: true
  |<-- join_room_ack { room: RoomSnapshot } -------|
  |<-- room_updated (broadcast to room) ----------|
  |                       |                     |
  |-- player_ready --------------------------------|-- toggleReady()
  |<-- room_updated (broadcast) ------------------|
```
