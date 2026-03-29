# Shared Package

Internal TypeScript types, DTOs, and constants for `@avalon/shared`.
No runtime dependencies — types and constants only.

## Rules

- All exports go through `src/index.ts` — no deep imports from either package
- Vite resolves directly to TypeScript source (alias in `vite.config.ts`) — no build needed for client dev
- Server uses the compiled CommonJS `dist/` output

## What belongs here

- Role enums and alignment types
- Player, Room, GameState interfaces
- WebSocket event payload types (mirrors the event contract in `.claude/rules/game-rules.md`)
- Quest team size and player count lookup tables
- Shared constants: `MIN_PLAYERS`, `MAX_PLAYERS`, etc.
