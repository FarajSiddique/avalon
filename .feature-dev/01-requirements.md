# Requirements: Ephemeral JWT Authentication

## Problem Statement

Players joining an Avalon game room need a secure, stateless identity to authenticate their
WebSocket connection without requiring full user accounts. Currently the WebSocket gateway
has no authentication — any client can connect and send events as any player. The host also
lacks a credential after creating a room. Both the host and joining players need a signed
token that the server can verify when the socket connection is established.

## Acceptance Criteria

- [ ] `POST /rooms` accepts `{ playerName }` in the body, creates the room, adds the host as
      the first player, and returns `{ code, token }` — one round-trip for the host
- [ ] `POST /rooms/:code/join` accepts `{ playerName }`, validates the room is joinable, adds
      the player, and returns `{ token }` — same flow for all non-host players
- [ ] JWT payload is `{ playerId, roomCode, playerName }` signed with a server secret
- [ ] Token TTL is 4 hours (matches a typical game session)
- [ ] `WsGuard` intercepts every incoming socket connection and rejects connections missing a
      valid token (closes socket with an `unauthorized` error event)
- [ ] Authenticated socket has `client.data.player` populated with the decoded JWT payload so
      downstream gateway handlers can read identity without re-querying
- [ ] Existing `join_room` WebSocket event is removed — joining now happens over HTTP before
      the socket is opened
- [ ] All existing gateway handlers (`player_ready`, `propose_team`, `vote_team`, etc.) read
      identity from `client.data.player` rather than from event payloads

## Scope

### In Scope

- `POST /rooms` — accepts playerName, creates room, joins host, returns `{ code, token }`
- `POST /rooms/:code/join` — validates room, joins player, returns `{ token }`
- JWT signing and verification via `@nestjs/jwt`
- `WsGuard` — NestJS `CanActivate` guard for WebSocket connections
- Attaching decoded payload to `client.data.player` for use in gateway handlers
- Removing the `join_room` WebSocket event handler (superseded by HTTP join)
- Unit tests for the guard and updated controller/service paths

### Out of Scope

- Persistent user accounts or profiles
- Refresh tokens or `httpOnly` cookies
- OAuth / third-party login (Discord, Google, etc.)
- Token revocation or blocklists
- Page-refresh survivability (token is held in memory on the client only)
- Role-based access control beyond host vs. player

## Technical Constraints

- Must use `@nestjs/jwt` and `@nestjs/passport` (standard NestJS patterns)
- JWT secret loaded from environment variable `JWT_SECRET`; server must fail fast at startup
  if `JWT_SECRET` is unset
- Token TTL: `4h`
- Token payload shape: `{ sub: playerId, roomCode, playerName }` (follows JWT `sub` convention)
- Guard must work with Socket.io — token delivered via `socket.handshake.auth.token`
- No database — all identity information encoded in the token itself
- Must integrate with existing `RoomService`, `RoomController`, and `GameGateway`

## Dependencies

- **RoomService** — `addPlayer()` must be called during HTTP join so the player is in the room
  before the socket connects
- **GameGateway** — all event handlers must be updated to read `client.data.player` instead of
  a `join_room` payload; `handleJoinRoom` is removed
- **RoomModule / GameModule** — `JwtModule` registration shared or re-exported as needed

## Methodology: traditional

## Complexity: medium
