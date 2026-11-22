# Avalon

The Resistance: Avalon for 5 to 10 players, played together in one room with
everyone on their own phone. One TanStack Start app on a Cloudflare Worker, with
one Durable Object per game room.

Status: foundation. Rooms, joining, presence and reconnecting work. The game
itself is next. Three design directions were compared at `/design`, and Starlit
Vale was chosen.

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
- [`docs/design/`](docs/design/README.md): the three design directions, their
  specs and screenshots.
- `CLAUDE.md` and `.claude/rules/`: working rules for the codebase and the
  game rules.
