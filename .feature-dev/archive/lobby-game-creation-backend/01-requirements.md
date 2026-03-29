# Requirements: Lobby / Game Creation Backend

## Problem Statement

Players need a way to create and join an Avalon game session before play begins. A **host** creates a game and receives a unique, shareable room code. Other players enter that code to connect to the lobby. Once in the lobby, each player can toggle their ready state. The host sees a live list of all connected players and their ready status. There is currently no backend at all — this is a greenfield build.

## Acceptance Criteria

- [ ] A host can create a new room via HTTP POST and receive a unique, human-readable room code
- [ ] Any player (including the host) can join a room by providing the room code and their chosen display name via WebSocket
- [ ] Players joining a full or non-existent room receive a clear error
- [ ] A player can send a "ready" event to toggle their ready state (ready → not ready → ready…)
- [ ] Every state change (player join, player leave, ready toggle) broadcasts an updated room snapshot to all connected players in that room
- [ ] The room enforces a 5–10 player count: fewer than 5 → start is blocked (status indicator); more than 10 → join is rejected
- [ ] A player who disconnects is removed from the room and all remaining players are notified
- [ ] An HTTP GET endpoint allows checking whether a room code exists and is joinable (for pre-join validation on the frontend)

## Scope

### In Scope

- HTTP: `POST /rooms` (create room, return code) and `GET /rooms/:code` (check joinability)
- HTTP: `GET /health` (Railway health check)
- WebSocket: `join_room` event (player joins lobby)
- WebSocket: `player_ready` event (toggle ready state)
- WebSocket: `room_updated` broadcast (player join/leave/ready change)
- `@avalon/shared` package: shared types and DTOs used by both client and server
- In-memory room storage inside `RoomService`
- Disconnect cleanup (Socket.io `disconnect` event)
- Player count enforcement (5 min, 10 max)

### Out of Scope

- Host-only game settings (character selection, Lady of the Lake toggle)
- `start_game` event and XState game machine
- Authentication / persistent sessions
- Redis or any external data store
- Frontend implementation (this ticket is backend only)

## Technical Constraints

- **Framework:** NestJS 11 + TypeScript, bootstrapped per CLAUDE.md `main.ts` pattern
- **WebSockets:** `@nestjs/websockets` + `@nestjs/platform-socket.io` (Socket.io v4)
- **Monorepo:** pnpm workspaces — shared types live in `packages/shared` as `@avalon/shared`
- **Storage:** In-memory (`Map<roomCode, Room>` inside `RoomService`) — no database
- **Room codes:** Short, uppercase alphanumeric (e.g. 6 characters), collision-safe
- **Architecture:** Server-authoritative; clients are dumb views

## Dependencies

None. This is the first feature and the project is built from scratch.

## Methodology: traditional

## Complexity: medium
