# Avalon

Web-based real-time multiplayer version of The Resistance: Avalon (5 to 10 players).
Hidden loyalty, Good vs Evil across five quests. Players sit in the same room, each
on their own phone, so the app is mobile first. Medieval, night-time look.

The full design is in `docs/architecture.md`. Read it before changing structure.

## Stack

| Layer      | Technology                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| App        | One TanStack Start app: React 19, TypeScript strict, Vite                  |
| Styling    | Tailwind CSS v4, themed with CSS custom properties (`src/styles/`)         |
| Hosting    | One Cloudflare Worker (`src/server.ts`, `wrangler.jsonc`)                  |
| Real-time  | Plain WebSockets to one Durable Object per room (`src/server/room`)        |
| Game logic | A plain typed reducer in `src/server/game` (no XState)                     |
| State      | In each room's Durable Object storage. No other database                   |
| Client     | Zustand vanilla stores read with `useSyncExternalStore`. No TanStack Query |
| Validation | zod, in `src/shared/schemas.ts`                                            |
| Lint       | oxlint with `@cloudflare/oxlint-config`, type-aware (`oxlint.config.ts`)   |
| Tests      | Vitest (pure logic), Playwright (browser flows on the built Worker), Bruno |

TanStack Start reached 1.0 in October 2026 and Cloudflare's tooling moves fast.
Both are newer than most training data: check the current docs (Context7 or the
official sites) before using an API you are not sure about.

## Commands

```
pnpm dev           # app and rooms in Cloudflare's local runtime, http://localhost:3000
pnpm build         # production build into dist/
pnpm start         # serve the production build locally (run pnpm build first)
pnpm lint          # wrangler types + oxlint (fails on any warning)
pnpm lint:fix      # oxlint autofixes (blank lines, braces, ...), then run pnpm format
pnpm typecheck     # wrangler types + tsc --noEmit
pnpm test          # vitest
pnpm test:e2e      # playwright against the production build (run pnpm build first)
pnpm test:restart  # proves a room survives a server restart (run pnpm build first)
pnpm test:api      # bruno collection (server must be running on :3000)
pnpm screenshots   # regenerate docs/design/screenshots (run pnpm build first)
pnpm format        # prettier
pnpm check         # every gate CI runs: format, lint, types, unit, build, e2e, restart
pnpm run deploy    # build and deploy to Cloudflare. Ask the owner first
```

Two files are generated. `worker-configuration.d.ts` (by `wrangler types`, which
`pnpm typecheck` runs) is not committed. `src/routeTree.gen.ts` (by the dev
server or build) is committed, as TanStack recommends, so a fresh clone
typechecks. Never edit it by hand: after adding, moving or removing a route, run
`pnpm build` or `pnpm dev` and commit the result. CI fails if it is stale.

## Layout

```
wrangler.jsonc     The Worker and its ROOM Durable Object binding
src/server.ts      Worker entry: /api/socket/CODE goes to the room object, the rest to TanStack Start
src/routes/        File-based routes. / (landing), /room/$code (lobby and game), /api/health, /design/starlit (prototype)
src/components/    Screens and components of the real app, one folder per area (landing, room, ...)
src/styles/        app.css (Tailwind and base styles) and tokens.css (the :root tokens)
src/functions/     Server functions (createRoom)
src/shared/        Types, constants, protocol, validators. Imported by both sides
src/server/        Room object, room rules, view projection, game engine. Worker only
src/client/        Browser helpers: connection, seat token, room store hook, hold-to-reveal, sound
src/design/        Prototype-only mock data and helpers for Starlit Vale, the chosen design
e2e/               Playwright: *.e2e.ts behaviour, *.shots.ts screenshots
scripts/           contrast.mjs, restart-check.mjs
bruno/             Bruno collection
docs/              architecture.md, design specs and screenshots
```

In `src/routes`, files and folders that start with `-` are not routes (components,
styles). A folder's layout is its `route.tsx`.

## Rules that must not be broken

