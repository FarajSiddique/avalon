# Avalon

The Resistance: Avalon for 5 to 10 players, played together in one room with
everyone on their own phone. One TanStack Start app on a Cloudflare Worker, with
one Durable Object per game room.

Status: Phase 0 done. Rooms, joining, presence and reconnecting work, and the
landing and room screens use Starlit Vale, the design system, with the 3D Star
Table on the landing. The lobby and the game itself are next. Screens not built
yet can be clicked through at `/design/starlit`.

Live: <https://avalon.hong-ladder.workers.dev>

## Run it

Needs Node 24 or newer and pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:3000, app and rooms in Cloudflare's local runtime
```

To check everything the way CI does:

```bash
pnpm exec playwright install chromium   # first time only
pnpm check
```

`pnpm install` also turns on a pre-commit hook (`.githooks/pre-commit`) that
checks format and lint on staged files.

Every pull request gets a preview deploy with its address in a comment, and a
merge to `main` deploys to <https://avalon.hong-ladder.workers.dev>.

## Where things are

- [`docs/architecture.md`](docs/architecture.md): how it is built, why, and the
  plan for the rest of the game.
- [`docs/design-system.md`](docs/design-system.md): Starlit Vale, the design
  system: tokens, components, motion, sound and the 3D stage.
- `CLAUDE.md` and `.claude/rules/`: working rules for the codebase and the
  game rules.
