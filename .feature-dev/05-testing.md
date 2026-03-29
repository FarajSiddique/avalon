# Testing & Validation: Ephemeral JWT Authentication

## Test Suite

### Files Created / Updated

| File | Cases | Notes |
|---|---|---|
| `src/auth/ws.guard.spec.ts` | 14 | New file — no DI container needed |
| `src/room/room.controller.spec.ts` | +13 new | Existing tests preserved; JwtModule.register added to test module |
| `src/room/room.service.spec.ts` | +11 new | linkSocket describe block appended |
| `src/game/game.gateway.spec.ts` | +13 new | handleConnection cases added |

**Total new test cases: 51**

### Coverage Areas

**ws.guard.spec.ts** — `canActivate` (valid/undefined/null payload) + `verifyHandshakeToken` (plain token, Bearer header, missing, expired, malformed)

**room.controller.spec.ts** — `POST /rooms` (returns token, ValidationPipe 400s, LobbyException propagation) + `POST /rooms/:code/join` (happy path, code uppercased, ROOM_NOT_FOUND/ROOM_FULL/NAME_TAKEN propagation)

**room.service.spec.ts** — `linkSocket` (re-key, socketToRoom update, host sync, already-linked idempotence, placeholder `''` guard, playerId not found, roomCode not found)

**game.gateway.spec.ts** — `handleConnection` (valid token + linked → join + broadcast, null token → unauthorized + disconnect, valid token + linkSocket=false → unauthorized + disconnect)

---

## Security Findings

| ID | Severity | Description |
|---|---|---|
| F-01 | **Critical** | `JWT_SECRET` committed to `.env` in working tree — secret must be considered compromised |
| F-02 | High | No runtime validation of custom JWT claims (`sub`, `roomCode`, `playerName`) after `verify()` |
| F-03 | High | `@UseGuards(WsGuard)` applied only to `handlePlayerReady` — future handlers unprotected by default |
| F-04 | High | `linkSocket` accepts tokens for rooms in any phase — stale tokens can replay into recycled room slots |
| F-05 | High | Placeholder socket entries never evicted — lobby squatting possible via repeated HTTP joins without WS connect |
| F-06 | Medium | `algorithms: ['HS256']` not explicitly set in verifyOptions — algorithm confusion not explicitly prevented |
| F-07 | Medium | `:code` route param not validated — unbounded strings reach logging |
| F-08 | Medium | WebSocket CORS origin read from env at decoration time with no startup log confirming resolved value |
| F-09 | Medium | `WS_CONNECTED` log uses JWT `playerName` claim rather than authoritative stored name |
| F-10 | Medium | No hard cap on total concurrent rooms — distributed attack can exhaust memory |
| F-11 | Low | Raw `LobbyException` messages sent to client expose server-side state |
| F-12 | Low | No HTTP security headers (`helmet` not installed) |
| F-13 | Low | Controller test module missing `JwtService` — new endpoints not covered by existing tests |

---

## Performance Findings

| ID | Impact | Description |
|---|---|---|
| P-06 | High | No code comment explaining that `linkSocket` is the authoritative room-membership check, not the JWT |
| P-07 | Medium | `client.join(roomCode)` not awaited — latent race on Redis adapter path |
| P-08 | High | Single-instance constraint undocumented — second Railway instance breaks game state silently |
| P-04 | Medium | `toSnapshot` double-iterates players array (sort + every); minor allocation pressure |
| P-05 | Medium | Host promotion on disconnect does spread + sort (acceptable at n≤10) |
| P-01–03, P-09–10 | Low | JWT sign/verify cost, linkSocket O(n), structured log allocations — all acceptable at this scale |

---

## Action Items (Pre-delivery — Critical/High)

The following were addressed before delivery:

- **F-01 (Critical)** — ⚠️ REQUIRES USER ACTION: rotate `JWT_SECRET`, remove `.env` from git history. Cannot be automated.
- **F-02 (High)** — Added runtime claims validation in `verifyHandshakeToken` ✅
- **F-03 (High)** — Moved `@UseGuards(WsGuard)` to class level in `GameGateway` ✅
- **F-04 (High)** — Added `room.phase === 'lobby'` check in `linkSocket` ✅
- **F-05 (High)** — Added placeholder-socket eviction sweep in `evictStaleRooms` ✅
- **P-07 (Medium)** — `handleConnection` made `async`, `await client.join(roomCode)` ✅
- **P-06/P-08** — Code comments added documenting `linkSocket` authority and single-instance constraint ✅
