# Avalon architecture

Status: decided at checkpoint 1 (November 2026). The next run builds the full
game from the plan at the end of this document without reopening these
decisions. Open points that need the owner's answer are listed in
[Questions for the owner](#questions-for-the-owner).

## Decisions at a glance

| Topic              | Decision                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| App                | One Next.js 16 app (App Router, React 19, TypeScript strict, Tailwind CSS v4), one `package.json`, pnpm.               |
| Real-time          | Socket.IO attached to the same Node HTTP server as Next.js, through a custom server (`server.ts`). One port.           |
| Hosting            | One long-running Node service with exactly one instance (Railway recommended, Fly.io equivalent). Not Vercel.          |
| Game logic         | A plain typed reducer on the server. No XState.                                                                        |
| Room state         | In memory, in the single Node process. Rooms are temporary. No database.                                               |
| Identity           | No accounts. A random seat token per player per room, kept in the browser's `localStorage`, hashed on the server.      |
| Hidden information | The server sends each player one full, filtered view of the room (`RoomView`). Raw game state never leaves the server. |
| Client state       | The latest `RoomView`, held in a tiny store read with `useSyncExternalStore`. No Zustand, no client game logic.        |
| UI kit             | Hand-built components on design tokens. No shadcn/ui.                                                                  |
| Tests              | Vitest for logic and sockets, Playwright for multi-browser flows, Bruno for the HTTP health check.                     |

## The real-time decision

### The constraint, and what changed

The game needs a connection that stays open, and a server that owns the game
state and decides what each player may see.

The brief for this checkpoint assumed that Vercel functions cannot hold
WebSockets. **That is no longer true.** Vercel made WebSocket support in
Vercel Functions generally available on 20 October 2026 (public beta since
June 2026). This document therefore compares three options, not two. The
decision below still stands, for reasons that have nothing to do with whether
Vercel can open a socket.

Facts in this section were checked against vendor pages on 15 November 2026.
Sources are listed at the end of the section. Prices and limits change, so
check them again before paying for anything.

### Option A: one Next.js app on a custom Node server, one always-on service

`server.ts` creates one Node HTTP server. Next.js handles normal requests.
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
  keep in sync. State is lost when the process restarts (see
  [Deploys and restarts](#deploys-and-restarts)).
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

### Comparison

|                                   | A: custom server, one service     | B: Vercel + PartyServer             | B: Vercel + Ably                         | C: Vercel WebSockets + Redis               |
| --------------------------------- | --------------------------------- | ----------------------------------- | ---------------------------------------- | ------------------------------------------ |
| Pieces to deploy                  | 1                                 | 2                                   | 3 (Vercel, Ably, database)               | 2 (Vercel, Redis)                          |
| "One Next.js app"                 | Yes (not on Vercel)               | No (game code is a separate Worker) | Yes for code, plus two services          | Yes for code, plus one service             |
| Where game state lives            | Process memory                    | Durable Object memory and storage   | External database                        | Redis                                      |
| Authoritative logic               | In process                        | In the room object                  | In stateless functions with locking      | In stateless functions with locking        |
| Per-player filtering              | Function call, emit per player    | Send per connection                 | One channel per player, token-restricted | Per socket, through publish and subscribe  |
| Reconnection                      | Socket.IO, then resume with token | Library, then resume with token     | Library, then resume with token          | Hand-written; forced every 5 to 13 minutes |
| Survives a deploy                 | No (unless snapshot is added)     | Yes if written to storage           | Yes                                      | Yes                                        |
| Local development matches hosting | Yes, same `server.ts`             | Two dev servers                     | Needs the service or a mock              | Needs Vercel's dev tooling and Redis       |
| Monthly cost at hobby scale       | About 5 USD                       | 0 to 5 USD                          | 0 USD until limits, then 35 USD and up   | 0 USD on free tiers (non-commercial)       |
| Accounts to create                | 1                                 | 2                                   | 3                                        | 2                                          |

### Decision: Option A

Avalon's state is tiny, changes a few times a minute, and has two hard
requirements: one authority, and secrets that never reach the wrong client.
The simplest design that meets both is one process that owns the state in
memory and decides, per player, what to send. Option A is exactly that and
nothing else:

- No distributed state. No locks, no cache, no publish and subscribe layer
  that carries secrets.
- Filtering is one pure function that can be tested exhaustively.
- One codebase, one process, one deploy. Local development runs the same
  `server.ts` that production runs, so the real-time path proven in this
  checkpoint is the path that ships.
- A flat, small bill.

What it costs, plainly: the app is not on Vercel, it runs as a single
instance, and a deploy interrupts games in progress. For a game played by a
handful of friends at a time, those are acceptable. A single Node process can
hold thousands of sockets, so the one-instance rule is not a practical limit
here.

**The small extra piece** the brief asked about: there is none at runtime.
The one thing that is not stock Next.js is `server.ts` (about 50 lines), and
the production build has a second step that bundles it (`pnpm build` runs
`next build` and then `esbuild`).

**What would change this decision.** Wanting Vercel hosting and previews more
than simplicity, or needing more than one instance or region. The move would
then be to Option C. The code is laid out so that only two files would be
replaced (`src/server/rooms/room-store.ts` and
`src/server/realtime/attach.ts`); the game engine, the view projection, the
protocol types and every screen stay as they are.

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

Not confirmed from a primary source: whether Railway's app sleeping closes
open WebSockets, and whether an idle open socket counts as load for Fly.io's
autostop. Both features must simply be switched off (see
[Deployment](#deployment)).

## App structure

```
avalon/
├── server.ts                    The custom server: Next.js + Socket.IO on one port
├── src/
│   ├── app/                     Next.js routes (App Router)
│   │   ├── page.tsx             Landing: create or join a room
│   │   ├── room/[code]/         The room: lobby and game, one client screen driven by RoomView
│   │   ├── api/health/route.ts  Liveness check
│   │   └── design/              The three design prototypes (removed after the pick)
│   ├── shared/                  Used by both server and browser. Plain TypeScript and zod only.
│   │   ├── constants.ts         Game tables: team balance, quest sizes, fail rule, limits
│   │   ├── roles.ts             Role catalogue
│   │   ├── views.ts             RoomView: everything a client may ever see
│   │   ├── protocol.ts          Socket events, payload schemas, error codes
│   │   └── copy.ts              Player-facing sentences built from views
│   ├── server/                  Runs only inside server.ts. Never imported by src/app or src/client.
│   │   ├── rooms/room-store.ts  In-memory rooms, seats, tokens, expiry
│   │   ├── realtime/attach.ts   Socket.IO handlers
│   │   ├── realtime/project-view.ts  The only function that turns server state into a RoomView
│   │   └── game/                The engine (next run): state, setup, reducer, knowledge
│   ├── client/                  Browser-only helpers
│   │   ├── socket.ts            The one Socket.IO connection per tab
│   │   ├── session.ts           Seat tokens in localStorage
│   │   ├── room-client.ts       Holds the latest RoomView
│   │   ├── use-room.ts          React hook over room-client
│   │   └── use-hold-to-reveal.ts  Press-and-hold privacy behaviour
│   └── design/                  Prototype-only: mock data, direction list, prototype bar
├── e2e/                         Playwright: *.e2e.ts (behaviour), *.shots.ts (screenshots)
├── bruno/                       Bruno collection for HTTP endpoints
├── scripts/contrast.mjs         WCAG contrast checker for tokens
└── docs/                        This document and the design specs
```

### Routes

| Route                  | Rendering                   | Purpose                                                                                                             |
| ---------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `/`                    | Static shell, client form   | Enter a name and create a room, or enter a code to join.                                                            |
| `/room/[code]`         | Static shell, client screen | Everything from lobby to game over. The screen is chosen from `view.stage` and `view.phase.name`, not from the URL. |
| `/api/health`          | Dynamic route handler       | Returns `{ "status": "ok" }` for the host's health check.                                                           |
| `/api/socket`          | Not a Next.js route         | The Socket.IO endpoint, handled by `server.ts` before Next.js sees it.                                              |
| `/design`, `/design/*` | Static                      | Design prototypes with mock data.                                                                                   |

The game is one route on purpose. Phase changes arrive over the socket, and a
URL per phase would let the address bar disagree with the server.

### The one rule about imports

Next.js bundles `src/app` separately from the custom server. A module imported
by both sides exists twice in memory. So:

- **Room and game state is only ever touched from `server.ts` and
  `src/server/**`.** Route handlers, Server Components and Server Actions must
  not import `src/server/**`. They would get an empty copy of the store.
- **Every read or change of room state goes over the socket.** There are no
  HTTP endpoints for rooms.
- `src/shared/**` may import only zod and other shared files, so it is safe on
  both sides.

ESLint enforces both rules (`no-restricted-imports` in `eslint.config.mjs`).
`src/server/**` does not use the `server-only` package, because that package
throws when imported outside the Next.js bundler, which is exactly where this
code runs.

## Game engine: a plain typed reducer

Chosen over XState v5.

- Avalon's flow is a short, mostly linear sequence of phases with a handful of
  branches. There are no parallel states, no nested states and no timers. A
  discriminated union for the phase and one `switch` covers it.
- The server must validate every action against the full state (is this
  player the leader, is this card legal for their alignment). A reducer that
  returns either a new state or an error does that directly.
- State is plain JSON. That makes it trivial to test, to log, to snapshot
  later, and to feed to `projectView`.
- One less library and one less mental model in a small codebase.

The engine lives in `src/server/game/` and is pure: no sockets, no clock, no
`Math.random`.

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
A player who reconnects simply sees the current state.

## Room and session state

`RoomStore` (`src/server/rooms/room-store.ts`) keeps a `Map` of rooms.

```ts
interface RoomRecord {
  code: RoomCode; // 4 letters, see below
  hostId: PlayerId;
  players: PlayerRecord[]; // seat order
  settings: GameSettings;
  createdAt: number;
  emptySince: number | null;
  game: GameState | null; // null means "in the lobby" (typed as null until the engine lands)
}

interface PlayerRecord {
  id: PlayerId; // random UUID
  name: string;
  tokenHash: Buffer; // SHA-256 of the seat secret
  joinedAt: number;
  ready: boolean;
  socketIds: Set<string>; // connected while not empty
}
```

- **Room codes** are 4 letters from `BCDFGHJKMNPQRSTVWXZ`: no vowels (so no
  accidental words), no look-alike letters, letters only (so a phone keyboard
  never has to switch to digits). About 130,000 codes. Most players will join
  from a shared link anyway.
- **Names** are 1 to 16 characters, letters and digits in any script plus
  space, hyphen, apostrophe and underscore, unique in the room ignoring case.
- **Expiry.** A sweep runs every minute. A room with nobody connected for 10
  minutes is deleted. Any room is deleted after 12 hours.
- **No persistence.** Rooms live and die with the process.

### Deploys and restarts

A restart ends every game in progress. For now the answer is: deploy when
nobody is playing. If that becomes annoying, the optional last phase of the
plan adds a snapshot: on `SIGTERM` write all rooms (they are plain JSON) to a
file on a volume, load it on boot, and let clients resume with their tokens.

## Player identity and reconnection

There are no accounts. A player is a seat in one room.

1. **Create or join.** The browser sends `room:create { name }` or
   `room:join { code, name }`. The server makes a `PlayerRecord` and a random
   256-bit secret, stores only the secret's hash, and answers with the seat
   token `CODE.secret`.
2. **Remember.** The browser stores the token in `localStorage` under
   `avalon:seat:CODE`.
3. **Resume.** On every socket connect (first load, refresh, phone waking up,
   network change) the browser sends `room:resume { token }`. The server finds
   the seat, binds the socket and sends the current `RoomView`. A token that
   matches nothing clears the stored token and shows the join form.

Details:

- A seat can have several sockets (two tabs, or a reload overlapping the old
  page). The player counts as connected while at least one is open.
- A disconnected player keeps their seat, in the lobby and in the game. The
  game simply waits for them. Others see them as "away".
- The host can remove a player in the lobby (`lobby:kick`). Not during a game.
- If the host is away for 60 seconds, the host role passes to the next
  connected player in seat order. This is a timer in `attach.ts`, not in the
  engine.
- Tokens are opaque, not JWTs. The server has to look the seat up in memory
  anyway, so a signed token adds a secret to manage and nothing else. A token
  dies with its room.
- The token is in `localStorage`, not a cookie: it is sent in a socket
  message, so there is no cross-site request risk, and it keeps Next.js
  rendering free of per-user data. Names are validated and React escapes
  output, which covers the script-injection risk that `localStorage` carries.
- Testing several players in one browser needs separate profiles or private
  windows, because tabs share `localStorage`. Playwright uses separate
  contexts.

## How role-filtered state reaches each client

```
phone A ── game:action ──▶ attach.ts ──▶ applyAction(state, A, action) ──▶ new state
                                                                              │
                         for each connected player P:                         ▼
phone P ◀── room:state ── emit to channel player:CODE:P ◀── projectView(room, P)
```

1. Every in-game move is one event, `game:action`, validated with zod and then
   by the reducer.
2. If the reducer accepts it, the room's state is replaced.
3. `publish(room)` loops over connected players. For each one it calls
   `projectView(room, playerId)` and emits the result to that player's own
   Socket.IO channel (`player:CODE:playerId`). Nothing is ever emitted to a
   whole room.

`projectView` is the only code allowed to turn server state into something
sent to a client. What it does per viewer:

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

Defined in `src/shared/protocol.ts`, typed on both ends. Every request has an
acknowledgement of type `Result<T>` (`{ ok: true, data }` or
`{ ok: false, error: { code, message } }`).

| Event            | Direction        | Payload                            | Who           | Status                            |
| ---------------- | ---------------- | ---------------------------------- | ------------- | --------------------------------- |
| `room:create`    | client to server | `{ name }`                         | anyone        | Implemented                       |
| `room:join`      | client to server | `{ code, name }`                   | anyone        | Implemented                       |
| `room:resume`    | client to server | `{ token }`                        | seat holder   | Implemented                       |
| `room:leave`     | client to server | none                               | seated, lobby | Next run                          |
| `lobby:ready`    | client to server | `{ ready }`                        | seated        | Next run                          |
| `lobby:settings` | client to server | `{ optionalRoles, ladyOfTheLake }` | host          | Next run                          |
| `lobby:kick`     | client to server | `{ playerId }`                     | host          | Next run                          |
| `lobby:start`    | client to server | none                               | host          | Next run                          |
| `game:action`    | client to server | `GameAction` (see below)           | depends       | Next run                          |
| `room:reset`     | client to server | none                               | host          | Next run                          |
| `room:state`     | server to client | `RoomView`                         | one player    | Implemented                       |
| `room:closed`    | server to client | `{ reason }`                       | one player    | Implemented (type), sent next run |

`GameAction` is one of: `confirm_role`, `draft_team { playerIds }`,
`propose_team { playerIds }`, `vote { vote }`, `play_card { card }`,
`lady_examine { targetId }`, `assassinate { targetId }`.

The server sends one kind of state message: a complete `RoomView`. There are
no partial updates and no per-event messages (`vote_revealed`, `quest_result`
and the rest of the old event list are gone). A view is a few kilobytes at
most, so sending all of it is cheap, and it removes a whole class of ordering
and reconnect bugs.

## Client

- `src/client/socket.ts` opens one same-origin Socket.IO connection per tab
  (WebSocket first, long-polling as a fallback).
- `src/client/room-client.ts` listens for `room:state` and keeps the latest
  view. `useRoom(code)` exposes it to React with `useSyncExternalStore`.
- Screens are pure functions of the view: `stage` picks lobby or game,
  `phase.name` picks the game screen. The client holds no game state of its
  own beyond short-lived UI state (a selection in progress, an open sheet).
- Reveal animations are triggered when `view.proposals` or the number of
  finished quests grows between two views. On first load nothing animates.
- Secret content uses `useHoldToReveal`: hidden by default, visible only
  while pressed, hidden again on release, blur or tab switch.
- Quest cards must not give a player's side away to someone glancing at
  their phone. Both cards look the same and both can be tapped by everyone.
  A Good player's Fail is refused by the server, and the refusal is shown only
  after that tap. Once a vote or a card is locked, the screen says only that
  it is locked; the player's own choice is shown again only on press and
  hold. (The prototypes do not do this yet: they show Fail as disabled for a
  Good player. Phase 3 fixes it.)
- No Zustand (one server-sent object is the whole store) and no shadcn/ui (the
  chosen direction's components are bespoke; native elements such as
  `<dialog>` cover the rest).

Next.js notes that affect client code: Cache Components is on, so routes are
static shells and dynamic `params` are read inside `<Suspense>`; and after a
client-side navigation the previous route stays mounted but hidden, so
effects must clean up and tests should locate elements by role.

## Deployment

Nothing was deployed in this checkpoint. Deploying needs the owner's approval.

**Recommended: Railway, one service.**

| Setting       | Value                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| Build command | `pnpm install --frozen-lockfile && pnpm build`                                                           |
| Start command | `pnpm start` (runs `node dist/server.mjs`)                                                               |
| Health check  | `GET /api/health`                                                                                        |
| Replicas      | Exactly 1. Never more.                                                                                   |
| App sleeping  | Off ("serverless" mode off). The process must stay up to hold sockets.                                   |
| Node          | 24 (`.nvmrc`, `engines`)                                                                                 |
| Environment   | `PORT` is provided by the platform. `NODE_ENV=production` is set by `pnpm start`. No secrets are needed. |

Fly.io works the same way with one machine, `auto_stop_machines` off and
`min_machines_running = 1`.

`next build` cannot use `output: "standalone"` with a custom server, so the
service needs `node_modules` at runtime. The platform's default Node builder
handles that. There is no Dockerfile yet (Docker was not available to test
one in this checkpoint).

## Testing

| Layer             | Tool                                                               | What it covers                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared tables     | Vitest (`src/shared/*.test.ts`)                                    | Team balance, quest sizes, the two-fail rule, name and code cleanup.                                                                                                                                        |
| Room store        | Vitest (`src/server/rooms/*.test.ts`)                              | Create, join, resume, seat tokens, connection tracking, expiry. Clock and randomness are injected.                                                                                                          |
| Engine (next run) | Vitest (`src/server/game/*.test.ts`)                               | Every phase transition and rule as table-driven cases. Seeded random full games that must always finish and never throw.                                                                                    |
| View projection   | Vitest                                                             | The knowledge matrix for every role. A leak test: for every viewer at every step of a seeded game, the serialized view contains no other player's role, no unrevealed vote and no quest card but their own. |
| Sockets           | Vitest + `socket.io-client` (`src/server/realtime/attach.test.ts`) | Real sockets against an in-process server: each player receives only their own view, resume, error answers.                                                                                                 |
| Browser flows     | Playwright (`e2e/*.e2e.ts`)                                        | Separate browser contexts as separate phones against the production build. Now: join, presence, drop, return. Next run: a full five-player game with a fixed seed (`AVALON_SEED`), at a phone viewport.     |
| HTTP              | Bruno (`bruno/`)                                                   | The health endpoint.                                                                                                                                                                                        |
| Design            | Playwright (`e2e/*.shots.ts`)                                      | Screenshots of every prototype screen at 390px and 1440px.                                                                                                                                                  |

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm test:e2e`
run in GitHub Actions on every pull request (`.github/workflows/ci.yml`).

## What happened to the decisions in `plans/01-lobby-endpoints.md`

That plan was written for the NestJS server and has been deleted. Its locked
decisions were treated as input.

| #   | Old decision                                                                       | Now                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | HTTP creates the room, then the client opens a socket                              | **Dropped.** Create and join are socket events. Room state lives in the custom server, which Next.js route handlers cannot reach (see the import rule). |
| 2   | Short-lived signed JWT per player                                                  | **Dropped.** Opaque random seat token, hashed on the server. Nothing to sign, no secret to configure, dies with the room.                               |
| 3   | Ready state is sticky                                                              | **Kept.** Ready never resets by itself.                                                                                                                 |
| 4   | Host disconnect destroys the room at once                                          | **Dropped.** Phones lock their screens all the time. The host's seat is held like anyone's, and the host role moves on after 60 seconds away.           |
| 5   | Settings checked for shape on update, for rules at start                           | **Kept, and extended.** The lobby view also carries `startBlockers`, so the host sees why Start is disabled before pressing it.                         |
| 6   | Names: unique ignoring case, 1 to 20 ASCII characters                              | **Changed.** Still unique ignoring case. 1 to 16 characters so they fit a seat label on a phone, and letters in any script so real names work.          |
| 7   | Host has a ready toggle; start needs everyone ready                                | **Kept.**                                                                                                                                               |
| 8   | Host-only room is removed after 5 minutes                                          | **Replaced** by one rule: any room with nobody connected for 10 minutes is removed, and every room after 12 hours.                                      |
| 9   | A non-host's seat is held; host can kick; start needs everyone connected and ready | **Kept**, and now applies to the host too.                                                                                                              |
| n/a | 6-character codes with digits                                                      | **Changed** to 4 letters, easier to say and type across a table.                                                                                        |
| n/a | One socket per player (new connection kicks the old)                               | **Changed.** Several sockets per seat are allowed.                                                                                                      |
| n/a | One event per thing that happens                                                   | **Replaced** by one full `room:state` view per player.                                                                                                  |

## Implementation plan for the next run

Each phase ends with `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`
and `pnpm test:e2e` passing, and one commit or more. Phases are in dependency
order. Nothing in them needs a new decision except the answers listed under
[Questions for the owner](#questions-for-the-owner).

### Phase 0: adopt the chosen design direction

- Move the winner's tokens from `src/app/design/<d>/theme.css` to `:root` in
  `src/app/globals.css` and its fonts to `src/app/layout.tsx`.
- Move its components from `src/app/design/<d>/_components` to
  `src/components/`, keeping the ones the real screens need.
- Delete `src/app/design/`, `src/design/`, the other two specs and their
  screenshots, the `screenshots` Playwright project and `e2e/design.shots.ts`.
  Keep the winner's spec as `docs/design-system.md` and rewrite
  `.claude/rules/design-system.md` from it.
- Restyle `/` and the `/room/[code]` placeholder with the real components.
- Done when: `/` and `/room/[code]` look like the chosen direction at 390px
  and 1440px (screenshots), and the existing e2e test still passes.

### Phase 1: the lobby

- Server: handlers for `lobby:ready`, `lobby:settings`, `lobby:kick`,
  `room:leave` in `attach.ts`, with the matching methods on `RoomStore`.
  Host-only checks. Host hand-over after 60 seconds away. `room:closed` sent
  to a kicked player. `settingsBlockers` in `src/server/game/setup.ts`, added
  to `startBlockers` in `projectView`. A simple per-socket rate limit.
- Client: the real lobby screen from the prototype, driven by `LobbyView`:
  code with copy and share, player list, ready toggle, host settings, start
  button with blocker messages (`startBlockerMessages`).
- Tests: store and socket tests for every handler and every refusal; e2e with
  five contexts that ready up until Start enables.

### Phase 2: the engine

- `src/server/game/`: `state.ts`, `rng.ts` (crypto-backed and seeded
  versions, `shuffle`), `setup.ts` (`rolesFor`, `settingsBlockers`),
  `knowledge.ts`, `engine.ts` (`startGame`, `applyAction`) for
  `confirm_role`, `draft_team`, `propose_team`, `vote`, `play_card`, with all
  win and loss conditions except assassination and the Lady.
- `RoomRecord.game` becomes `GameState | null`. `lobby:start` calls
  `startGame`. `game:action` calls `applyAction` and then `publish`.
- `projectView` produces `GameView` exactly as described under
  [How role-filtered state reaches each client](#how-role-filtered-state-reaches-each-client).
- `AVALON_SEED` environment variable selects the seeded `Rng` for e2e runs.
- Tests: the engine and projection rows of the testing table, including the
  leak test. This phase has no UI.

### Phase 3: the game screens

- Role reveal, then the table for `team_building`, `team_vote` and `quest`,
  from the prototype components, driven by `GameView` and sending
  `game:action`. Vote and quest reveal overlays triggered by view changes.
  A "my role" control that uses `useHoldToReveal`. Away markers on seats.
  Quest cards follow the privacy rule under [Client](#client): both cards
  look the same for every player.
- Tests: e2e for a full five-player game with a fixed seed up to three quest
  results, at a phone viewport.

### Phase 4: the end of the game

- Engine: `assassination`, `assassinate`, `game_over` with all four win
  reasons. `room:reset` returns the room to the lobby with the same seats.
- Screens: assassination (Assassin picks, everyone else waits), game over with
  every role revealed, play again.
- Tests: engine cases for each ending; e2e reaching both a Good and an Evil
  win.

### Phase 5: resilience and polish

- Mid-game reconnect e2e (close a context during a vote, reopen, vote).
- Offline and reconnecting banners, error messages from failed
  acknowledgements, empty and loading states.
- Hardening: `maxHttpBufferSize`, an `Origin` check on the socket handshake
  in production, rate limits on create and join.
- Accessibility pass (keyboard, screen reader labels, reduced motion) and a
  performance check on a mid-range phone profile.

### Phase 6 (optional, in this order)

1. **Lady of the Lake**: engine phase, `lady_examine`, screen.
2. **Shared table screen**: a view without a seat. New `room:watch { code }`
   event, a `WatchView` type with only public fields, and `/room/[code]/watch`
   for a laptop or TV.
3. **Restart snapshot**: write rooms to a volume on `SIGTERM`, load on boot.
4. **Deploy**: Railway service with the settings above. Needs approval.

## Questions for the owner

1. **Which design direction?** See `/design` and `docs/design/`.
2. **Hosting.** The comparison picks one always-on service (Railway) over
   Vercel, even though Vercel can now hold WebSockets. Confirm, or say that
   being on Vercel matters more than the simpler design (then Option C).
3. **Room codes of 4 letters** instead of 6 characters. Confirm.
4. **Host leaves.** The room survives and the host role passes on after 60
   seconds, instead of the room being destroyed. Confirm.
5. **Shared table screen and Lady of the Lake** are optional in the plan.
   Say whether either should be in the next run's required scope.
