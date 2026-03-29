# Architecture Design: Ephemeral JWT Authentication for Avalon

## 1. Overview

This document covers the full technical design for introducing stateless JWT-based authentication to the Avalon backend. The change closes an open WebSocket gateway, shifts player registration from a WebSocket event to HTTP, and gives every socket connection a verified identity from the moment it connects.

The scope is intentionally narrow: no persistent accounts, no refresh tokens, no RBAC beyond what already exists. The goal is a minimal, correct authentication boundary that fits the ephemeral session model of a board game.

---

## 2. Component Design

### 2.1 New Files

**`packages/server/src/auth/auth.module.ts`**

Registers `JwtModule` with the secret and TTL. Exports `JwtService` so both `RoomModule` and `GameModule` can consume it without re-registering. Also declares and exports `WsGuard`.

**`packages/server/src/auth/ws.guard.ts`**

A NestJS `CanActivate` guard that intercepts WebSocket connections. Reads the token from `client.handshake.auth.token`, verifies it with `JwtService`, and attaches the decoded payload to `client.data.player`. Rejects invalid or missing tokens by emitting `unauthorized` and returning `false`.

**`packages/server/src/auth/jwt-payload.interface.ts`**

TypeScript interface defining the verified JWT payload shape. Also used as the type for `client.data.player`.

**`packages/server/src/room/dto/create-room-request.dto.ts`**

New DTO. Requires `playerName` on `POST /rooms`.

**`packages/server/src/room/dto/join-room-request.dto.ts`**

New DTO for `POST /rooms/:code/join`. Accepts `playerName`.

**`packages/server/src/room/dto/join-room-response.dto.ts`**

New DTO. Returns `{ token: string }`.

**`packages/server/src/types/socket.d.ts`**

Socket.io type augmentation so `client.data.player` is typed as `JwtPayload` throughout the gateway.

### 2.2 Modified Files

| File | Change |
|---|---|
| `room/dto/create-room-response.dto.ts` | Add `token` field |
| `room/room.controller.ts` | Accept `playerName` on create; add `POST /rooms/:code/join`; sign tokens |
| `room/room.module.ts` | Import `AuthModule` |
| `game/game.gateway.ts` | Add `WsGuard`; remove `join_room`; verify token in `handleConnection`; read `client.data.player` in all handlers |
| `game/game.module.ts` | Import `AuthModule` |
| `app.module.ts` | Import `ConfigModule` (global), `AuthModule` |
| `main.ts` | Fail-fast if `JWT_SECRET` is unset |

---

## 3. API Design

### `POST /rooms`

**Request**
```json
{ "playerName": "Faraj" }
```
**Response — 201**
```json
{ "code": "XKQM4B", "token": "<signed JWT>" }
```
**Errors:** 400 if `playerName` missing/blank/too long

---

### `POST /rooms/:code/join`

**Request**
```json
{ "playerName": "Leanor" }
```
**Response — 200**
```json
{ "token": "<signed JWT>" }
```

**Errors**

| Condition | Status |
|---|---|
| Room not found | 404 |
| Game already started / room full | 409 |
| Name already taken | 409 |
| Invalid `playerName` | 400 |

---

### Removed WebSocket Event

`join_room` is removed. Socket.io room membership is established inside `handleConnection` using the token's `roomCode` claim (`client.join(payload.roomCode)`).

---

## 4. Data Model

### JWT Payload

```typescript
export interface JwtPayload {
  sub: string;        // player UUID
  roomCode: string;
  playerName: string;
  iat: number;        // set automatically
  exp: number;        // iat + 4h
}
```

### New / Updated DTOs

```typescript
// create-room-request.dto.ts
class CreateRoomRequestDto {
  @IsString() @IsNotEmpty() @MaxLength(24) @Transform(trim)
  playerName: string;
}

// join-room-request.dto.ts
class JoinRoomRequestDto {
  @IsString() @IsNotEmpty() @MaxLength(24) @Transform(trim)
  playerName: string;
}

// create-room-response.dto.ts  (updated)
class CreateRoomResponseDto {
  code: string;
  token: string;
}

// join-room-response.dto.ts  (new)
class JoinRoomResponseDto {
  token: string;
}
```

