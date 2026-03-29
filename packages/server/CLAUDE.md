# Server Package

NestJS 11 + TypeScript backend.

> **Game rules and role definitions are in `.claude/rules/game-rules.md` and
> `.claude/rules/roles.md`. Only read those files when the task explicitly involves
> game logic, role behaviour, quest rules, WS event contracts, or XState phases.
> Do not load them for general TypeScript / NestJS work.**

## Module Layout

| Module | Responsibility |
|---|---|
| `RoomModule` | HTTP only: create room, check room exists |
| `GameModule` | WebSocket gateway + XState actor per room |

## Conventions

- Services own all business logic — Gateways only forward events and emit responses
- Validate all incoming WS payloads with class-validator DTOs + global `ValidationPipe`
- One module per domain area — no cross-module business logic

## XState Actor Pattern

`GameService` owns `Map<roomCode, Actor<typeof gameMachine>>`. Each room gets its own
isolated actor. Gateway sends events to actor; actor subscription broadcasts back via Gateway.

```typescript
@Injectable()
export class GameService {
  private rooms = new Map<string, Actor<typeof gameMachine>>();

  createActor(roomCode: string) {
    const actor = createActor(gameMachine);
    actor.subscribe((state) => { /* broadcast via gateway */ });
    actor.start();
    this.rooms.set(roomCode, actor);
  }

  send(roomCode: string, event: GameEvent) {
    this.rooms.get(roomCode)?.send(event);
  }
}
```

## HTTP Endpoints

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/rooms` | Create room, returns room code |
| `GET` | `/rooms/:code` | Check room exists and is joinable |
| `GET` | `/health` | Railway health check |
