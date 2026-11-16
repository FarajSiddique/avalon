# Avalon

Web-based real-time multiplayer version of The Resistance: Avalon (5 to 10 players).
Hidden loyalty, Good vs Evil across five quests. Players sit in the same room, each
on their own phone, so the app is mobile first. Medieval, night-time look.

The full design is in `docs/architecture.md`. Read it before changing structure.

## Stack

| Layer      | Technology                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| App        | One Next.js 16 app: App Router, React 19, TypeScript strict                |
| Styling    | Tailwind CSS v4, themed with CSS custom properties (`src/app/globals.css`) |
| Real-time  | Socket.IO on the same HTTP server as Next.js, via `server.ts`              |
| Game logic | A plain typed reducer in `src/server/game` (no XState)                     |
| State      | In memory in the single Node process. No database                          |
| Validation | zod, in `src/shared/protocol.ts`                                           |
| Tests      | Vitest (logic, sockets), Playwright (browser flows), Bruno (HTTP)          |
| Hosting    | One always-on Node service, exactly one instance (Railway). Not Vercel     |

This is Next.js 16 with Cache Components on. It differs from older versions: read
the guides in `node_modules/next/dist/docs/` before using a Next.js API you are not
sure about.

## Commands

```
pnpm dev          # custom server with hot reload, http://localhost:3000
pnpm build        # next build, then bundle server.ts to dist/server.mjs
pnpm start        # run the production build
pnpm lint         # eslint
pnpm typecheck    # next typegen + tsc --noEmit
pnpm test         # vitest
pnpm test:e2e     # playwright against the production build (run pnpm build first)
pnpm test:api     # bruno collection (server must be running on :3000)
pnpm screenshots  # regenerate docs/design/screenshots (run pnpm build first)
pnpm format       # prettier
```

Always run the app through `pnpm dev` or `pnpm start`. Plain `next dev` and
`next start` do not start the socket server.

## Layout

```
server.ts          Custom server: Next.js + Socket.IO on one port
src/app/           Routes. / (landing), /room/[code] (lobby and game), /api/health, /design (prototypes)
src/shared/        Types, constants, protocol. Imported by both sides. Plain TS + zod only
src/server/        Room store, socket handlers, view projection, game engine. Server process only
src/client/        Browser helpers: socket, seat token, room store hook, hold-to-reveal
src/design/        Prototype-only mock data and helpers (removed after a direction is picked)
e2e/               Playwright: *.e2e.ts behaviour, *.shots.ts screenshots
bruno/             Bruno collection
docs/              architecture.md, design specs and screenshots
```

## Rules that must not be broken

**Server-authoritative.** All game state and logic live in the server process.
Clients send intents and render what they are sent.

- Never trust the client for role assignment, votes or quest cards. Validate every
  action in the reducer against the full state.
- The only code that may turn server state into something sent to a client is
  `projectView` in `src/server/realtime/project-view.ts`. It builds one `RoomView`
  per player. Never emit to a whole room, and never send a `RoomRecord` or
  `GameState`.
- A client must never receive: another player's role before the game ends, a vote
  before every vote is in, or which player played which quest card.
- Simultaneous reveals: collect every vote and every quest card on the server, then
  reveal all at once.
- Quest cards: keep and send only the count of Fail cards. Discard who played what
  as soon as the quest resolves.
- Randomness in game logic comes from the injected `Rng`, never `Math.random`.

**Import boundaries** (enforced by ESLint):

- `src/app`, `src/client` and `src/design` must not import `src/server`. Next.js
  bundles them separately, so they would get an empty copy of the room store.
  Everything about a room goes over the socket.
- `src/shared` imports only zod and other `src/shared` files.
- Do not use the `server-only` package in `src/server`: it throws outside the
  Next.js bundler, which is where that code runs.

**One instance.** Rooms are in process memory. Never scale the service past one
replica, and never move room state into a Next.js route handler or Server Action.

## Conventions

- TypeScript strict, no `any`. Prettier on every file you touch (`pnpm format`).
- Colours, fonts and radii come from the tokens in `src/app/globals.css`
  (`bg-canvas`, `text-ink`, `border-line`, `font-display`, ...). No raw colour
  values in components.
- Secret information on screen uses `useHoldToReveal` (hidden until pressed).
- Never signal meaning with colour alone: Good and Evil, Approve and Reject,
  Success and Fail each need a shape or icon and a text label.
- Touch targets are at least 44 by 44 px. Check layouts at 390px and 1440px.
- Tests locate elements by role. After a client-side navigation Next.js keeps the
  previous route mounted but hidden, so label and text locators can match twice.