**Server-authoritative.** All game state and logic live in the room's Durable
Object. Clients send intents and render what they are sent.

- Never trust the client for role assignment, votes or quest cards. Validate every
  action in the reducer against the full state.
- The only code that may turn room state into something sent to a client is
  `projectView` in `src/server/room/project-view.ts`. It builds one `RoomView` per
  player. Never send the same message to every socket, and never send a
  `RoomState` or `GameState`.
- A client must never receive: another player's role before the game ends, a vote
  before every vote is in, or which player played which quest card.
- Simultaneous reveals: collect every vote and every quest card in the room, then
  reveal all at once.
- Quest cards: keep and send only the count of Fail cards. Discard who played what
  as soon as the quest resolves.
- Randomness in game logic comes from the injected `Rng`, never `Math.random`.

**The room object forgets.** A Durable Object sleeps whenever it is idle and loses
its memory. In `src/server/room/room-object.ts`:

- Save the room to storage after every change. Fields on the class are only a cache.
- A socket's seat lives in its attachment. Who is connected is read from the live
  sockets, never stored.
- Anything that must happen later is an alarm. Never `setTimeout` or `setInterval`.
- Keep rules out of this file. They are pure functions in `state.ts` and
  `src/server/game`, tested in plain Node.
- `pnpm test:restart` must keep passing.

**No effects** (enforced by oxlint). `useEffect`, `useLayoutEffect` and
`useInsertionEffect` are banned. Subscribe with `useSyncExternalStore` (or a
Zustand store), do element set-up in a ref callback that returns a clean-up, and
react to the user in event handlers. See "Effects" in `docs/architecture.md`.

**Import boundaries** (enforced by oxlint):

- Browser code (`src/routes` except `src/routes/api`, `src/components`, `src/client`,
  `src/design`) must not import `src/server` or `cloudflare:*`. It reaches the server
  only through the room WebSocket (`src/client/connection.ts`) and server functions
  (`src/functions`).
- `src/shared` imports only other `src/shared` files, plus zod in `schemas.ts`.
  Keep `protocol.ts` free of runtime dependencies so zod stays out of the browser.

## Conventions

Folders, names, exports, tests and pull requests: `.claude/rules/code-standards.md`.
Run `pnpm check` before pushing; a pre-commit hook checks format and lint on
staged files.

- TypeScript strict, no `any`. Prettier on every file you touch (`pnpm format`).
- Blank lines between statements come from oxlint, not Prettier (Prettier keeps
  them but never adds them): before `return`, after `const`/`let` groups, and
  around multi-line blocks. `pnpm lint:fix` adds them.
- An `oxlint-disable-next-line` comment names the rule and gives a reason after `--`.
- Every Zustand store is made with `createDevStore(name, ...)` from
  `src/client/dev-store.ts`, never `createStore` directly. In development each
  store shows in the Redux DevTools extension and on `window.__AVALON_STORES__`
  (state plus recent history). To check state, run `pnpm dev`, then
  `pnpm stores /some/path` (add `--history` for every change), or read the
  registry from Playwright with `page.evaluate`. Production builds list nothing.
- Colours, fonts and radii come from the tokens in `src/styles/tokens.css` (`bg-canvas`,
  `text-ink`, `border-line`, `font-display`, ...). No raw colour values in
  components.
- Links in the real app use the router's typed `Link` (`to="/room/$code"` with
  `params`). `ProtoLink` is for the prototypes only.
- Forms read their fields at submit time and keep submit buttons disabled until
  `useHydrated()` is true, so input typed before the page is interactive is not lost.
- Secret information on screen uses `useHoldToReveal` (hidden until pressed).
- Never signal meaning with colour alone: Good and Evil, Approve and Reject,
  Success and Fail each need a shape or icon and a text label.
- Touch targets are at least 44 by 44 px. Check layouts at 390px and 1440px.
- Fonts are self-hosted with Fontsource packages. No font CDN.
- In browser tests, the address changes before the new screen is drawn. Wait for an
  element of the new screen, not for the URL.
