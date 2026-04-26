# Avalon — Lobby & Pre-Game Endpoints Plan

## Context

This plan covers **only the lobby/pre-game surface**: room creation, player join, settings management, ready-up, host-initiated start, and the lifecycle events that bracket all of that. Game-phase logic (XState machine, role assignment, voting, quests) is downstream and explicitly out of scope here.

Goal: a server-authoritative HTTP + WebSocket contract good enough that the client can be built against a documented API, and end-to-end tested with curl + a WS client before the game machine lands.

---

## Locked Decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Create flow | HTTP creates room → server returns `{ roomCode, playerToken }` → client opens WS using the token |
| 2 | Identity | Short-lived signed JWT per player (`sub=playerId`, `roomCode`, `playerName`) |
| 3 | Ready-state lifecycle | **Sticky** — never auto-resets on settings change, join, or leave |
| 4 | Host disconnect | Room is **destroyed immediately**; all players notified and disconnected |
| 5 | Settings validation | Shape-only at `update_settings`; player-count game-rule validation at `start_game` |
| 6 | Player names | Unique case-insensitive within a room, 1–20 chars, `[A-Za-z0-9 _-]` |
| 7 | Host ready | Host has the same ready toggle as everyone; `start_game` requires all (incl. host) ready |
| 8 | Idle eviction | If a room has only the host (no other connected players) for **5 min**, GC it. Once a non-host has ever joined, the timer is cancelled for the room's lifetime |
| 9 | Non-host disconnect | Seat is held **indefinitely** (status: `disconnected`); host can `kick_player`; `start_game` blocks until every seat is connected + ready |

### Implications worth flagging

- Sticky ready + held seats → `start_game` MUST validate every player is *currently connected AND ready*, not just that the stored `status` flag is `'ready'`. Otherwise the host could start with a phantom-ready disconnected player.
- Host-only-timer cancels permanently after the first non-host join. If everyone but the host leaves later, the room sits open until the host disconnects (which destroys it). Acceptable.
- Settings validation deferred to `start_game` means `update_settings` only checks payload structure. `start_game` is the single chokepoint that runs all game-rule validation.

---

## HTTP Endpoints (RoomController)

### `POST /rooms` — Create room
Body:
```ts
{ playerName: string }   // 1–20 chars, [A-Za-z0-9 _-]
```
Response 201:
```ts
{ roomCode: string, playerToken: string }
```
Effects:
- Generate unique 6-char `roomCode` (uppercase alphanumeric, exclude `0/O/1/I/L`; retry on collision).
- Create `Room` in lobby phase with default settings (`{ characters: [], ladyOfLake: false }`).
- Create the creator as the host `Player` (`isHost: true`, `status: 'not_ready'`, `socketId: null`).
- Sign JWT `{ sub: playerId, roomCode, playerName }`, ~4h expiry.
- Start the host-only-eviction timer.

Errors: `400 INVALID_PAYLOAD`.

### `POST /rooms/:code/join` — Join existing room
Body:
```ts
{ playerName: string }
```
Response 200:
```ts
{ playerToken: string }
```
Validation (in order):
- Room exists → `404 ROOM_NOT_FOUND`
- Room phase is `lobby` → `409 ROOM_IN_PROGRESS`
- `playerCount < MAX_PLAYERS` → `409 ROOM_FULL`
- Name not taken (case-insensitive) → `409 NAME_TAKEN`

Effects: create `Player` (`isHost: false`, `status: 'not_ready'`, `socketId: null`), sign JWT, return token. **First successful join cancels the host-only-eviction timer permanently.**

Note: this is the **claim** step — the player exists in the room before the WS connects. The WS handshake links the socket to this player record.

### `GET /rooms/:code` — Public probe
Response 200:
```ts
{ exists: boolean, joinable: boolean }
```
Used by the client's "is this code real" check before showing the join form. Does **not** leak player names, settings, or anything else.

### `GET /health`
Returns `{ status: 'ok' }`. For Railway's health check.

---

## WebSocket Events

The WS handshake requires a `token` in `auth.token` (or `Authorization` header — pick one and document). `WsGuard` verifies and attaches `JwtPayload` to `client.data.user`.

