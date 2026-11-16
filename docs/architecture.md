# Avalon architecture

Status: decided at checkpoint 1 (November 2026). The next run builds the full
game from the plan at the end of this document without reopening these
decisions. Answered and open points are listed in
[Owner decisions](#owner-decisions).

## Decisions at a glance

| Topic              | Decision                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| App                | One TanStack Start app (React 19, TypeScript strict, Tailwind CSS v4, Vite), one `package.json`, pnpm.             |
| Hosting            | One Cloudflare Worker. It serves the pages and routes each room's WebSocket to that room's Durable Object.         |
| Real-time          | Plain WebSockets, one per browser tab, to the room's Durable Object. No Socket.IO.                                 |
| Game logic         | A plain typed reducer on the server. No XState.                                                                    |
| Room state         | One Durable Object per room, addressed by room code. The room is saved to the object's storage after every change. |
| Identity           | No accounts. A random seat token per player per room, kept in the browser's `localStorage`, hashed on the server.  |
| Hidden information | The room sends each player one full, filtered view (`RoomView`). Raw room state never leaves the room object.      |
| Client state       | The latest `RoomView`, held in a tiny store read with `useSyncExternalStore`. No Zustand, no client game logic.    |
| UI kit             | Hand-built components on design tokens. No shadcn/ui.                                                              |
| Tests              | Vitest for pure logic, Playwright for multi-browser flows against the built Worker, Bruno for the health check.    |

## How this was decided

Checkpoint 1 took three steps, and this document keeps the reasoning for each.

1. **First build: Next.js with a custom Node server and Socket.IO** (Option A
   below). It was built and proven in this repo, then replaced.
2. **The owner chose Cloudflare as the host** (15 November 2026), after the
   comparison below showed Durable Objects to be the best serverless fit.
3. **The framework changed from Next.js to TanStack Start**, because on
   Cloudflare Next.js runs through a beta or buggy adapter and this app uses
   almost none of what Next.js is good at. See
   [The framework decision](#the-framework-decision).

The app was ported and the same real-time round trip was proven again, this
time through a Durable Object in Cloudflare's local runtime. Nothing has been
deployed.

## The real-time and hosting decision

### The constraint, and what changed

The game needs a connection that stays open, and a server that owns the game
state and decides what each player may see.

The brief for this checkpoint assumed that Vercel functions cannot hold
WebSockets. **That is no longer true.** Vercel made WebSocket support in
Vercel Functions generally available on 20 October 2026. The comparison
therefore covers four options.

Facts in this section were checked against vendor pages on 15 November 2026.
Sources are listed at the end of the section. Prices and limits change, so
check them again before paying for anything.

### Option A: a custom Node server with Socket.IO, one always-on service

This is what checkpoint 1 built and proved first, on Next.js. `server.ts`
creates one Node HTTP server. Next.js handles normal requests.
Socket.IO handles the WebSocket upgrade on `/api/socket`. Both run in the same
process, so the socket handlers can keep every room in a plain `Map`.

- **Server-authoritative hidden information.** The process holds the full game
  state in memory. Nothing else has it. Clients send intents; the server
  validates them and changes state.
- **Per-player filtering.** After each change the server calls
  `projectView(room, playerId)` once per player and emits the result to that
  player's private Socket.IO channel. It is one function call and one emit.
- **Reconnection.** Socket.IO reconnects by itself. The client then sends its
  seat token (`room:resume`) and the server binds the new socket to the old
  seat and sends the current view. A full view on every change means there is
  no missed-event replay to build.
- **Room state storage.** Process memory. No database, no cache, nothing to
  keep in sync. State is lost when the process restarts, so every
  deploy ends the games in progress.
- **Cost.** One small service. Railway Hobby is 5 USD a month and includes
  5 USD of usage; a small Node process fits inside that. Fly.io's smallest
  machine (shared-cpu-1x, 256 MB) is 2.19 USD a month, though Next.js is more
  comfortable with 512 MB.
- **Costs of this option.** It cannot be deployed to Vercel (a custom server
  cannot run there), so no Vercel preview deployments. It must run as exactly
  one instance: two instances would each have their own rooms. A deploy drops
  live games. You run a server process, with a health check.

### Option B: Next.js on Vercel plus a managed real-time service

Vercel hosts the pages. A second service carries the live connection.

| Service                                 | What it is                                                              | Where the authoritative game logic would run                                                                                                                  | Hidden information and per-player filtering                                                                                                                                              | State storage                                                                                                             | Cost (hobby scale)                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| PartyKit, now PartyServer on Cloudflare | A small server per room, on Cloudflare Workers and Durable Objects.     | In the room's Durable Object. This is a real authoritative server and the closest match to Option A.                                                          | Good: the room object sends a different message to each connection.                                                                                                                      | The Durable Object's memory plus its built-in storage. Memory resets on hibernation, so state must be written to storage. | Free plan covers it (100,000 requests a day). Paid starts at 5 USD a month.                                |
| Ably                                    | Hosted publish and subscribe channels.                                  | Not in Ably: it does not run your code. Logic would run in Vercel functions, which are stateless, so state needs a database (for example Redis) with locking. | Possible with one private channel per player, restricted by token capabilities issued by your server. Every state change becomes up to ten publishes to ten channels.                    | A database you add (a third piece).                                                                                       | Free tier: 6 million messages a month, 500 concurrent connections. Paid starts at 35 USD a month.          |
| Liveblocks                              | Shared presence and conflict-free storage, changed directly by clients. | Not a fit. The model is "clients edit shared state". A backend can edit storage too, but the product is not built around a server that decides.               | Poor fit: storage permissions are per room, not per user, so one room cannot hide part of its state from one player. You would need a room per player and a server to copy state around. | Liveblocks storage, readable by everyone in the room.                                                                     | Free tier: 500 monthly active rooms, 10 simultaneous connections per room (exactly the 10-player maximum). |

Notes:

- The original hosted PartyKit platform shut down in October 2026. The
  successor is the `partyserver` library on your own Cloudflare account. So
  this option means a Cloudflare account, a second deploy target, a second
  runtime (Workers, not Node), and game code that lives outside the Next.js
  app. It breaks the "one Next.js app" goal most cleanly of all the options
  that would actually work well.
- Reconnection in Option B is handled by each vendor's client library. All of
  them reconnect on their own; resuming a seat is still our code.

### Option C: Next.js on Vercel with Vercel's own WebSockets (new)

Vercel Functions can now accept WebSockets on all plans (Fluid compute
required). In Next.js this needs `upgradeWebSocket()` from `@vercel/functions`,
because Next.js itself has no upgrade API.

- **It is the only option that is literally "one Next.js app on Vercel".**
- **Connections are cut at the function's maximum duration:** 300 seconds on
  Hobby, 800 seconds on Pro. Every phone would reconnect at least every five
  minutes on Hobby.
- **A reconnect can land on a different instance,** and Vercel's own guidance
  is to keep rooms and state in an external store such as Redis, not in
  memory. So state storage is Redis (a second service and account), every game
  action becomes a locked read-modify-write against Redis, and reaching the
  other players' sockets needs publish and subscribe between instances.
- **Hidden information and filtering** still work (the function sends each
  socket its own view), but the function holding a player's socket is not
  necessarily the one that processed the action, so views travel through the
  publish and subscribe layer. That layer then carries secret data and must be
  treated as such.
- **Socket.IO does not fit** inside a Next.js route handler there, so
  acknowledgements, reconnect and heartbeats would be hand-written on raw
  WebSockets. The API is Vercel-only, which changes local development.
- **Cost.** Vercel Hobby is free but limited to non-commercial use. Redis is
  extra (free tiers exist).

### Option D: Cloudflare Workers and Durable Objects (chosen)

One Worker serves the app and also exports a Durable Object class. Each room
is one Durable Object.

- **Server-authoritative hidden information.** A Durable Object is a small
  single-threaded server with its own storage, addressed by name (the room
  code). One object per room is exactly this game's shape: one authority per
  room, nothing shared between rooms.
- **Per-player filtering.** The room object holds every player's WebSocket
  and sends each one its own view, built by `projectView`.
- **Reconnection.** Sockets stay connected while the object sleeps
  ("hibernation"). The browser reconnects by itself after a drop and takes
  its seat back with its token.
- **Room state storage.** The object's memory is wiped whenever it sleeps
  (after about 10 seconds idle), so the room is written to the object's
  built-in storage after every change and loaded when it wakes. Timers
  become alarms.
- **Deploys and restarts.** The room is in storage, and since 30 October
  2026 a deploy no longer drops sleeping sockets. Games survive deploys.
  This was Option A's biggest weakness. It is proven locally here: a room
  survives a full restart of the server process, and both players reconnect
  and keep their seats without reloading the page.
- **Cost.** The free plan covers this game (100,000 requests a day; 20
  incoming WebSocket messages count as one request; sleeping time is not
  billed). Paid starts at 5 USD a month. Nothing is billed while nobody
  plays.

What it costs:

- **Socket.IO does not run on Workers.** The transport is plain WebSockets
  with a small request and answer layer of our own
  (`src/client/connection.ts`).
- **Nothing may live only in memory.** Every change is saved, each socket
  remembers its seat in its attachment, and anything that must happen later
  is an alarm. This is a discipline, kept by review and by the restart check.
- **Free-plan CPU is 10 ms per request.** Fine for the room object and the
  plain pages. Server-rendering the art-heavy Starlit screens measured about
  twice that on the live Worker, so the game screens must render in the
  browser. See the measurements under [Deployment](#deployment).

Cloudflare Containers (generally available, paid plan only) could have run
the Option A server unchanged, but containers sleep, lose their disk and are
reached through a Durable Object anyway. That is Option A with more parts.

### Comparison

|                                   | A: Node server, one service       | B: Vercel + PartyServer         | B: Vercel + Ably                         | C: Vercel WebSockets + Redis               | D: Cloudflare Worker + Durable Objects |
| --------------------------------- | --------------------------------- | ------------------------------- | ---------------------------------------- | ------------------------------------------ | -------------------------------------- |
| Pieces to deploy                  | 1                                 | 2                               | 3 (Vercel, Ably, database)               | 2 (Vercel, Redis)                          | 1                                      |
| One app, one deploy               | Yes                               | No                              | Code yes, services no                    | Code yes, plus one service                 | Yes                                    |
| Where game state lives            | Process memory                    | Durable Object                  | External database                        | Redis                                      | Durable Object storage                 |
| Authoritative logic               | In process                        | In the room object              | Stateless functions with locking         | Stateless functions with locking           | In the room object                     |
| Per-player filtering              | Function call, emit per player    | Send per connection             | One channel per player, token-restricted | Per socket, through publish and subscribe  | Function call, send per socket         |
| Reconnection                      | Socket.IO, then resume with token | Library, then resume with token | Library, then resume with token          | Hand-written; forced every 5 to 13 minutes | Small client, then resume with token   |
| Survives a deploy                 | No                                | Yes                             | Yes                                      | Yes                                        | Yes (proven locally)                   |
| Local development matches hosting | Yes                               | Two dev servers                 | Needs the service or a mock              | Needs Vercel's dev tooling and Redis       | Yes, same runtime                      |
| Monthly cost at hobby scale       | About 5 USD                       | 0 to 5 USD                      | 0 USD until limits, then 35 USD and up   | 0 USD on free tiers (non-commercial)       | 0 USD on the free plan                 |
| Accounts to create                | 1                                 | 2                               | 3                                        | 2                                          | 1                                      |

### Decision: Option D

Avalon's state is tiny, changes a few times a minute, and has two hard
requirements: one authority per room, and secrets that never reach the wrong
client. Options A and D both give exactly that, with filtering as one pure
function. D adds what A could not: games survive deploys, nothing runs or
bills while nobody plays, and there is no single process to keep alive.

What D costs is discipline about memory (above) and a host-specific server
entry. The game engine, `projectView`, the view and protocol types and every
screen do not know which host they run on.

### Sources (read 15 November 2026)

- Vercel WebSockets: <https://vercel.com/docs/functions/websockets>,
  <https://vercel.com/changelog/websocket-support-is-now-generally-available>
- Vercel function limits: <https://vercel.com/docs/functions/limitations>
- Vercel Hobby plan terms: <https://vercel.com/docs/plans/hobby>
- Next.js custom server: <https://nextjs.org/docs/app/guides/custom-server>
  (also in `node_modules/next/dist/docs/01-app/02-guides/custom-server.md`)
- Socket.IO with Next.js: <https://socket.io/how-to/use-with-nextjs>
- PartyKit shutdown and PartyServer:
  <https://docs.partykit.io/guides/migrate-to-partyserver/>
- Cloudflare Durable Objects pricing:
  <https://developers.cloudflare.com/durable-objects/platform/pricing/>
- Ably pricing and capabilities: <https://ably.com/docs/platform/pricing>,
  <https://ably.com/docs/auth/capabilities>
- Liveblocks pricing and permissions: <https://liveblocks.io/pricing>,
  <https://liveblocks.io/docs/products/sync/permissions>
- Railway pricing and deployments:
  <https://docs.railway.com/reference/pricing/plans>,
  <https://docs.railway.com/reference/deployments>
- Fly.io pricing and autostop: <https://docs.fly.io/about/pricing>,
  <https://docs.fly.io/reference/fly-proxy-autostop-autostart>
- Next.js on Cloudflare Workers:
  <https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/>,
  <https://github.com/cloudflare/vinext>, <https://opennext.js.org/cloudflare>
- Durable Objects WebSockets, lifecycle, deploys and pricing:
  <https://developers.cloudflare.com/durable-objects/best-practices/websockets/>,
  <https://developers.cloudflare.com/changelog/post/2026-10-30-durable-objects-deferred-code-updates/>,
  <https://developers.cloudflare.com/durable-objects/platform/pricing/>
- PartyServer and partysocket:
  <https://github.com/cloudflare/partykit/tree/main/packages/partyserver>
- Cloudflare Containers: <https://developers.cloudflare.com/containers/faq/>

Not confirmed from a primary source: whether a Durable Object exported from
a custom server entry runs under every local dev flow. It does under
`vite dev` and `vite preview` with the Cloudflare Vite plugin, which is what
this repo uses and tests.

## The framework decision

With Cloudflare as the host, the choice was between Next.js 16 and TanStack
Start. Facts checked on 15 November 2026.

|                                | Next.js 16 on Cloudflare                                                                                                                                                   | TanStack Start on Cloudflare                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| How it runs on Workers         | Through `vinext` (beta, Cache Components incomplete) or OpenNext (open bugs with Cache Components on 16.4). Cloudflare's official Next.js adapter is still in development. | Official guides from Cloudflare and from TanStack. Cloudflare built the Vite integration.  |
| Local development              | Next.js runs in Node. The Worker runtime is only used in a preview step.                                                                                                   | `vite dev` runs the server code in Cloudflare's local runtime, the same one as production. |
| Where the room server plugs in | A custom worker entry wrapped around an adapter's output.                                                                                                                  | A documented custom server entry (`src/server.ts`) that exports the Durable Object class.  |
| What this app uses of it       | Very little: no Server Components, caching or image pipeline.                                                                                                              | Routes, typed links and params, one server function, the server entry.                     |
| Maturity                       | Very mature, but not on this host.                                                                                                                                         | 1.0 stable since 13 October 2026. Young, with frequent releases.                           |

**Decision: TanStack Start.** The app is a client-rendered game driven by a
socket. Next.js's strengths go unused here, and on Cloudflare it works against
the platform. Moving to Cloudflare already meant replacing Socket.IO and the
in-memory store, so the framework changed in the same step, before any game
logic existed.

What it costs, plainly:

- The framework is one month past 1.0. Work from the current docs, not from
  memory.
- Static prerendering and SPA mode have open bugs with the Cloudflare plugin
  (TanStack/router issues 7481, 6330, 7740, 7527). This app uses plain server
  rendering, the default, which avoids both. Do not turn those features on
  without checking the issues.
- There is no `next/font`. Fonts are self-hosted with Fontsource packages
  (same open licences).

Sources:
<https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/>,
<https://tanstack.com/blog/tanstack-start-1-0>,
<https://tanstack.com/start/latest/docs/framework/react/guide/server-entry-point>,
<https://tanstack.com/start/latest/docs/framework/react/guide/hosting>,
<https://developers.cloudflare.com/workers/vite-plugin/>.

## App structure

```
avalon/
├── wrangler.jsonc               The Worker: entry file and the ROOM Durable Object binding
├── vite.config.ts               Cloudflare plugin, Tailwind, TanStack Start, React
├── src/
│   ├── server.ts                The Worker entry: sockets go to room objects, the rest to TanStack Start
│   ├── router.tsx               Router setup
│   ├── routes/                  File-based routes
│   │   ├── __root.tsx           Document shell, global styles, not-found page
│   │   ├── index.tsx            Landing: create or join a room
│   │   ├── room.$code.tsx       The room: lobby and game, one screen driven by RoomView
│   │   ├── api/health.ts        Liveness check (a server route)
│   │   └── design/              The design prototypes (removed after the pick)
│   ├── components/              Screens and components of the real app
│   ├── functions/rooms.ts       Server functions. `createRoom` is the only one
│   ├── shared/                  Used by both sides. Plain TypeScript, plus zod in schemas.ts only
│   │   ├── constants.ts         Game tables: team balance, quest sizes, fail rule, limits
│   │   ├── roles.ts             Role catalogue
│   │   ├── views.ts             RoomView: everything a client may ever see
│   │   ├── protocol.ts          Requests, messages, error codes. No runtime dependencies
│   │   ├── schemas.ts           zod validators for everything a browser can send
│   │   └── copy.ts              Player-facing sentences built from views
│   ├── server/                  Runs only in the Worker. Never imported by browser code
│   │   ├── room/room-object.ts  The Durable Object: storage, sockets, alarms
│   │   ├── room/state.ts        Room state and the rules for changing it. Pure
│   │   ├── room/project-view.ts The only function that turns room state into a RoomView
│   │   ├── room/code.ts         Room code generation
│   │   └── game/                The engine (next run): state, setup, reducer, knowledge
│   ├── client/                  Browser-only helpers
│   │   ├── connection.ts        The room WebSocket: reconnect, heartbeat, request and answer
│   │   ├── session.ts           Seat tokens in localStorage
│   │   ├── room-client.ts       Holds the latest RoomView
│   │   ├── use-room.ts          React hook over room-client
│   │   ├── use-hydrated.ts      True once React has taken over the page
│   │   ├── use-hold-to-reveal.ts  Press-and-hold privacy behaviour
│   │   └── sound/               Synthesised sound cues and ambience
│   └── design/                  Prototype-only: mock data, direction list, prototype bar
├── e2e/                         Playwright: *.e2e.ts (behaviour), *.shots.ts (screenshots)
├── scripts/                     contrast.mjs (WCAG checker), restart-check.mjs (rooms survive a restart)
├── bruno/                       Bruno collection for HTTP endpoints
└── docs/                        This document and the design specs
```

### Routes

| Route                  | Kind         | Purpose                                                                                                             |
| ---------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- |
| `/`                    | Page         | Enter a name and create a room, or enter a code to join.                                                            |
| `/room/$code`          | Page         | Everything from lobby to game over. The screen is chosen from `view.stage` and `view.phase.name`, not from the URL. |
| `/api/health`          | Server route | Returns `{ "status": "ok" }`.                                                                                       |
| `/api/socket/CODE`     | Not a route  | WebSocket upgrade, sent by `src/server.ts` straight to room CODE's Durable Object.                                  |
| `/design`, `/design/*` | Pages        | Design prototypes with mock data.                                                                                   |

The game is one route on purpose. Phase changes arrive over the socket, and a
URL per phase would let the address bar disagree with the room.

### Import rules

- **Browser code never imports `src/server/**` or `cloudflare:*`.** That
  covers `src/routes` (except `src/routes/api`), `src/components`,
  `src/client` and `src/design`. Room state and validators stay out of the
  browser bundle.
- **The browser reaches the server in two ways only:** the room WebSocket
  (`src/client/connection.ts`) and server functions in `src/functions` (the
  bundler replaces their bodies with a network call in the browser build).
- `src/shared/**` imports only other shared files, plus zod in `schemas.ts`.
  `protocol.ts` has no runtime dependencies, which keeps zod out of the
  browser bundle.

ESLint enforces these (`no-restricted-imports` in `eslint.config.mjs`). Typed
routes add a second net: a link to a route that does not exist is a type
error.

## The room object

`RoomObject` (`src/server/room/room-object.ts`) is the Durable Object class.
The Worker reaches a room with `env.ROOM.getByName(code)`.

**It sleeps, and its memory is wiped when it does.** Cloudflare puts the
object to sleep whenever it is not handling a message, and wakes it for the
next one. Three rules follow, and every change to this file must keep them:

1. **The room is saved after every change.** `RoomState` is plain JSON under
   one storage key. Fields on the class are only a cache of storage.
2. **Each socket remembers its own seat** in its attachment
   (`serializeAttachment({ playerId })`). Who is connected is read from the
   live sockets (`ctx.getWebSockets()`), never stored.
3. **Anything that must happen later is an alarm**, not a `setTimeout`. One
   object has one alarm, so `nextExpiryCheck` (and later the host hand-over)
   work out the earliest moment something is due.

What it does:

| Entry point          | When                                       | What happens                                                                                           |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `create(code, name)` | Called by the `createRoom` server function | Claims the object for a new room and returns the host's seat token. Returns null if the code is taken. |
| `fetch(request)`     | A browser opens `/api/socket/CODE`         | Accepts the WebSocket. If there is no room, says so and closes with code 4004.                         |
| `webSocketMessage`   | A browser sends a request                  | Validates the envelope and the payload, runs the handler, answers with an `ack`.                       |
| `webSocketClose`     | A socket goes away                         | Tells everyone else, and notes the moment if the room is now empty.                                    |
| `alarm`              | The room may have expired                  | Deletes an expired room, or sets the next check.                                                       |

Pure logic stays out of this file. `state.ts` holds the rules (create, join,
find a seat, presence, expiry) as functions from old state to new state, and
`project-view.ts` builds views. Both are tested in plain Node.

Heartbeats (`ping` and `pong`) are answered by Cloudflare without waking the
object.

## Game engine: a plain typed reducer

Chosen over XState v5.

- Avalon's flow is a short, mostly linear sequence of phases with a handful of
  branches. There are no parallel states, no nested states and no timers. A
  discriminated union for the phase and one `switch` covers it.
- The server must validate every action against the full state (is this
  player the leader, is this card legal for their alignment). A reducer that
  returns either a new state or an error does that directly.
- State is plain JSON. The room object writes the whole room to storage
  after every change (see [The room object](#the-room-object)), and plain
  JSON goes in and out of storage as it is. It is also trivial to test, to
  log and to feed to `projectView`.
- One less library and one less mental model in a small codebase.

The engine lives in `src/server/game/` and is pure: no sockets, no storage,
no clock, no `Math.random`. The room object calls it and saves the result.

```ts
// src/server/game/state.ts
interface GameState {
  playerIds: PlayerId[]; // seat order, fixed at start
  roles: Record<PlayerId, Role>;
  settings: GameSettings;
  questIndex: number; // 0 to 4
  leaderIndex: number; // index into playerIds
  rejections: number; // consecutive, for the current quest
  quests: FinishedQuest[]; // { team, failCount, outcome }
  proposals: ProposalRecord[]; // finished votes, with every vote
  phase: Phase;
  lady: { holderId: PlayerId; pastHolderIds: PlayerId[] } | null;
  ladyResults: Record<PlayerId, { playerId: PlayerId; alignment: Alignment }[]>;
}

type Phase =
  | { name: "role_reveal"; confirmedIds: PlayerId[] }
  | { name: "team_building"; draftIds: PlayerId[] }
  | {
      name: "team_vote";
      teamIds: PlayerId[];
      votes: Partial<Record<PlayerId, Vote>>;
    }
  | {
      name: "quest";
      teamIds: PlayerId[];
      cards: Partial<Record<PlayerId, QuestCard>>;
    }
  | { name: "lady" }
  | { name: "assassination" }
  | {
      name: "game_over";
      winner: Alignment;
      reason: WinReason;
      assassinTargetId: PlayerId | null;
    };

// src/server/game/engine.ts
interface Rng {
  /** Uniform integer in [0, max). */
  int(max: number): number;
}

function startGame(
  input: { playerIds: PlayerId[]; settings: GameSettings },
  rng: Rng,
): GameState;

function applyAction(
  state: GameState,
  actorId: PlayerId,
  action: GameAction, // from src/shared/protocol.ts
  rng: Rng,
): { ok: true; state: GameState } | { ok: false; error: ProtocolError };

// src/server/game/setup.ts
function rolesFor(playerCount: PlayerCount, settings: GameSettings): Role[];
function settingsBlockers(
  playerCount: number,
  settings: GameSettings,
): StartBlocker[];

// src/server/game/knowledge.ts
function knowledgeFor(state: GameState, viewerId: PlayerId): Knowledge;
```

Rules the engine enforces (the full rules are in `.claude/rules/game-rules.md`
and `.claude/rules/roles.md`):

- **Setup.** Roles are Merlin and the Assassin, plus the optional roles the
  host chose, filled with Loyal Servants and Minions to match `TEAM_BALANCE`.
  Roles are shuffled with the injected `Rng`. The first leader is random.
- **Role reveal.** The game waits in `role_reveal` until every player sends
  `confirm_role`.
- **Team building.** Only the leader may `draft_team` (live, for others to
  watch) and `propose_team`. Team size comes from `QUEST_TEAM_SIZES`.
- **Vote.** Each player votes once. Votes are stored but not shown. When the
  last vote arrives, the engine appends a `ProposalRecord` with every vote
  (the simultaneous reveal), then moves on: a strict majority approves; a tie
  rejects. The leader moves one seat clockwise after every vote. The fifth
  rejection in a row ends the game for Evil.
- **Quest.** Only team members play. A Good player's `fail` is refused. When
  the last card arrives the engine counts the Fail cards, stores only the
  count, and discards who played what. The quest fails on `failsRequired`
  Fail cards.
- **After a quest.** Three failures: Evil wins. Three successes: the
  `assassination` phase. Otherwise the Lady of the Lake phase if it applies
  (after quests 2, 3 and 4), then the next `team_building`.
- **Assassination.** Only the Assassin may `assassinate`. The candidates are
  every player except the Assassin and the allies the Assassin already knows
  (so Oberon is not excluded, which would give him away).
- **Game over.** All roles become public.

There are no reveal phases and no server timers. A vote result or a quest
result is a fact in the state (`proposals`, `quests`). The client notices that
the list grew and plays the reveal animation; the game has already moved on.
A player who reconnects simply sees the current state. No timers also means
nothing in the engine needs the room object to stay awake.

## Room and session state

```ts
// src/server/room/state.ts
interface RoomState {
  code: RoomCode; // 4 letters, see below
  hostId: PlayerId;
  players: PlayerRecord[]; // seat order
  settings: GameSettings;
  createdAt: number;
  emptySince: number | null; // when the last seated socket left
  game: GameState | null; // null means "in the lobby" (typed as null until the engine lands)
}

interface PlayerRecord {
  id: PlayerId; // random UUID
  name: string;
  tokenHash: string; // SHA-256 of the seat secret, hex
  joinedAt: number;
  ready: boolean;
}
```

- **Room codes** are 4 letters from `BCDFGHJKMNPQRSTVWXZ`: no vowels (so no
  accidental words), no look-alike letters, letters only (so a phone keyboard
  never has to switch to digits). About 130,000 codes. The Worker picks a
  random code and asks that room object to `create`; if the object already
  holds a room it tries another code.
- **Names** are 1 to 16 characters, letters and digits in any script plus
  space, hyphen, apostrophe and underscore, unique in the room ignoring case.
- **Expiry.** A room with nobody connected for 10 minutes is deleted, and any
  room is deleted after 12 hours. An alarm does this.
- **Storage.** One key per room in the room object's own storage. There is no
  other database.

## Player identity and reconnection

There are no accounts. A player is a seat in one room.

1. **Create.** The landing page calls the `createRoom` server function with a
   name. It returns the room code and the host's seat token. This is the one
   room operation that is not a socket message, because there is no room to
   send it to yet.
2. **Join.** The browser opens the room's socket and sends `room:join` with a
   name. The room makes a `PlayerRecord` and a random 256-bit secret, stores
   only the secret's hash, and answers with the seat token `CODE.secret`.
3. **Remember.** The browser stores the token in `localStorage` under
   `avalon:seat:CODE`.
4. **Resume.** On every socket open (first load, refresh, phone waking up,
   network change, server restart) the browser sends `room:resume` with the
   token. The room binds the socket to the seat and sends the current
   `RoomView`. A token that matches nothing clears the stored token and shows
   the join form.

Details:

- A seat can have several sockets (two tabs, or a reload overlapping the old
  page). The player counts as connected while at least one is open.
- A disconnected player keeps their seat, in the lobby and in the game. The
  game simply waits for them. Others see them as "away".
- The host can remove a player in the lobby (`lobby:kick`). Not during a game.
- If the host is away for 60 seconds, the host role passes to the next
  connected player in seat order. This is an alarm in the room object, not
  part of the engine.
- Tokens are opaque, not JWTs. The room has to look the seat up anyway, so a
  signed token adds a secret to manage and nothing else. A token dies with
  its room.
- The token is in `localStorage`, not a cookie: it is sent in a socket
  message, so there is no cross-site request risk. Names are validated and
  React escapes output, which covers the script-injection risk that
  `localStorage` carries.
- Testing several players in one browser needs separate profiles or private
  windows, because tabs share `localStorage`. Playwright uses separate
  contexts.

## How role-filtered state reaches each client

```
phone A ── game:action ──▶ room object ──▶ applyAction(state, A, action) ──▶ new state ──▶ storage
                                                                                 │
                         for each socket with a seat P:                          ▼
phone P ◀───── state ────── socket.send ◀───────────────────── projectView(state, P, connected)
```

1. Every in-game move is one request, `game:action`, validated with zod and
   then by the reducer.
2. If the reducer accepts it, the room's state is replaced and saved.
3. `publish` loops over the sockets. For each seated socket it calls
   `projectView(state, playerId, connected)` and sends the result on that
   socket. There is no broadcast.

`projectView` is the only code allowed to turn room state into something sent
to a client. What it does per viewer:

| Data                     | What the viewer gets                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Own role and alignment   | Yes (`you.role`, `you.alignment`).                                                                                                                                                                     |
| Other players' roles     | Never, until `game_over`.                                                                                                                                                                              |
| First-night knowledge    | `you.knowledge`, built by `knowledgeFor`: Merlin gets Evil ids without Mordred; Percival gets Merlin and Morgana in seat order; Evil roles get allies without Oberon; Oberon and Servants get nothing. |
| Votes in progress        | Who has voted (`votedIds`) and the viewer's own vote. Other votes appear only in the finished `ProposalRecord`.                                                                                        |
| Quest cards in progress  | Who has played (`playedIds`) and the viewer's own card.                                                                                                                                                |
| Quest result             | The number of Fail cards. Never who played what; the server has already discarded that.                                                                                                                |
| Lady of the Lake results | Only the results the viewer saw themselves.                                                                                                                                                            |

The view types in `src/shared/views.ts` have no field that could carry another
player's role before the end, so a leak would have to be added on purpose and
would show up in review and in the leak tests (see [Testing](#testing)).

The cross-cutting rules from the old `CLAUDE.md` still hold and map to this
design as follows: never trust the client (the reducer validates everything);
simultaneous reveals (votes and cards are stored until the last one arrives);
quest cards shuffled server-side (stronger here: only the count is kept and
sent, so there is no order to leak).

## Protocol

Defined in `src/shared/protocol.ts`, validated by `src/shared/schemas.ts`.

**Messages.** JSON over the room's WebSocket.

| Direction       | Shape                                 | Meaning                                                                                        |
| --------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Browser to room | `{ id, event, payload }`              | A request. `id` is a number the browser picks.                                                 |
| Room to browser | `{ type: "ack", id, result }`         | The answer to request `id`: `{ ok: true, data }` or `{ ok: false, error: { code, message } }`. |
| Room to browser | `{ type: "state", view }`             | The full `RoomView` for this player.                                                           |
| Room to browser | `{ type: "closed", reason }`          | The room is gone for this socket. No reconnect follows.                                        |
| Both            | the text `ping`, answered with `pong` | Heartbeat.                                                                                     |

**Requests.**

| Request          | Payload                            | Who             | Status                        |
| ---------------- | ---------------------------------- | --------------- | ----------------------------- |
| `createRoom`     | `{ name }`                         | anyone          | Implemented (server function) |
| `room:join`      | `{ name }`                         | anyone          | Implemented                   |
| `room:resume`    | `{ token }`                        | seat holder     | Implemented                   |
| `room:watch`     | none                               | anyone, no seat | Next run                      |
| `room:leave`     | none                               | seated, lobby   | Next run                      |
| `lobby:ready`    | `{ ready }`                        | seated          | Next run                      |
| `lobby:settings` | `{ optionalRoles, ladyOfTheLake }` | host            | Next run                      |
| `lobby:kick`     | `{ playerId }`                     | host            | Next run                      |
| `lobby:start`    | none                               | host            | Next run                      |
| `game:action`    | `GameAction` (see below)           | depends         | Next run                      |
| `room:reset`     | none                               | host            | Next run                      |

`GameAction` is one of: `confirm_role`, `draft_team { playerIds }`,
`propose_team { playerIds }`, `vote { vote }`, `play_card { card }`,
`lady_examine { targetId }`, `assassinate { targetId }`.

The room sends one kind of state message: a complete `RoomView`. There are no
partial updates and no per-event messages. A view is a few kilobytes at most,
so sending all of it is cheap, and it removes a whole class of ordering and
reconnect bugs.

A request the room does not handle yet is answered with `NOT_ALLOWED`, so a
newer client against an older room fails politely.

## Client

- `src/client/connection.ts` owns the WebSocket: it reconnects with a growing
  delay, reconnects at once when the tab or the network comes back, sends a
  heartbeat so a phone that slept notices a dead socket, and turns requests
  into promises that always resolve (with an `OFFLINE` error if the socket is
  down). Nothing above it knows the transport is a WebSocket.
- `src/client/room-client.ts` keeps the latest view and resumes the seat on
  every open. `useRoom(code)` exposes it to React with `useSyncExternalStore`.
- Screens are pure functions of the view: `stage` picks lobby or game,
  `phase.name` picks the game screen. The client holds no game state of its
  own beyond short-lived UI state (a selection in progress, an open sheet).
- Reveal animations are triggered when `view.proposals` or the number of
  finished quests grows between two views. On first load nothing animates.
- Secret content uses `useHoldToReveal`: hidden by default, visible only
  while pressed, hidden again on release, blur or tab switch.
- Quest cards must not give a player's side away to someone glancing at their
  phone. Both cards look the same and both can be tapped by everyone. A Good
  player's Fail is refused by the room, and the refusal is shown only after
  that tap. Once a vote or a card is locked, the screen says only that it is
  locked; the player's own choice is shown again only on press and hold. (The
  prototypes do not do this yet: they show Fail as disabled for a Good
  player. Phase 3 fixes it.)
- Forms read their fields when they are submitted (not from React state), and
  submit buttons stay disabled until the page has hydrated (`useHydrated`).
  Nothing typed early is lost, and an early tap cannot trigger the browser's
  own form submission.
- Sound is synthesised in the browser (`src/client/sound`), and stays off
  until the player turns it on.
- No Zustand (one server-sent object is the whole store) and no shadcn/ui
  (the chosen direction's components are bespoke; native elements such as
  `<dialog>` cover the rest).

## Deployment

First deployed on 16 November 2026, with the owner's approval, to the owner's
Cloudflare account: <https://avalon.hong-ladder.workers.dev>. Every later
deploy still needs the owner's go-ahead.

| Step    | What                                                                                                                                      |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Account | The owner's Cloudflare account, signed in with `wrangler login`.                                                                          |
| Deploy  | `pnpm run deploy` (builds, then `wrangler deploy`). The first deploy created the Worker and the `RoomObject` class from `wrangler.jsonc`. |
| Address | `avalon.hong-ladder.workers.dev`. A custom domain is optional.                                                                            |
| Secrets | None. There are no environment variables.                                                                                                 |
| Check   | `E2E_BASE_URL=https://avalon.hong-ladder.workers.dev pnpm test:e2e` runs the browser tests against the live site.                         |

### Measured CPU time on the live Worker

Measured on 16 November 2026 with `wrangler tail avalon --format json` while
requesting each address 30 times (the tail samples, so counts are a little
under 30). The free plan allows 10 ms of CPU per request. Cloudflare's limits
page says there is some flexibility for a Worker that runs over infrequently,
and that one that runs over consistently is stopped with error 1102.

| Request                              | Median | 90th percentile | Slowest | Over 10 ms |
| ------------------------------------ | ------ | --------------- | ------- | ---------- |
| `/` (plain landing)                  | 3 ms   | 6 ms            | 13 ms   | 1 of 26    |
| `/room/<code>` (plain room screen)   | 3 ms   | 5 ms            | 6 ms    | 0 of 23    |
| `/design/starlit` (landing with art) | 21 ms  | 37 ms           | 40 ms   | 25 of 27   |
| `/design/starlit/table/result`       | 23 ms  | 42 ms           | 43 ms   | 25 of 25   |
| Room socket messages and room object | 0 ms   | 2 ms            | 2 ms    | none       |

Every request still returned 200, and none was reported as `exceededCpu`. That
is the flexibility, not a guarantee.

What this means: the real-time side and the plain pages are far inside the free
plan. Server-rendering Starlit Vale's art is consistently over it. Starlit Vale
is the chosen direction, so this is settled as follows, and Phase 0 carries it
out:

- The Worker sends a light page: the layout, the text and the form. The night
  sky, the camp scene, the seat ring and the other large drawings are rendered
  in the browser only (a client-only wrapper around those components, with a
  plain background colour until they appear).
- `/room/$code` gains nothing from server rendering, because everything on it
  comes from the socket. It is rendered in the browser.
- Phase 0 is not done until the 90th percentile for `/` and `/room/<code>` on
  the live Worker is under 10 ms, measured the same way.
- If that cannot be reached, the fallback is the Workers Paid plan (5 USD a
  month), which needs the owner's approval.

Changing the Durable Object class (renaming or deleting it) needs a new entry
under `migrations` in `wrangler.jsonc`. Changing `RoomState` in a way old
stored rooms cannot be read as needs either a version field and an upgrade
step in `load`, or a deploy at a time when no rooms exist (rooms live at most
12 hours).

## Testing

| Layer               | Tool                                              | What it covers                                                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared tables       | Vitest (`src/shared/*.test.ts`)                   | Team balance, quest sizes, the two-fail rule, name and code cleanup.                                                                                                                                                                                                                             |
| Room rules          | Vitest (`src/server/room/*.test.ts`)              | Create, join, seat tokens, presence, expiry, and that state is plain JSON. Clock and randomness are passed in.                                                                                                                                                                                   |
| Engine (next run)   | Vitest (`src/server/game/*.test.ts`)              | Every phase transition and rule as table-driven cases. Seeded random full games that must always finish and never throw.                                                                                                                                                                         |
| View projection     | Vitest                                            | The knowledge matrix for every role. A leak test: for every viewer at every step of a seeded game, the serialized view contains no other player's role, no unrevealed vote and no quest card but their own.                                                                                      |
| Room object and app | Playwright (`e2e/*.e2e.ts`)                       | Separate browser contexts as separate phones, against the built Worker in Cloudflare's local runtime. Now: create, join, presence, drop, return, and that each browser is only ever sent its own view. Next run: a full five-player game with a fixed seed (`AVALON_SEED`), at a phone viewport. |
| Restart             | `pnpm test:restart` (`scripts/restart-check.mjs`) | A room and its seats survive the server process being stopped and started, with no page reload.                                                                                                                                                                                                  |
| HTTP                | Bruno (`bruno/`)                                  | The health endpoint.                                                                                                                                                                                                                                                                             |
| Design              | Playwright (`e2e/*.shots.ts`)                     | Screenshots of every prototype screen at 390px and 1440px, with no console errors and no sideways scrolling.                                                                                                                                                                                     |

The room object is tested through real browsers and a real local Worker, not
with a mocked runtime. `pnpm lint`, `pnpm typecheck`, `pnpm test`,
`pnpm build`, `pnpm test:e2e` and `pnpm test:restart` run in GitHub Actions on
every pull request (`.github/workflows/ci.yml`).

## What happened to the decisions in `plans/01-lobby-endpoints.md`

That plan was written for the NestJS server and has been deleted. Its locked
decisions were treated as input.

| #   | Old decision                                                                       | Now                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | HTTP creates the room, then the client opens a socket                              | **Kept in spirit.** Creating a room is a server function, because the room object does not exist yet. Joining and everything after are socket requests. |
| 2   | Short-lived signed JWT per player                                                  | **Dropped.** Opaque random seat token, hashed in the room. Nothing to sign, no secret to configure, dies with the room.                                 |
| 3   | Ready state is sticky                                                              | **Kept.** Ready never resets by itself.                                                                                                                 |
| 4   | Host disconnect destroys the room at once                                          | **Dropped.** Phones lock their screens all the time. The host's seat is held like anyone's, and the host role moves on after 60 seconds away.           |
| 5   | Settings checked for shape on update, for rules at start                           | **Kept, and extended.** The lobby view also carries `startBlockers`, so the host sees why Start is disabled before pressing it.                         |
| 6   | Names: unique ignoring case, 1 to 20 ASCII characters                              | **Changed.** Still unique ignoring case. 1 to 16 characters so they fit a seat label on a phone, and letters in any script so real names work.          |
| 7   | Host has a ready toggle; start needs everyone ready                                | **Kept.**                                                                                                                                               |
| 8   | Host-only room is removed after 5 minutes                                          | **Replaced** by one rule: any room with nobody connected for 10 minutes is removed, and every room after 12 hours.                                      |
| 9   | A non-host's seat is held; host can kick; start needs everyone connected and ready | **Kept**, and now applies to the host too.                                                                                                              |
| n/a | 6-character codes with digits                                                      | **Changed** to 4 letters, easier to say and type across a table.                                                                                        |
| n/a | One socket per player (new connection kicks the old)                               | **Changed.** Several sockets per seat are allowed.                                                                                                      |
| n/a | One event per thing that happens                                                   | **Replaced** by one full `state` message per player.                                                                                                    |
| n/a | In-memory rooms on one Node server                                                 | **Replaced** by one Durable Object per room with stored state.                                                                                          |

## Implementation plan for the next run

Each phase ends with `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
`pnpm test:e2e` and `pnpm test:restart` passing, and one commit or more.
Phases are in dependency order. Nothing in them needs a new decision.

Two pieces of work come before Phase 0, and both have step-by-step plans an
agent session can follow:

| Order | Work                                                          | Plan                                             |
| ----- | ------------------------------------------------------------- | ------------------------------------------------ |
| 1     | Code standards: oxlint, folder layout, pre-commit hook        | `docs/plans/01-standards-and-ci-cd.md`, Part A   |
| 2     | CI/CD: a preview for every pull request, deploy on merge      | `docs/plans/01-standards-and-ci-cd.md`, Part B   |
| 3     | Phase 0                                                       | `docs/plans/02-phase-0-starlit-design-system.md` |
| 4     | TypeScript 7 and type-aware lint, before Phase 1 if it passes | `docs/plans/01-standards-and-ci-cd.md`, Part C   |

Status is tracked in the owner's Notion page "Avalon: Developer Roadmap".

In every phase that touches the room object: the three rules in
[The room object](#the-room-object) hold. New state goes in `RoomState` and is
saved; nothing is kept only in a field; anything timed is an alarm.

### Phase 0: adopt the chosen design direction

The full plan is `docs/plans/02-phase-0-starlit-design-system.md`. In short:

- Starlit Vale's tokens, component classes, motion and fonts move from
  `src/routes/design/starlit` to `src/styles`, on `:root`.
- Its primitives and drawings move to `src/components/ui` and
  `src/components/art`. Its lobby, role and table components stay in the
  prototype until the phase that builds each screen moves them.
- Ember & Rune and Lavender Vigil are deleted, with their specs, screenshots
  and fonts.
- **The Starlit prototype and its motion gallery stay** at `/design/starlit`
  as the reference for screens that are not built yet (owner's decision, 16
  November 2026). They import the moved code, so there is one copy of
  everything. They are deleted when Phase 4 ends.
- `/` and the `/room/$code` placeholder are restyled with the real components.
- The large drawings render in the browser only, and `/room/$code` renders in
  the browser only, as settled under
  [Measured CPU time on the live Worker](#measured-cpu-time-on-the-live-worker).
- Done when: `/` and `/room/$code` look like Starlit Vale at 390px and 1440px
  (screenshots), the existing e2e tests still pass, and on the live Worker the
  90th percentile CPU time for both is under 10 ms.

### Phase 1: the lobby

- Room: handlers for `lobby:ready`, `lobby:settings`, `lobby:kick` and
  `room:leave` in `room-object.ts`, with the rules as pure functions in
  `state.ts`. Host-only checks. Host hand-over after 60 seconds away, as an
  alarm (extend `nextExpiryCheck` into one "what is due next" function). A
  kicked player's sockets get `closed` with reason `kicked`.
  `settingsBlockers` in `src/server/game/setup.ts`, added to `startBlockers`
  in `projectView`. A per-socket message budget kept in the socket's
  attachment.
- Client: the real lobby screen, driven by `LobbyView`. Move the prototype's
  lobby components from `src/routes/design/starlit/-components/lobby` to
  `src/components/lobby` and make the prototype import them from there:
  code with copy and share, player list, ready toggle, host settings, start
  button with blocker messages (`startBlockerMessages`).
- Tests: unit tests for every rule and refusal; e2e with five contexts that
  ready up until Start enables; the restart check extended to a lobby with
  ready states.

### Phase 2: the engine

- `src/server/game/`: `state.ts`, `rng.ts` (crypto-backed and seeded
  versions, `shuffle`), `setup.ts` (`rolesFor`, `settingsBlockers`),
  `knowledge.ts`, `engine.ts` (`startGame`, `applyAction`) for
  `confirm_role`, `draft_team`, `propose_team`, `vote`, `play_card`, with all
  win and loss conditions except assassination and the Lady.
- `RoomState.game` becomes `GameState | null`. `lobby:start` calls
  `startGame`. `game:action` calls `applyAction`, saves, then publishes.
- `projectView` produces `GameView` exactly as described under
  [How role-filtered state reaches each client](#how-role-filtered-state-reaches-each-client).
- An `AVALON_SEED` variable (`vars` in `wrangler.jsonc`, set only for tests)
  selects the seeded `Rng` for e2e runs.
- Tests: the engine and projection rows of the testing table, including the
  leak test. This phase has no UI.

### Phase 3: the game screens

- Role reveal, then the table for `team_building`, `team_vote` and `quest`,
  from the prototype components (moved from the prototype's `role` and `table`
  folders to `src/components/role` and `src/components/table`), driven by
  `GameView` and sending
  `game:action`. Vote and quest reveal sequences triggered by view changes,
  with the motion and sound from the chosen direction's spec. A "my role"
  control that uses `useHoldToReveal`. Away markers on seats. Quest cards
  follow the privacy rule under [Client](#client): both cards look the same
  for every player.
- Tests: e2e for a full five-player game with a fixed seed up to three quest
  results, at a phone viewport.

### Phase 4: the end of the game

- Engine: `assassination`, `assassinate`, `game_over` with all four win
  reasons. `room:reset` returns the room to the lobby with the same seats.
- Screens: assassination (Assassin picks, everyone else waits), game over with
  every role revealed, play again.
- Tests: engine cases for each ending; e2e reaching both a Good and an Evil
  win.
- Last: delete the Starlit prototype (`src/routes/design`, `src/design`,
  `e2e/design.shots.ts`, `docs/design/screenshots/starlit`). Every screen it
  showed now exists for real.

### Phase 5: the Lady of the Lake (required)

- Engine: the `lady` phase after quests 2, 3 and 4 when the rule is on, the
  `lady_examine` action, the token passing to the examined player, and the
  rule that a past holder cannot be examined. The first holder is the player
  to the first leader's right.
- View: `ladyHolderId` is public. The result goes only to the holder, in
  `you.ladyResults`. Everyone sees who examined whom, never the answer.
- Screens: the holder picks a player; the answer is shown with
  `useHoldToReveal`; everyone else sees a waiting state. A marker on the
  holder's seat. The lobby switch already exists.
- Tests: engine cases (order, eligibility, exactly three uses), a leak test
  that no other viewer's view contains the result, and one e2e game with the
  rule on.

### Phase 6: the shared table screen (required)

A laptop or TV that shows the table to the whole room. It has no seat and
sees nothing secret.

- Protocol: the `room:watch` request. The socket's attachment becomes
  `{ playerId: null, watching: true }`. At most four watchers per room.
- View: a new `WatchView` (`stage: "watch"`) in `src/shared/views.ts`, built
  by a new `projectWatchView(state, connected)` next to `projectView`. It
  carries only public facts: players, settings, quests, score, leader,
  rejected-team count, finished votes, who has voted or played so far, the
  Lady's holder, and at the end the roles. It has no `you`, no knowledge, no
  unrevealed vote and no quest card. To keep the two views honest,
  `PhaseView` is split into a public part that both use and the private
  fields that only `GameView` adds (`youConfirmed`, `yourVote`, `onTeam`,
  `yourCard`).
- Delivery: `publish` also sends the one watch view to every watching socket.
  This is the only view sent to more than one socket, and it is safe to do so
  because it contains nothing private. Update the rule in `CLAUDE.md` to say:
  only the output of `projectView` and `projectWatchView` may be sent.
- Route: `/room/$code/watch`, linked from the lobby ("Show the table on a big
  screen"). Desktop-first layout from the prototype's 1440px table. No
  controls. This is where the full reveal animations, ambience and sound
  play; phones stay quieter.
- Tests: a leak test that the serialized watch view never contains a role
  before `game_over`, a vote before the reveal, or any card; an e2e with a
  watcher context beside the player contexts.

### Phase 7: resilience and polish

- Mid-game reconnect e2e (close a context during a vote, reopen, vote), and
  the restart check extended to a game in progress.
- Offline and reconnecting banners, error messages from failed requests,
  empty and loading states.
- Hardening: an `Origin` check on socket upgrades in `src/server.ts`, limits
  on room creation per address, the per-socket message budget from Phase 1
  reviewed.
- Accessibility pass (keyboard, screen reader labels, reduced motion) and a
  performance check on a mid-range phone profile.

### Phase 8: deploy the finished game (needs approval)

- `pnpm run deploy`, then run the browser tests against the live site, measure
  CPU time as under [Deployment](#deployment), and play one whole game on two
  phones.

## Owner decisions

Answered on 15 and 16 November 2026:

| Question                                                                 | Answer                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------- |
| Host                                                                     | Cloudflare (Workers and Durable Objects).         |
| Framework                                                                | TanStack Start, with one Durable Object per room. |
| Room codes of 4 letters instead of 6 characters                          | Confirmed.                                        |
| The room survives the host leaving; host role passes on after 60 seconds | Confirmed.                                        |
| Shared table screen and Lady of the Lake                                 | Both required in the next run (Phases 5 and 6).   |
| Design direction                                                         | Starlit Vale, with its motion and sound. Final.   |
| First deploy to Cloudflare                                               | Approved and done. Later deploys: ask first.      |

Also answered on 16 November 2026:

| Question                           | Answer                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Linter and formatter               | oxlint replaces ESLint. Prettier stays.                                                   |
| Starlit prototype during the build | Kept as a reference until Phase 4 ends. The other two directions go in Phase 0.           |
| Deploys                            | Automatic on merge to `main`, with a preview for every pull request. Merging is approval. |
| Roadmap                            | Tracked in Notion. The repo stays the source for how things are built.                    |

Nothing is open.