---

## 5. Guard Implementation

### Connection-Level Verification (`handleConnection`)

NestJS WebSocket guards are message-level — they do not fire on the Socket.io connection lifecycle hook. `handleConnection` must therefore verify the token manually:

```typescript
async handleConnection(client: Socket) {
  const token = client.handshake.auth?.token;
  if (!token) { client.emit('unauthorized', { message: 'Missing token' }); client.disconnect(); return; }
  try {
    const payload = this.jwtService.verify<JwtPayload>(token);
    // Confirm player is still in the room (handles token-valid-after-removal edge case)
    const room = this.roomService.getRoom(payload.roomCode);
    if (!room || ![...room.players.values()].find(p => p.id === payload.sub)) {
      client.emit('unauthorized', { message: 'Player not in room' }); client.disconnect(); return;
    }
    client.data.player = payload;
    client.join(payload.roomCode);   // replaces join_room socket.join() call
  } catch {
    client.emit('unauthorized', { message: 'Invalid or expired token' }); client.disconnect();
  }
}
```

### Message-Level Guard (`WsGuard`)

Applied via `@UseGuards(WsGuard)` at the gateway class level. Trusts `client.data.player` if already set (avoids re-verifying on every message); falls back to verifying the token if not set.

### `AuthModule`

```typescript
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '4h' },
      }),
    }),
  ],
  providers: [WsGuard],
  exports: [JwtService, WsGuard],
})
export class AuthModule {}
```

`config.getOrThrow()` throws at module init if `JWT_SECRET` is missing.

---

## 6. Security Considerations

| Risk | Mitigation |
|---|---|
| Unauthenticated socket connects | Manual verify in `handleConnection` + `WsGuard` on all message handlers |
| Weak / missing secret | Fail-fast at startup; document 256-bit minimum entropy in `.env.example` |
| Token valid after player removed | `handleConnection` checks player still exists in room before accepting |
| Name race condition | JS single-threaded event loop makes in-memory name check naturally atomic |
| Token replay | Accepted trade-off for ephemeral sessions; token not persisted client-side in `localStorage` |
| OWASP API2 Broken Auth | Verified on every connection and every message event |
| OWASP API3 Broken Object Auth | `client.data.player.roomCode` scopes all room operations |

---

## 7. Module Dependency Graph

```
AppModule
  ├── ConfigModule (global)
  ├── AuthModule ──────────────────── exports JwtService, WsGuard
  ├── RoomModule
  │     ├── imports AuthModule
  │     └── RoomController → JwtService
  └── GameModule
        ├── imports AuthModule
        └── GameGateway → WsGuard, JwtService
```

---

## 8. Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Guard not applied to `handleConnection` | Unauthenticated sockets accepted | Explicit verify in `handleConnection` (Section 5) |
| `JWT_SECRET` exposed or weak | Any party can mint tokens | Fail-fast; env var only; 256-bit minimum |
| Token valid after player removed | Removed player can reconnect | Room membership check in `handleConnection` |
| `join_room` removal breaks existing clients | Silent failure on old clients | Coordinated deploy; client updated in same release |

---

## 9. File Summary

| File | Action |
|---|---|
| `auth/auth.module.ts` | Create |
| `auth/ws.guard.ts` | Create |
| `auth/jwt-payload.interface.ts` | Create |
| `types/socket.d.ts` | Create |
| `room/dto/create-room-request.dto.ts` | Create |
| `room/dto/join-room-request.dto.ts` | Create |
| `room/dto/join-room-response.dto.ts` | Create |
| `room/dto/create-room-response.dto.ts` | Modify |
| `room/room.controller.ts` | Modify |
| `room/room.module.ts` | Modify |
| `game/game.gateway.ts` | Modify |
| `game/game.module.ts` | Modify |
| `app.module.ts` | Modify |
| `main.ts` | Modify |