1. Verify JWT, extract `{ sub, roomCode }`.
2. Look up the player record. If missing → emit `error` with `NOT_IN_ROOM`, disconnect.
3. If player already has a live `socketId`, treat as reconnect: disconnect the old socket first, then bind the new one.
4. Set `socketId` on the player, mark them connected (`status` stays whatever it was — sticky).
5. Broadcast `room_updated` to the room.

### `handleDisconnect`
1. Find player by `socketId`.
2. If host → destroy room: broadcast `room_destroyed`, disconnect every socket in the room, delete the `Room`.
3. Else → set `status: 'disconnected'`, clear `socketId`, broadcast `room_updated`.

### Client → Server (`@SubscribeMessage`)

| Event | Payload | Authorization | Effect |
|---|---|---|---|
| `update_settings` | `{ characters: OptionalCharacter[], ladyOfLake: boolean }` | host only, lobby phase only | Shape-validate (subset of `OptionalCharacter`, no duplicates, boolean), update `room.settings`, broadcast `room_updated` |
| `player_ready` | — | any player | Toggle current player's status between `'ready'` and `'not_ready'`, broadcast `room_updated`. Debounce per-socket (~150ms) to absorb rapid clicks |
| `kick_player` | `{ playerId: string }` | host only, lobby phase only, target ≠ host | Remove the player record. If target has a live socket, emit `kicked` to it then disconnect. Broadcast `room_updated` |
| `start_game` | — | host only, lobby phase only | Run all preconditions (below). On success: set phase `'in_progress'`, broadcast `phase_changed`, hand off to GameService (stub for now) |

#### `start_game` preconditions (single-source-of-truth game-rule check)
- `playerCount` between 5 and 10 inclusive
- Every player is **currently connected** (`socketId != null`) AND `status === 'ready'`
- `settings.characters` is a valid optional-character set for `playerCount`:
  - max evil count from CLAUDE.md table is respected (`assassin_count(=1) + len(evilOptionals) <= maxEvil(playerCount)`)
  - characters is a subset of `{PERCIVAL, MORGANA, MORDRED, OBERON}` with no duplicates
- (No Percival-without-Morgana enforcement — the rules call this a recommendation, not a constraint.)

Any failure → emit `error` with `GAME_NOT_STARTABLE` and a message naming the specific failure. No phase change.

### Server → Client

| Event | Delivery | Payload |
|---|---|---|
| `room_updated` | room broadcast | `RoomSnapshot` |
| `error` | per-socket | `{ code: LobbyErrorCode, message: string }` |
| `kicked` | target socket | `{ reason: 'kicked_by_host' }` (sent right before disconnect) |
| `room_destroyed` | room broadcast | `{ reason: 'host_disconnected' \| 'idle_eviction' }` |
| `phase_changed` | room broadcast | `{ phase: 'in_progress' }` (lobby plan stops here) |

---

## Shared Domain Types (`@avalon/shared`)

New files under `packages/shared/src/`:

- `constants.ts` — `MIN_PLAYERS = 5`, `MAX_PLAYERS = 10`, `ROOM_CODE_LENGTH = 6`, `ROOM_CODE_ALPHABET`, `MAX_NAME_LENGTH = 20`, `IDLE_EVICTION_MS = 5 * 60_000`, `READY_DEBOUNCE_MS = 150`, `PLAYER_COUNT_TABLE` (good/evil per count from CLAUDE.md).
- `room.types.ts`:
  ```ts
  type PlayerStatus = 'not_ready' | 'ready' | 'disconnected';
  type OptionalCharacter = 'PERCIVAL' | 'MORGANA' | 'MORDRED' | 'OBERON';
  type RoomPhase = 'lobby' | 'in_progress';
  interface GameSettings { characters: OptionalCharacter[]; ladyOfLake: boolean }
  interface Player { id: string; socketId: string | null; name: string; isHost: boolean; status: PlayerStatus; joinedAt: number }
  interface Room { code: string; hostPlayerId: string; players: Map<string, Player>; phase: RoomPhase; settings: GameSettings; createdAt: number; idleEvictAt: number | null }
  interface PlayerSnapshot { id: string; name: string; isHost: boolean; status: PlayerStatus; joinedAt: number }
  interface RoomSnapshot { code: string; phase: RoomPhase; players: PlayerSnapshot[]; playerCount: number; settings: GameSettings; canStart: boolean }
  ```
