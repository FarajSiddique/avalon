# Avalon

The Resistance: Avalon for 5 to 10 players, played together in one room with
everyone on their own phone. One Next.js app with a built-in Socket.IO server.

Status: foundation. Rooms, joining, presence and reconnecting work. The game
itself is next. Three design directions are available to compare at `/design`.

## Run it

Needs Node 24 or newer and pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

To check everything the way CI does:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm exec playwright install chromium   # first time only
pnpm test:e2e
```

## Where things are

- [`docs/architecture.md`](docs/architecture.md): how it is built, why, and the
  plan for the rest of the game.
- [`docs/design/`](docs/design/README.md): the three design directions, their
  specs and screenshots.
- `CLAUDE.md` and `.claude/rules/`: working rules for the codebase and the
  game rules.
