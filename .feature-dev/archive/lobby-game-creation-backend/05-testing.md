# Testing & Validation: Lobby / Game Creation Backend

## Test Suite

### Files Created

| File | Tests | Coverage |
|---|---|---|
| `packages/server/src/room/room.controller.spec.ts` | 17 | `room.controller.ts`: 95.8% statements, 100% functions |
| `packages/server/src/game/game.gateway.spec.ts` | 30 | `game.gateway.ts`: 91.5% statements, 83.3% branches, 100% functions |
| (Unit tests embedded in gateway spec) | — | `room.service.ts`: 84% statements |

**Total: 47 tests, all passing.**

### Coverage Areas

**room.controller.spec.ts (17 tests)**
- `GET /health` → 200 { status: 'ok' }
- `POST /rooms` → 201 with 6-char code; distinct codes on successive calls; valid character set
- `GET /rooms/:code` → joinable/not-joinable states; case normalisation; full boundary (10 players); one-slot-remaining (9 players); non-existent room

**game.gateway.spec.ts (30 tests)**
- `handleJoinRoom` happy path: join_room_ack, room_updated broadcast, host assignment, socket.join()
- `handleJoinRoom` errors: ROOM_NOT_FOUND, ROOM_FULL, NAME_TAKEN (case-insensitive), ALREADY_IN_ROOM
- `handlePlayerReady` happy path: toggle, debounce, canStart when all 5 ready
- `handlePlayerReady` errors: NOT_IN_ROOM
- `handleDisconnect`: remove player, broadcast to remaining, no broadcast on last player, host promotion, debounce map cleanup

---

## Security Findings

### High (4)

| ID | Finding | Location |
|---|---|---|
| F-01 | CORS wildcard on WebSocket Gateway — falls back to `*` when `CLIENT_ORIGIN` unset | `game.gateway.ts:14` |
| F-02 | No rate limiting on `POST /rooms` — unbounded room creation DoS | `room.controller.ts:19-23` |
| F-03 | `app.enableCors()` with no args — allows all origins on HTTP | `main.ts:11` |
| F-04 | Socket ID used as player identity — broadcasted to all clients, changes on reconnect | `room.service.ts:92`, `room.types.ts:6` |

### Medium (6)

| ID | Finding |
|---|---|
| F-05 | Error messages reflect client input verbatim (room code, name, maxPlayers) |
| F-06 | No per-socket rate limit on `join_room` WebSocket event |
| F-07 | `GET /rooms/:code` distinguishes between "not found" / "full" / "in progress" via response body (enumeration) |
| F-08 | `Math.random()` used for room code generation (non-cryptographic PRNG) |
| F-09 | No room TTL expiry — abandoned rooms (never joined or idle) accumulate indefinitely |
| F-10 | `playerName` regex doesn't prevent cosmetic griefing patterns; `GET /rooms/:code` param lacks a pre-validation pipe |

### Low (5)

| ID | Finding |
|---|---|
| F-11 | `ValidationPipe` missing `forbidNonWhitelisted: true` on both gateway and main.ts |
| F-13 | `GET /health` unauthenticated and publicly enumerable from internet |
| F-14 | Socket IDs exposed in `room_updated` broadcast to all room members (linked to F-04) |
| F-15 | No structured logging — `console.log`/`console.error` with no correlation IDs |

---

## Performance Findings

### High (2)

| # | Finding | Location |
|---|---|---|
| P-1 | `POST /rooms` unthrottled — no rate limit or room count cap; stale rooms never expire | `room.controller.ts:19`, `room.service.ts:29` |
| P-2 | `readyLastEvent` Map cleanup is correct but fragile — cleanup must remain unconditional | `game.gateway.ts:27,104` |

### Medium (3)

| # | Finding | Location |
|---|---|---|
| P-3 | `toSnapshot` called twice per `join_room` — redundant allocation | `game.gateway.ts:50,56` |
| P-4 | `toSnapshot` allocates 3 arrays per call (spread + sort + map) on every broadcast | `room.service.ts:214` |
| P-5 | `name.trim()` called twice in `addPlayer`; O(n) name scan allocates per player | `room.service.ts:115,128` |

### Low (3)

| # | Finding |
|---|---|
| P-6 | Host promotion on disconnect uses spread+sort; O(n) min scan is faster and cheaper |
| P-7 | Joinability logic triplicated across `isJoinable`, `findOne`, and `addPlayer` |
| P-8 | Joining socket receives two identical `RoomSnapshot` payloads per join (join_room_ack + room_updated) |

---

## Action Items (Pre-delivery — High Severity)

The following High findings must be resolved before this feature is delivered:

1. **[F-01 / F-03] Fix CORS wildcard on both gateway and HTTP** — require `CLIENT_ORIGIN` env var; fail fast at startup if unset in non-development environments
2. **[F-02 / P-1] Add rate limiting to `POST /rooms`** — `@Throttle({ default: { limit: 5, ttl: 60000 } })` + `@UseGuards(ThrottlerGuard)`
3. **[P-1 / F-09] Add stale room TTL expiry sweep** — `onModuleInit` `setInterval` that deletes empty rooms older than 5 minutes
4. **[F-04 / F-14] Replace socket ID with opaque UUID as player identity** — generate `randomUUID()` at join; never expose `socket.id` in snapshots
5. **[F-08] Replace `Math.random()` with `crypto.randomInt`** for room code generation
6. **[P-2] Document unconditional cleanup intent** in `handleDisconnect` readyLastEvent cleanup
