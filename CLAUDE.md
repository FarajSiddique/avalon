# Avalon

Web-based real-time multiplayer version of The Resistance: Avalon (5–10 players).
Dark Arthurian theme. Hidden loyalty — Good vs Evil across 5 Quests.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite 6 |
| Styling | Tailwind CSS + shadcn/ui (themed via CSS variables) |
| Client state | Zustand |
| Real-time | Socket.io |
| Backend | NestJS 11 + TypeScript |
| WebSockets | `@nestjs/websockets` + `@nestjs/platform-socket.io` |
| Game logic | XState v5 (runs inside NestJS GameService) |
| Monorepo | pnpm workspaces |
| Deployment | Vercel (client) + Railway (server) |

## Monorepo Structure

```
avalon/
├── packages/
│   ├── shared/     # Types, DTOs, game constants — @avalon/shared
│   ├── client/     # React + Vite app  → localhost:5173
│   └── server/     # NestJS app        → localhost:3000
│       └── src/
│           ├── room/   # HTTP: create/check rooms
│           └── game/   # WebSocket gateway + XState
```

## Architecture

**Server-authoritative.** All game state and logic lives on the server. Clients are dumb
views. The server emits role-filtered events per socket — Merlin's client receives evil
player IDs; other clients do not. Players must never be able to read game state not
intended for them.

## Cross-cutting Implementation Rules

- Never trust the client for role assignment, vote collection, or quest card collection
- Simultaneous reveals: collect all votes/cards on server before broadcasting any
- Shuffle quest cards server-side before broadcasting result count
- `@avalon/shared` is workspace-only — never publish to npm
- Vite resolves `@avalon/shared` directly to TypeScript source (alias in `vite.config.ts`)
- The server compiles `@avalon/shared` from its built CommonJS `dist/`