- `error.types.ts` — `LobbyErrorCode` union: `ROOM_NOT_FOUND | ROOM_FULL | ROOM_IN_PROGRESS | NAME_TAKEN | NOT_IN_ROOM | NOT_HOST | GAME_NOT_STARTABLE | INVALID_PAYLOAD | KICK_INVALID_TARGET`.
- `ws-events.ts` — string constants for every event name (avoid magic strings in client + server).

`RoomSnapshot` is the only thing that gets serialized to clients — `Room` (with its `Map`, `hostPlayerId`, etc.) stays internal.

---

## File-by-File Plan

```
packages/shared/src/
  index.ts                          # re-exports
  constants.ts                      # NEW
  room.types.ts                     # NEW
  error.types.ts                    # NEW
  ws-events.ts                      # NEW

packages/server/src/
  app.module.ts                     # MODIFY: import AuthModule, RoomModule, GameModule, HealthModule
  main.ts                           # KEEP — already good
  auth/
    auth.module.ts                  # NEW: JwtModule.registerAsync(secret from ConfigService), exports WsGuard + JwtService
    jwt-payload.ts                  # NEW: JwtPayload interface + buildJwtPayload(player, roomCode) factory
    ws.guard.ts                     # NEW: extracts token from handshake.auth.token, verifies, sets client.data.user
  room/
    room.module.ts                  # NEW: imports AuthModule
    room.controller.ts              # NEW: POST /rooms, POST /rooms/:code/join, GET /rooms/:code
    room.service.ts                 # NEW: in-memory Map<code, Room>; pure-ish state methods (see below)
    room.service.spec.ts            # NEW
    room.controller.spec.ts         # NEW (supertest)
    dto/
      create-room.dto.ts            # NEW: { playerName } request + { roomCode, playerToken } response
      join-room.dto.ts              # NEW
  game/
    game.module.ts                  # NEW: imports RoomModule + AuthModule
    game.gateway.ts                 # NEW: handleConnection, handleDisconnect, @SubscribeMessage handlers
    game.gateway.spec.ts            # NEW
    dto/
      update-settings.dto.ts        # NEW
      kick-player.dto.ts            # NEW
  health/
    health.controller.ts            # NEW: GET /health
```

### `RoomService` surface (pure logic, no socket I/O)

```ts
createRoom(hostName: string): { room: Room; hostPlayer: Player }
getRoom(code: string): Room | undefined
joinRoom(code: string, name: string): Player                 // throws LobbyError on failure
linkSocket(playerId: string, socketId: string): { room: Room; player: Player }
unlinkSocket(socketId: string): { room: Room; player: Player; wasHost: boolean } | null
toggleReady(playerId: string): Room
updateSettings(playerId: string, settings: GameSettings): Room       // host-only, lobby-only
kickPlayer(hostPlayerId: string, targetPlayerId: string): { room: Room; kicked: Player }
canStart(room: Room): { ok: true } | { ok: false; reason: string }
startGame(playerId: string): Room                            // host-only, lobby-only, runs canStart
destroyRoom(code: string): void
toSnapshot(room: Room): RoomSnapshot
sweepIdleRooms(now: number): string[]                        // returns evicted codes; gateway broadcasts room_destroyed
```

The Gateway is a thin shell that calls `RoomService` and translates results into broadcasts/errors. This keeps logic testable without WebSocket plumbing.

### Idle eviction
Run a `setInterval` (e.g. every 30s) inside `RoomService.onModuleInit` that calls `sweepIdleRooms(Date.now())`. The Gateway subscribes a callback (`RoomService.onEvicted(code => …)`) so it can broadcast `room_destroyed { reason: 'idle_eviction' }` and disconnect the host's socket. (Alternatively: lift the callback into a tiny `LobbyEventEmitter` so `RoomService` stays free of NestJS-specific deps.)

### CORS / Env
- `CLIENT_ORIGIN` — for CORS and the WS gateway. Default `http://localhost:5173`.
- `JWT_SECRET` — required. Server should refuse to boot without it.
- `PORT` — default 3000.

---

## Suggested Build Order (for stepwise execution)

1. **Shared types** — `@avalon/shared` constants + room.types + error.types + ws-events. Build it once, both other packages can import.
2. **Auth module** — JwtModule wiring, `JwtPayload`, `WsGuard`. No HTTP/WS endpoints yet, just the building blocks. Tiny unit test for `buildJwtPayload` and `WsGuard.canActivate`.
3. **RoomService** — pure logic, no HTTP/WS. TDD it: write `room.service.spec.ts` first for createRoom, joinRoom, linkSocket, toggleReady, updateSettings, kickPlayer, canStart, startGame, sweepIdleRooms. Inject a clock so tests can fast-forward.
4. **RoomController** — the three HTTP endpoints + supertest spec. Now you can `curl` your way to a room code + token end-to-end.
5. **HealthController** — trivially.
6. **GameGateway** — handleConnection, handleDisconnect, `@SubscribeMessage` handlers. Tests use `socket.io-client` against an in-process `INestApplication`.
7. **AppModule wire-up** — import everything. `pnpm dev` should boot.
8. **Manual end-to-end smoke** — see Verification.

Each step is independently testable and committable. The TDD-by-feature order means RoomService's tests catch ~80% of bugs before sockets enter the picture.

---

## Testing Strategy

Unit-first, then integration:

1. **`room.service.spec.ts`** — every method, every failure case, every edge: name collisions (case-insensitive), `MAX_PLAYERS` overflow, settings validation, host-only authorization, the canStart matrix (player count × evil-optional combos), `sweepIdleRooms` honouring the host-only-only-timer contract.
2. **`room.controller.spec.ts`** — supertest `POST /rooms`, `POST /rooms/:code/join`, `GET /rooms/:code`. Asserts JWT shape, status codes, error codes, validation pipe behavior.
3. **`game.gateway.spec.ts`** — socket.io test client (`socket.io-client`) against a real `INestApplication`. Cover: handshake auth (good/bad/expired token), reconnect (same JWT replaces socketId), `update_settings`/`player_ready`/`kick_player`/`start_game` happy + error paths, host disconnect destroys room, non-host disconnect sets status, idle eviction broadcasts `room_destroyed`.
4. **No e2e for game phases** — out of scope for this plan.

---

## Verification

After implementation:

```bash
pnpm --filter @avalon/server test            # all unit + integration green
pnpm --filter @avalon/server test:cov        # confirm RoomService coverage > 90%
pnpm --filter @avalon/shared build           # shared package compiles
pnpm dev                                     # both client + server up
```

Manual end-to-end with `curl` + `wscat`:
1. `curl -X POST localhost:3000/rooms -d '{"playerName":"Faraj"}' -H 'content-type: application/json'` → returns code + token.
2. Open a WS to the server with that token in `auth.token`. Expect `room_updated` event with one player.
3. Second terminal: `curl -X POST localhost:3000/rooms/<code>/join -d '{"playerName":"Bob"}'` then connect a second WS. First terminal sees `room_updated` with two players.
4. Toggle `player_ready` on both, host emits `start_game` → expect `phase_changed { phase: 'in_progress' }`.
5. Repeat with edge cases: full room, name collision, kick, host disconnect → all clients receive `room_destroyed`.

Idle-eviction is harder to test by hand at 5 min — assert via unit test by injecting a clock and calling `sweepIdleRooms(now)` directly.

---

## Out of Scope (deferred)

- The XState game machine and role-assignment payloads.
- Mid-game reconnection (different code path: must preserve role-filtered knowledge).
- Spectators.
- Rate limiting / anti-abuse on `POST /rooms` (Throttler module is easy to add later).
- Redis / horizontal scaling (in-memory Map is correct for v1; a single Railway dyno).
- Persistence across server restarts (rooms are ephemeral by design).
