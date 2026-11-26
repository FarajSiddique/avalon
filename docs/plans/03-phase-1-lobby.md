# Phase 1: The Lobby Implementation Plan

> **For agentic workers:** build one slice per session, task by task. If you delegate, use parallel subagents with the model set on each (Opus for design and build work, Sonnet for mechanical moves and lookups). Do not use the superpowers skills. Steps use checkbox (`- [ ]`) syntax for tracking.

**Written 24 November 2026**, after the Phase 1 grilling map (issue 13) closed.

**Goal:** Finish the lobby. A host who goes away hands the role on after 60 seconds, every socket has a message budget, every seat has a look the whole table sees, and `/room/$code` becomes the real lobby on the 3D Star Table, reached by a camera flight from the landing.

**Architecture:** Rules stay pure functions in `src/server/room` (`state.ts`, and `budget.ts` beside it), with the clock passed in. `room-object.ts` only loads, calls a rule, saves, re-arms its one alarm and publishes. The look is public seat data: it rides on `room:join` and `lobby:avatar`, lives in `RoomState`, and reaches clients in `SeatView`. The lobby screen is the prototype's lobby, moved to `src/components/lobby` and fed by `LobbyView`.

**Tech Stack:** Cloudflare Durable Objects (hibernating WebSockets, attachments, one alarm), zod 4, TanStack Start 1.169, React 19, three.js, Vitest, Playwright with software WebGL (SwiftShader).

**Spec:** `docs/architecture.md`: "The room object", "Room and session state", "Player identity and reconnection" (Ready, Kick, leave and rejoin, Host hand-over, Message budget, Settings and start blockers, Back to lobby), "Protocol", "Client" (3D gate, Avatar picker, Effects) and "Phase 1: the lobby". `GLOSSARY.md` for the words. Read `CLAUDE.md` and `.claude/rules/*` first.

## Scope, decided

- **Already built, out of scope:** ready (#29), kick and leave (#31), settings and their start blockers (#32).
- **Three pull requests, in this order** (issue 23):
  - **1a, server rules:** the host hand-over alarm and the per-socket message budget. No UI.
  - **1b, looks per seat:** `Avatar` and its schema in `src/shared`, the look on `room:join` (and on `createRoom`), `lobby:avatar`, the look in `RoomState` and `SeatView`, and old saved rooms loading with `avatarFor`. No UI.
  - **1c, the lobby screen:** the 3D gate, the lobby on the Star Table, the flight from the landing, the picker with the portrait camera, the host-change notice, and the five-context e2e.
- 1a and 1b do not depend on each other and can be built in parallel. 1c needs 1b's `SeatView.avatar`.
- `room:reset` (Back to lobby) is specified but built in Phase 4. `lobby:start` stays unhandled until Phase 2 (the room answers `NOT_ALLOWED`).

## Decisions made here

The map left four things "not yet specified" (protocol, copy, test plan, saved-room migration). None changes the design or a public API in a way that is expensive to redo, so they are settled here. D19 to D23 are the owner's answers to a later grilling of 1c's calls (26 November 2026); D16 to D18 were confirmed as written.

| #   | Topic                       | Decision                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Presence is one function    | `withPresence(state, connected, now)` takes the set of connected ids (not a boolean). It updates `emptySince` and `hostAwaySince`, then applies the away hand-over if it is due. Every connect, disconnect, kick, leave and alarm calls it. The clock is derived from who is connected, never hooked to one event, so a restart (where no close runs) cannot leave it wrong.                                 |
| D2  | Connected-only pick         | `pickNextHost` keeps its away fallback (right for leave). A new `pickConnectedHost(players, fromId, connected)` uses the same order but returns null when no other seat is connected. The away hand-over uses it.                                                                                                                                                                                            |
| D3  | Host's ready                | Every hand-over (away or leave) goes through one `handOver(state, toId)` that sets both the old and the new host's stored `ready` to false. The host's record is then always false, so `SeatView.ready` never shows a tick on the host.                                                                                                                                                                      |
| D4  | One "next due" function     | `nextExpiryCheck` is renamed `nextDue(state, now): number \| "expired"`. `scheduleExpiryCheck` becomes `scheduleAlarm`. The room object re-arms the alarm after every save, through one `commit(state)` helper (save, re-arm, publish).                                                                                                                                                                      |
| D5  | Budget module               | `src/server/room/budget.ts` with `fullBudget(now)` and `spend(budget, now)`. Constants `MESSAGE_BURST = 20`, `MESSAGE_REFILL_PER_S = 5` and `HOST_AWAY_MS = 60_000` go in `src/shared/constants.ts` next to `EMPTY_ROOM_TTL_MS`.                                                                                                                                                                             |
| D6  | When `limited` clears       | Only when the bucket is full again (`MESSAGE_BURST` tokens). Clearing on the first allowed message would warn up to five times a second under a steady flood. So "back under budget" means "a full burst is available again".                                                                                                                                                                                |
| D7  | Attachments                 | Every read and write of a socket attachment goes through `readAttachment` and `writeAttachment` in `room-object.ts`. Binding or unbinding a seat keeps the bucket. An old attachment (`{ playerId }` only, from before the deploy) reads as a full bucket.                                                                                                                                                   |
| D8  | Over-budget path            | The token is taken before the type and length check. Over budget, the envelope is still parsed so the ack can carry the request id; nothing else runs, and there is no storage read except to name the room in the one `console.warn` per run.                                                                                                                                                               |
| D9  | Copy for `RATE_LIMITED`     | The ack message is "Too fast. Wait a moment and try again." The client shows it like any refusal. No client change in 1a.                                                                                                                                                                                                                                                                                    |
| D10 | Saved-room migration        | One pure `upgradeRoom(stored: RoomState): RoomState` in `state.ts` (typed as storage returns it, possibly missing newer fields), applied in `load()`. It fills fields added after a room was saved: 1a adds `hostAwaySince ?? null`; 1b adds `avatar ?? avatarFor(id)` per seat. No version field, because every change is an added field with a safe default. A field that changes meaning needs a version. |
| D11 | Flood check tool            | Playwright (`e2e/message-budget.e2e.ts`) with a raw WebSocket from the page, not Bruno. The Bruno collection stays HTTP only (the CLI's WebSocket support is not something CI relies on).                                                                                                                                                                                                                    |
| D12 | Restart check and real time | `pnpm test:restart` uses the real 60 seconds (no test-only override). It adds about a minute to `pnpm check`. Holding the server down for 20 seconds and asserting the hand-over lands well before 60 seconds after the restart proves the stored deadline was used, not a fresh clock.                                                                                                                      |
| D13 | Look module                 | `src/shared/avatar.ts` (no zod): the lists, the `Avatar` type, `DEFAULT_AVATAR`, `sanitizeAvatar`, `avatarFor`, `avatarKey`. Labels, art tokens and `lookSummary` stay in `src/client/avatar.ts` (they are display concerns) and import the lists from shared.                                                                                                                                               |
| D14 | Look on the wire            | `SeatView.avatar: Avatar`, so `LobbyView` and `GameView` both carry it. `JoinRoomInput.avatar?: Avatar` and `CreateRoomInput.avatar?: Avatar`: the host's saved look rides on create the same way, otherwise a returning host would never get their pick. A missing or invalid look on join or create becomes `avatarFor(playerId)` and never fails the request.                                             |
| D15 | `lobby:avatar` refusals     | Payload `{ avatar }`, strict: an invalid look is `INVALID_PAYLOAD`. No seat: `NOT_IN_ROOM`. During a game: `ROOM_IN_PROGRESS` (as ready and settings). The same look as stored: accepted, nothing saved or sent.                                                                                                                                                                                             |
| D16 | Host-change notice          | `hostChangeNotice(before, after)` in `src/shared/copy.ts`, worked out in the room client from two consecutive views. No protocol change.                                                                                                                                                                                                                                                                     |
| D17 | Saved look key              | The real app keeps the prototype's `localStorage` key `avalon:starlit-avatar:v1`, so a look picked in the prototype carries over. 1c writes it only when the player changes their look in the picker.                                                                                                                                                                                                        |
| D18 | Portrait pose               | A new camera shot `"portrait"` in `src/components/three/scenes/table-shots.ts`, a close shot of the viewer's seat, used by the lobby while the picker is open.                                                                                                                                                                                                                                               |
| D19 | Start before Phase 2        | The host's Start is the real button: disabled while `startBlockers` is not empty, the blocker list beside it. Pressed, it sends `lobby:start` and shows the refusal like any other until Phase 2 handles it. (Owner, 26 November 2026.)                                                                                                                                                                      |
| D20 | Host notice lifetime        | A 5 second `role="status"` toast for everyone, the new host included. The host marker in the seat list is the lasting signal; no sticky notice. (Owner, 26 November 2026.)                                                                                                                                                                                                                                   |
| D21 | Picker closing              | Done, Escape and tapping outside all close and save. No Cancel: a look is easy to change again. (Owner, 26 November 2026.)                                                                                                                                                                                                                                                                                   |
| D22 | Host notice e2e             | No 60 second browser test. The browser test makes the host press Leave (an instant hand-over through the same client diff). The away timing stays covered by the `state.ts` tables and `pnpm test:restart`. (Owner, 26 November 2026.)                                                                                                                                                                       |
| D23 | All-ready sound             | Only the host's phone plays `all-ready`: the players share one room, and Start is the host's. (Owner, 26 November 2026.)                                                                                                                                                                                                                                                                                     |

## Global Constraints

- Preconditions for every slice. Stop and report if any is false:
  - This plan is on `main`, or the slice's branch is cut from the plan branch `docs/phase-1-plan`.
  - On the new branch, `pnpm install && pnpm check` passes before any change.
  - For 1c only: 1b is merged.
- Decided, not to be reopened: everything under "Player identity and reconnection" and "Client" in `docs/architecture.md`, and the decisions above.
- The three room object rules hold in every task: save after every change, a socket's seat lives in its attachment, anything later is the one alarm. No `setTimeout` or `setInterval` in `src/server`. Rules stay out of `room-object.ts`.
- `projectView` is still the only path from state to a client. A look is public; nothing else new reaches the wire.
- Randomness comes from injected deps, never `Math.random`. The clock is injected in every rule.
- No effects (oxlint). Tokens only, no raw colours. Meaning never by colour alone. Touch targets at least 44 by 44 px. Check 390px and 1440px.
- TypeScript strict, no `any`. Prettier on every file you touch. Blank lines from `pnpm lint:fix`. No em-dashes in prose.
- `pnpm test:restart` must keep passing. `src/routeTree.gen.ts` is regenerated and committed after any route change.
- Stop any preview or dev server you started before rebuilding or finishing.
- Never deploy or preview by hand. Never commit to `main`, force-push or merge. Open a draft pull request per slice.
- If a Notion page "Avalon: Developer Roadmap" exists and you have Notion tools, move the Phase 1 row along as each slice opens.

### Files more than one slice touches

| File                             | 1a                                       | 1b                                | 1c                     |
| -------------------------------- | ---------------------------------------- | --------------------------------- | ---------------------- |
| `src/server/room/state.ts`       | `hostAwaySince`, presence, `upgradeRoom` | `avatar` per seat, `setAvatar`    | none                   |
| `src/server/room/room-object.ts` | attachments, budget, `commit`, alarm     | `lobby:avatar` handler, join look | none                   |
| `src/server/room/state.test.ts`  | hand-over and due tables                 | look tables                       | none                   |
| `scripts/restart-check.mjs`      | pending hand-over                        | none                              | ready states and looks |
| `docs/architecture.md`           | `RoomState`, attachment, testing table   | `RoomState`, `SeatView`, protocol | Phase 1 marked built   |

1a and 1b both edit `RoomState`, `load()` and `upgradeRoom`. Whichever merges second rebases and keeps both fields.

---

## Part 1a: server rules (hand-over alarm, message budget)

Branch: `phase-1/1a-server-rules`. Pull request title: "Phase 1a: host hand-over alarm and per-socket message budget".

### Task 1a.1: the hand-over rules in `state.ts`

**Files:**

- Modify: `src/shared/constants.ts`, `src/server/room/state.ts`, `src/server/room/state.test.ts`

**Interfaces:**

```ts
// src/shared/constants.ts
/** How long the host may be away before the role passes on. */
export const HOST_AWAY_MS = 60_000;

// src/server/room/state.ts
export interface RoomState {
  // ...as today, plus:
  /** When the host's last open socket closed, or null while the host is connected. */
  hostAwaySince: number | null;
}

/** Fills fields added after a room was saved. Applied on every load. */
export function upgradeRoom(stored: RoomState): RoomState;

/**
 * Record who is connected: `emptySince`, `hostAwaySince`, then the away
 * hand-over if it is due. Call after every connect, disconnect, kick, leave
 * and alarm. Returns the same object when nothing changed.
 */
export function withPresence(
  state: RoomState,
  connected: ReadonlySet<PlayerId>,
  now: number,
): RoomState;

/** Like pickNextHost, but only a connected seat, else null. */
export function pickConnectedHost(
  players: ReadonlyArray<PlayerRecord>,
  fromId: PlayerId,
  connected: ReadonlySet<PlayerId>,
): PlayerId | null;

/** The earlier of expiry and a hand-over deadline still ahead, or "expired". */
export function nextDue(state: RoomState, now: number): number | "expired";
```

`handOver(state, toId)` is module-private: it sets `hostId`, clears `hostAwaySince`, and sets the old and new host's `ready` to false (D3). `leaveRoom` uses it too.

Rules inside `withPresence`, in order:

1. `emptySince`: as today, from `connected.size > 0`.
2. `hostAwaySince`: null if `connected.has(hostId)`; otherwise kept if set, else `now`.
3. If `hostAwaySince !== null` and `now >= hostAwaySince + HOST_AWAY_MS` and `pickConnectedHost` returns an id, `handOver` to it. This one step covers both "the alarm fired" and "the deadline passed with nobody else here, and someone just connected".

`nextDue` counts the deadline only while it is ahead (`deadline > now`), so a passed deadline with nobody to take over never re-fires the alarm.

- [ ] **Step 1: Write the failing table-driven tests**

In `state.test.ts`, replace the `withPresence(state, true|false, now)` calls with sets, then add `describe("host hand-over (issue 19)")` with `it.each` rows. Seats `p1` (host), `p2`, `p3`; `T` is when the host's last socket closed.

| Case                                                 | Before                               | `connected` | `now`              | Expect                                     |
| ---------------------------------------------------- | ------------------------------------ | ----------- | ------------------ | ------------------------------------------ |
| Host closes their last socket                        | `hostAwaySince: null`                | `{p2}`      | `T`                | `hostAwaySince: T`, host `p1`              |
| Host still away, clock kept                          | `hostAwaySince: T`                   | `{p2}`      | `T + 10_000`       | `hostAwaySince: T`                         |
| Host comes back before the deadline                  | `hostAwaySince: T`                   | `{p1, p2}`  | `T + 59_999`       | `hostAwaySince: null`, host `p1`           |
| Deadline reached, someone connected                  | `hostAwaySince: T`                   | `{p3}`      | `T + HOST_AWAY_MS` | host `p3`, `hostAwaySince: null`           |
| Pick is the first connected seat after the old host  | `hostAwaySince: T`, order p1, p2, p3 | `{p2, p3}`  | `T + HOST_AWAY_MS` | host `p2`                                  |
| Wraps round seat order                               | host `p3`, order p1, p2, p3          | `{p1}`      | `T + HOST_AWAY_MS` | host `p1`                                  |
| Deadline passed, nobody else connected               | `hostAwaySince: T`                   | `{}`        | `T + 120_000`      | host `p1`, `hostAwaySince: T`              |
| First seat to connect after that takes it at once    | `hostAwaySince: T`                   | `{p2}`      | `T + 120_000`      | host `p2`                                  |
| Old host back after hand-over stays an ordinary seat | host `p2` after hand-over            | `{p1, p2}`  | later              | host `p2`; `p1.ready` false                |
| Hand-over clears both hosts' ready                   | `p2.ready: true`, `p1.ready: false`  | `{p2}`      | `T + HOST_AWAY_MS` | host `p2`, `p1.ready` and `p2.ready` false |
| Nothing changes                                      | host connected                       | `{p1}`      | any                | the same object (`toBe`)                   |

`describe("next due")`, `it.each`:

| Case                               | State                                   | `now`                         | Expect                        |
| ---------------------------------- | --------------------------------------- | ----------------------------- | ----------------------------- |
| Occupied room, host here           | `emptySince: null, hostAwaySince: null` | `createdAt`                   | `createdAt + ROOM_MAX_AGE_MS` |
| Empty room                         | `emptySince: E`                         | `E`                           | `E + EMPTY_ROOM_TTL_MS`       |
| Hand-over deadline is earliest     | `hostAwaySince: T`, occupied            | `T`                           | `T + HOST_AWAY_MS`            |
| Deadline passed, nobody to take it | `hostAwaySince: T`, `emptySince: T`     | `T + HOST_AWAY_MS`            | `T + EMPTY_ROOM_TTL_MS`       |
| Expired by idle                    | `emptySince: E`                         | `E + EMPTY_ROOM_TTL_MS`       | `"expired"`                   |
| Expired by age                     | any                                     | `createdAt + ROOM_MAX_AGE_MS` | `"expired"`                   |

`describe("pickConnectedHost")`: null with nobody else connected; skips away seats; wraps; `NOT_IN_ROOM` for an unknown `fromId`.

`describe("upgradeRoom")`: a room saved without `hostAwaySince` loads with `null`; a current room loads unchanged (`toEqual`). `createRoom` sets `hostAwaySince: null`.

`leave`: add a row that a host leaving to a seat with `ready: true` leaves the new host with `ready: false`.

Run: `pnpm test src/server/room/state.test.ts`
Expected: FAIL (the functions and field do not exist).

- [ ] **Step 2: Implement**

`createRoom` sets `hostAwaySince: null` (the host is connected a moment later through the socket). Keep every rule pure and returning the same object when nothing changes.

- [ ] **Step 3: Verify and commit**

Update the call sites in `room-object.ts` mechanically so the branch typechecks: pass `this.connectedIds(...)` to `withPresence` and rename `nextExpiryCheck` to `nextDue`. Task 1a.3 does the real wiring.

Run: `pnpm test && pnpm typecheck`
Expected: pass.

The hand-over also runs during a game. There is no game state until Phase 2, so Phase 2 adds that row to the table.

```bash
git add -A && git commit -m "feat(room): host hand-over rules and one next-due function"
```

### Task 1a.2: the message budget

**Files:**

- Create: `src/server/room/budget.ts`, `src/server/room/budget.test.ts`
- Modify: `src/shared/constants.ts`

**Interfaces:**

```ts
// src/shared/constants.ts
/** Messages one socket may send at once. */
export const MESSAGE_BURST = 20;
/** Messages a second the budget refills by. */
export const MESSAGE_REFILL_PER_S = 5;

// src/server/room/budget.ts
export interface Budget {
  /** Fractional tokens left, 0 to MESSAGE_BURST. */
  tokens: number;
  /** When `tokens` was last brought up to date. */
  refilledAt: number;
  /** True from the first refusal until a full burst is available again. */
  limited: boolean;
}

export function fullBudget(now: number): Budget;

export interface Spent {
  budget: Budget;
  allowed: boolean;
  /** True only on the first refusal of a run: log it once. */
  firstRefusal: boolean;
}

export function spend(budget: Budget, now: number): Spent;
```

`spend`: refill `tokens = min(MESSAGE_BURST, tokens + (now - refilledAt) / 1000 * MESSAGE_REFILL_PER_S)`, `refilledAt = now` (a clock that goes backwards refills nothing). If `limited` and `tokens === MESSAGE_BURST`, clear `limited` (D6). Then if `tokens >= 1`, take one and allow; otherwise refuse, with `firstRefusal = !limited`, and set `limited`.

- [ ] **Step 1: Write the failing table-driven tests**

`it.each` over a list of message times (ms after `0`, starting from `fullBudget(0)`), checking the allowed and first-refusal pattern:

| Case                                | Message times                            | Allowed                        | First refusal at                      |
| ----------------------------------- | ---------------------------------------- | ------------------------------ | ------------------------------------- |
| A full burst at once                | 20 at `0`                                | all 20                         | none                                  |
| One over the burst                  | 21 at `0`                                | first 20                       | the 21st                              |
| Only the first refusal is flagged   | 25 at `0`                                | first 20                       | the 21st only                         |
| Refill: one token per 200 ms        | 20 at `0`, 1 at `199`, 1 at `200`        | 20, then refused, then allowed | the one at `199`                      |
| Steady 5 a second never trips       | 300 at 200 ms apart, from full           | all                            | none                                  |
| Refill caps at the burst            | 1 at `0`, then 21 at `60_000`            | 1, then 20                     | the last                              |
| Warn again only after a full refill | 21 at `0`, 21 at `1_000`, 21 at `10_000` | 20, 5, 20                      | `0` run and `10_000` run, not `1_000` |
| Clock going backwards adds nothing  | 20 at `1_000`, 1 at `500`                | 20, then refused               | the last                              |

Run: `pnpm test src/server/room/budget.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement, verify, commit**

Run: `pnpm test`
Expected: pass.

```bash
git add -A && git commit -m "feat(room): per-socket message budget as a pure token bucket"
```

### Task 1a.3: wire both into the room object

**Files:**

- Modify: `src/server/room/room-object.ts`

**Interfaces:**

```ts
/** What each socket remembers across hibernation. */
interface SocketAttachment extends Budget {
  playerId: PlayerId | null;
}

function readAttachment(socket: WebSocket, now: number): SocketAttachment; // old `{ playerId }` reads as a full bucket
function writeAttachment(socket: WebSocket, attachment: SocketAttachment): void;
function bindSeat(socket: WebSocket, playerId: PlayerId | null, now: number): void; // keeps the bucket

// on RoomObject
private async commit(state: RoomState, except?: WebSocket): Promise<void>; // save, scheduleAlarm, publish
private async scheduleAlarm(state: RoomState): Promise<void>; // from nextDue
```

- [ ] **Step 1: Attachments through one place**

Replace every `serializeAttachment(...)` and `deserializeAttachment()` call (`fetch`, `seat`, `removeSeat`, `end`, `seatOf`) with the helpers. `fetch` writes `{ playerId: null, ...fullBudget(now) }`. `seatOf` becomes `readAttachment(socket, now).playerId`.

- [ ] **Step 2: Charge before parsing**

At the top of `webSocketMessage`, before the type and length check: read the attachment, `spend`, write the attachment back. Then the existing type, length, JSON and envelope checks (dropped without an ack, as today). If the spend was refused: on `firstRefusal`, `console.warn("[room] message budget exceeded", code, playerId, event)` with the room code from `this.room?.code` (loading once if the cache is empty), then `send` an ack with `fail("RATE_LIMITED", "Too fast. Wait a moment and try again.")` and return. Otherwise run `handle` as today. The handler re-reads the attachment when it binds a seat, so the bucket written above is kept.

- [ ] **Step 3: Presence and the alarm**

- `load()` passes what storage returns through `upgradeRoom`.
- `seat`, `removeSeat`, `socketGone` call `withPresence(state, this.connectedIds(except), now)` and then `commit`. `ready` and `settings` use `commit` too. `create` calls `scheduleAlarm`.
- `alarm()`: load; if `nextDue` is `"expired"`, end the room as today. Otherwise `withPresence(state, this.connectedIds(), now)`; if it changed, `commit`, else `scheduleAlarm`.
- No `setTimeout`, no field that is not a cache of storage.

- [ ] **Step 4: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`
Expected: all pass, including the existing kick, leave and realtime tests (the attachment change must not drop seats).

```bash
git add -A && git commit -m "feat(room): one alarm for expiry and hand-over, budget in the socket attachment"
```

### Task 1a.4: the flood e2e

**Files:**

- Create: `e2e/message-budget.e2e.ts`

Uses `createRoom` from `e2e/room-helpers.ts`, then opens a raw socket from the host's page with `page.evaluate`, like `sendRequest` in `e2e/realtime.e2e.ts`. The socket does not need a seat: `lobby:ready` from an unseated socket is answered `NOT_IN_ROOM` when within budget, which tells the two answers apart.

- [ ] **Step 1: Write the tests**

```ts
test("a flood gets RATE_LIMITED and the socket stays open", async ({
  browser,
}) => {
  // In one evaluate: open the socket, send 40 `lobby:ready` envelopes in one tick
  // (ids 1 to 40), wait for 40 acks, record readyState, wait 1_200 ms, send id 41.
  // Expect: at least 15 acks have code RATE_LIMITED; the first 20 do not;
  // readyState is OPEN after the flood; ack 41 is NOT_IN_ROOM (not RATE_LIMITED).
  // The host's own page still shows data-online="true".
});

test("malformed messages spend the budget too", async ({ browser }) => {
  // Send 20 strings that are not JSON, then one valid envelope (id 1).
  // Expect: ack 1 is RATE_LIMITED. No ack for the malformed ones.
});
```

Assert ranges, not exact counts: the suite also runs against previews and the live site, where some refill happens while the messages travel.

- [ ] **Step 2: Run and commit**

Run: `pnpm build && pnpm test:e2e e2e/message-budget.e2e.ts`
Expected: both pass. (Write them before Task 1a.3 if you want to see them fail first.)

```bash
git add -A && git commit -m "test(e2e): a message flood is refused without closing the socket"
```

### Task 1a.5: the restart check covers a pending hand-over

**Files:**

- Modify: `scripts/restart-check.mjs`

- [ ] **Step 1: Add a second part after today's checks**

1. Close the host's context. Wait until the guest's page shows the host's row with `data-connected="false"` (the close has been saved).
2. Stop the server. Hold it down until 20 seconds have passed since step 1.
3. Start the server. Wait for the guest to be online again.
4. Within 50 seconds of the restart, the guest's own row contains "Host" and the old host's row does not. (The deadline is 60 seconds after step 1; a clock restarted at boot would need 60 seconds after step 3.)
5. Log what was proved.

Keep the first part's assertion that a host who reconnects is still host.

- [ ] **Step 2: Run and commit**

Run: `pnpm build && pnpm test:restart`
Expected: passes, about a minute longer than before.

```bash
git add -A && git commit -m "test(restart): a pending host hand-over survives a restart"
```

### Task 1a.6: docs and the pull request

- [ ] **Step 1: `docs/architecture.md`**

The `RoomState` snippet gains `hostAwaySince`. "The room object" table: `alarm` and the attachment shape. Testing table: room rules row adds hand-over, next due and the budget; Room object row adds the flood test; Restart row adds the pending hand-over. Phase 1: mark 1a built with the PR number.

- [ ] **Step 2: Full gate and the draft pull request**

Run: `pnpm check`
Expected: every step passes.

Open a draft pull request using `.github/pull_request_template.md`. Body: link this plan's pull request as its base dependency, list D1 to D12 as the calls made, and in Evidence the checks table, the restart check log and the flood test output. Under "Not verified": the budget against a real phone's tapping rate, alarm timing on the live Worker.

---

## Part 1b: looks per seat

Branch: `phase-1/1b-looks`. Pull request title: "Phase 1b: a look per seat, on join and lobby:avatar".

### Task 1b.1: the look moves to `src/shared`

**Files:**

- Create: `src/shared/avatar.ts`, `src/shared/avatar.test.ts`
- Modify: `src/client/avatar.ts`, every importer of the moved names (`rg -n "@/client/avatar" src e2e`)

**Interfaces:**

- `src/shared/avatar.ts` (no imports outside `src/shared`): `BODIES`, `SKINS`, `FIRST_FANCY_SKIN`, `CLOAKS`, `HEADWEAR`, `EMBLEMS`, the five trait types, `Avatar`, `DEFAULT_AVATAR`, `sanitizeAvatar`, `avatarFor`, `avatarKey`. Code unchanged, so every existing look stays the same.
- `src/client/avatar.ts` keeps `*_LABELS`, `SKIN_TOKENS`, `CLOAK_TOKENS`, `lookSummary`, importing the lists and types from `@/shared/avatar`. No re-exports: importers switch to the module that owns each name.

- [ ] **Step 1: Move, fix imports, add tests**

`avatar.test.ts`: `avatarFor` is stable for an id and varied across 50 ids (at least 4 cloaks seen); `sanitizeAvatar` keeps valid traits and replaces each invalid one with the default.

- [ ] **Step 2: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm screenshots`
Expected: all pass; screenshots unchanged.

```bash
git add -A && git commit -m "refactor: move the look's lists and avatarFor to src/shared"
```

### Task 1b.2: protocol and schemas

**Files:**

- Modify: `src/shared/protocol.ts`, `src/shared/views.ts`, `src/shared/schemas.ts`
- Create: `src/shared/schemas.test.ts` (or extend if it exists)

**Interfaces:**

```ts
// src/shared/views.ts
export interface SeatView {
  // ...as today, plus:
  /** The seat's look. Public. Fixed once the game starts. */
  avatar: Avatar;
}

// src/shared/protocol.ts (type import only, so no runtime dependency)
export interface CreateRoomInput { name: string; avatar?: Avatar }
export interface JoinRoomInput { name: string; avatar?: Avatar }
export interface AvatarInput { avatar: Avatar }
// RoomRequests gains:
/** Lobby only. Changes your own look. */
"lobby:avatar": { input: AvatarInput; output: null };

// src/shared/schemas.ts
export const avatarSchema = z.object({
  body: z.enum(BODIES), skin: z.enum(SKINS), cloak: z.enum(CLOAKS),
  headwear: z.enum(HEADWEAR), emblem: z.enum(EMBLEMS),
}) satisfies z.ZodType<Avatar>;
// createRoomSchema and joinRoomSchema gain: avatar: avatarSchema.optional().catch(undefined)
export const avatarInputSchema = z.object({ avatar: avatarSchema }) satisfies z.ZodType<AvatarInput>;
```

No new `ErrorCode` and no new `RoomClosedReason`.

- [ ] **Step 1: Failing tests, then the change**

`it.each` for `joinRoomSchema`: no look gives `avatar: undefined`; a valid look is kept; a look with an unknown cloak, a missing trait, or a string instead of an object each give `avatar: undefined` and the join still parses. `avatarInputSchema`: the same three invalid looks fail.

Run: `pnpm test`
Expected: pass after the change. `projectView` and the room fail to typecheck until Task 1b.3.

### Task 1b.3: the look in the room

**Files:**

- Modify: `src/server/room/state.ts`, `state.test.ts`, `project-view.ts`, `project-view.test.ts`, `room-object.ts`, `src/functions/rooms.ts`

**Interfaces:**

```ts
export interface PlayerRecord {
  /* ...as today, plus */ avatar: Avatar;
}

export function createRoom(
  code: RoomCode,
  hostName: string,
  avatar: Avatar | undefined,
  deps: RoomDeps,
): Seated;
export function joinRoom(
  state: RoomState,
  name: string,
  avatar: Avatar | undefined,
  deps: RoomDeps,
): Seated;
/** Lobby only. Returns the same object when the look is unchanged. */
export function setAvatar(
  state: RoomState,
  playerId: PlayerId,
  avatar: Avatar,
): RoomState;
```

`newPlayer` sets `avatar ?? avatarFor(id)` with the new id. `upgradeRoom` fills `avatar ?? avatarFor(p.id)` per seat (D10). `projectView` copies `avatar` into each `SeatView` (a copy, not the stored object). The room object handles `lobby:avatar` with `avatarInputSchema`, `setAvatar`, then `commit` if changed. `createRoom` server function passes the parsed look through `RoomObject.create(code, name, avatar)`.

- [ ] **Step 1: Failing table-driven tests**

`describe("looks (issue 21)")`, `it.each`:

| Case                           | Call                                            | Expect                                                 |
| ------------------------------ | ----------------------------------------------- | ------------------------------------------------------ |
| Join without a look            | `joinRoom(s, "Ansel", undefined)`               | `avatar` equals `avatarFor(newId)`                     |
| Join with a look               | `joinRoom(s, "Ansel", look)`                    | `avatar` equals `look`                                 |
| Create with and without a look | `createRoom(..., look \| undefined)`            | as the two rows above, for the host                    |
| Change your look               | `setAvatar(s, p2, other)`                       | only `p2` changes; ready kept                          |
| Same look again                | `setAvatar(s, p2, same)`                        | the same object                                        |
| Not seated                     | `setAvatar(s, "nobody", look)`                  | `NOT_IN_ROOM`                                          |
| During a game                  | `setAvatar({ ...s, game: {} as never }, p2, l)` | `ROOM_IN_PROGRESS` (cast removed in Phase 2)           |
| Two seats may share a look     | `p2` and `p3` set the same look                 | both kept                                              |
| Old saved room                 | `upgradeRoom` of a room with no `avatar` fields | each seat gets `avatarFor(id)`; already-set looks kept |

`project-view.test.ts`: every `SeatView` has the seat's look; the wire still has no secret or `tokenHash`.

- [ ] **Step 2: Implement, verify, commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: pass.

```bash
git add -A && git commit -m "feat(room): a look per seat, set on join and by lobby:avatar"
```

### Task 1b.4: protocol e2e

**Files:**

- Create: `e2e/looks.e2e.ts`

The lobby screen does not draw looks until 1c, so this drives the socket from the page, like `sendRequest` in `e2e/realtime.e2e.ts` (move that helper to `e2e/room-helpers.ts` if a second file needs it).

- [ ] **Step 1: Write the tests**

1. A guest joins over a raw socket with a valid look: the `state` view the host receives lists that look for the guest.
2. A guest joins with an invalid look: the join succeeds and the look is a valid `Avatar` (not the invalid one).
3. A seated guest sends `lobby:avatar` with a new look: the host's next view has it. An invalid one gets `INVALID_PAYLOAD`.

Run: `pnpm build && pnpm test:e2e e2e/looks.e2e.ts`
Expected: pass.

```bash
git add -A && git commit -m "test(e2e): looks travel on join and lobby:avatar"
```

### Task 1b.5: docs and the pull request

- [ ] **Step 1: `docs/architecture.md`**

`PlayerRecord` gains `avatar`; the Protocol table gains `lobby:avatar` (Implemented) and the optional look on `createRoom` and `room:join`; App structure lists `src/shared/avatar.ts`; Testing gains the looks rows. Phase 1: mark 1b built.

- [ ] **Step 2: Full gate and the draft pull request**

Run: `pnpm check`
Expected: pass. Open the draft pull request; list D10, D13, D14 and D15 as the calls made.

---

## Part 1c: the lobby screen on the Star Table

Branch: `phase-1/1c-lobby-screen`, after 1b has merged. Pull request title: "Phase 1c: the lobby on the Star Table".

### Review Focus

Each line is pinned by a test in the task named.

1. A browser without WebGL2 sends `room:join` or `room:resume`. It must not: the room gains no seat. Task 1c.1.
2. The existing e2e names and test ids disappear in the move: `room-code`, `player` (with `data-connected` and "(you)"), `connection`, "Remove X", "Leave room", "Join again". Task 1c.3 keeps them.
3. The flight never lands: `pending` must be claimed by the lobby's slot, or cleared when the join fails or the room is closed. Task 1c.4.
4. A picker draft leaks to others, or a draft is sent on each tap. One `lobby:avatar` on close, none if unchanged. Task 1c.5.
5. The host-change notice shows on first load or after a reload. Only on a change between two views. Task 1c.6.
6. Five software-WebGL pages starve the CI runner. Reduced motion stays on in the multi-context tests. Task 1c.7.

### Task 1c.1: the 3D gate

**Files:**

- Create: `src/client/webgl.ts` (`hasWebGL2(): boolean`: a `webgl2` context on a fresh canvas, released after), `src/components/ui/no-webgl-notice.tsx` (moved with `git mv` from `src/routes/design/starlit/-components/no-webgl-notice.tsx`, gaining an optional `onReload` that shows a Reload button)
- Modify: `src/components/three/engine.ts` (use `hasWebGL2` in `mountStarTable`), `src/components/landing/landing-screen.tsx` or `start-form.tsx`, `src/components/room/room-screen.tsx`, the prototype routes that import the notice, `e2e/shell.e2e.ts`
- Create: `e2e/gate.e2e.ts`

**Interfaces:**

- `useWebGLGate(): "checking" | "ok" | "none"` in `src/client/use-webgl-gate.ts`, a `useSyncExternalStore` over a module value computed once in the browser (server snapshot `"checking"`). `"none"` also when the stage reports `status === "failed"`.
- Landing: the form renders on the server with buttons disabled until hydrated; once hydrated, `"none"` swaps it for `NoWebGLNotice`.
- Room: `RoomScreen` does not call `useRoom(code)` (so it opens no socket) until the gate is `"ok"`; `"none"` shows the notice.
- After joining, a lost context (stage status `failed` while seated) shows the notice with `onReload={() => location.reload()}`; the socket and seat are untouched.

- [ ] **Step 1: Failing tests in `e2e/gate.e2e.ts`** (all with `withoutWebGL(page)`):

1. `/` shows the alert heading "This game needs 3D graphics" and no "Create a room" button.
2. A second context opens `/room/CODE` of a live room: it sees the notice and the host's list stays at one player.
3. A seated guest reopens the room in a new page of the same context without WebGL: notice shown, the host sees the guest as away.

Replace the Phase 0 "the landing works without WebGL" tests in `shell.e2e.ts` with these.

- [ ] **Step 2: Implement, run, commit**

Run: `pnpm build && pnpm test:e2e`
Expected: pass. A lost-context test (`WEBGL_lose_context`) only if it is a few lines.

```bash
git add -A && git commit -m "feat: the 3D gate on the landing and the room link"
```

### Task 1c.2: move the lobby components

**Files:**

- Move (with `git mv`) from `src/routes/design/starlit/-components/lobby/` to `src/components/lobby/`: `player-list.tsx`, `room-code.tsx`, `host-settings.tsx`, `disclosure.tsx`, `summaries.ts`, `avatar-maker.tsx`; and `alignment-tag.tsx` and `names.ts` with them (they import those)
- Modify: the prototype's `lobby-screen.tsx` and every other importer

**Interfaces:**

- `AvatarMaker(props: { value: Avatar; onChange: (next: Avatar) => void })`: controlled, so the lobby holds the draft. The prototype passes `useAvatar()`'s value and setter.
- `PlayerList(props: { view: LobbyView; allReady?: boolean; onKick?: (id: PlayerId) => void })`: gains the kick confirm from today's `room-screen.tsx` (button "Remove {name}", group "Remove {name}?" with Remove and Cancel), the `data-testid="player"` rows with `data-connected`, and "{name} (you)" text. Without `onKick` (prototype, guests) there is no remove button.
- `RoomCode` gains `data-testid="room-code"` on the element whose text is exactly the four letters.
- `HostSettings` stays as is; the real lobby passes handlers that send `lobby:settings` with the whole object.
- Nothing in `src/components/lobby` imports `src/design` (`rg -n "@/design" src/components` prints nothing).

- [ ] **Step 1: Move, verify the prototype, commit**

Run: `pnpm lint && pnpm typecheck && pnpm build && pnpm test:e2e e2e/game.e2e.ts && pnpm screenshots`
Expected: pass; prototype lobby screenshots unchanged.

```bash
git add -A && git commit -m "refactor: move the lobby components out of the prototype"
```

### Task 1c.3: the real lobby on the stage

**Files:**

- Create: `src/components/lobby/lobby-screen.tsx` (the real one; the prototype keeps its own `LobbyScreen` over the mock), `src/components/lobby/lobby-actions.tsx` (ready toggle, Start, Leave)
- Modify: `src/components/room/room-screen.tsx`, `src/client/room-client.ts`

**Interfaces:**

- `RoomClient` gains `setReady(ready: boolean)`, `setSettings(settings: GameSettings)`, `setAvatar(avatar: Avatar)`, `start()`. Each sets `snapshot.error` on a refusal other than `OFFLINE`, as `kick` does. `RATE_LIMITED` is not special.
- `LobbyScreen(props: { view: LobbyView; client: RoomClient })`: claims the stage with `useStageSlot({ mode: "lobby", reveal: "whole", fade: 0 }, focus)` and `useStagePlayers` with every seat's `SeatView.avatar` (no more `avatarFor` at the call site). Sections as the prototype: players, your look, settings (host editable, guests read only). Non-host: "I'm ready" (`aria-pressed`). Host: Start, disabled while `startBlockers` is not empty, with `startBlockerMessages` in a `role="status"` list beside it. Pressing Start sends `lobby:start`; until Phase 2 the refusal ("That is not available yet.") shows like any other. "Leave room" with its confirm group as today.
- `RoomScreen` keeps the join form, the closed states, "Join again" and `data-testid="connection"`, and renders `LobbyScreen` once seated in the lobby.
- The `all-ready` sound plays on the host's phone only, when `startBlockers` becomes empty between two views (not on first view) (D23).

- [ ] **Step 1: Make the existing e2e pass on the new screen**

Run: `pnpm build && pnpm test:e2e`
Expected: `realtime`, `kick-leave`, `shell` pass without changes to their selectors. Where a test drove ready or settings over a raw socket only because there was no UI, keep it (it tests the room); new UI tests go in Task 1c.7.

```bash
git add -A && git commit -m "feat(lobby): the real lobby on the Star Table, driven by LobbyView"
```

### Task 1c.4: the flight from the landing

**Files:**

- Create: `src/client/app-flow.ts` (`isAppNextInFlow(from: string, to: string): boolean`: true only from `/` to `/room/$code`)
- Modify: `src/routes/_app/route.tsx` (passes it to `AppShell`), `src/components/landing/start-form.tsx`, `src/components/room/room-screen.tsx`

- `StartForm`, on a successful create or a valid join code, calls `depart("create" | "join")` unless the gate or stage failed, then navigates after the same `LEAVE_MS` (420 ms; 0 with reduced motion) as `landing-form.tsx`. The timer lives in the form's ref callback and is cleared on unmount.
- The lobby's slot claims `pending`. If the room shows the join form or a closed state instead, `RoomScreen` claims a `lobby` slot anyway (the table behind the form), so `pending` always clears.

- [ ] **Step 1: e2e in `e2e/flight.e2e.ts`** (SwiftShader, full motion, as `game.e2e.ts`):

1. Create from `/`: `[data-stage-host]` passes through `data-stage="flying"` and settles on `lobby`; one canvas the whole time (the stage is never remounted).
2. Join by code from `/`: the same, landing on the join form with the table behind.
3. Reduced motion: settles on `lobby` with no `flying`.

```bash
git add -A && git commit -m "feat(lobby): the camera flies from the landing into the lobby"
```

### Task 1c.5: the picker and the portrait camera

**Files:**

- Modify: `src/components/three/scenes/table-shots.ts` (new `TableShot` `"portrait"`: a close, slightly low shot of the viewer's seat facing the figure), the lobby scene to accept a focus shot, `src/components/stage/stage-context.tsx` (a `shot?: "portrait"` on the lobby slot), `src/components/lobby/lobby-screen.tsx`, `src/client/use-avatar.ts`, `src/client/room-client.ts`

**Rules (from "Avatar picker" in the architecture doc):**

- "Your look" button by your seat opens the picker. The slot asks for `"portrait"`; closing returns to the lobby shot. Reduced motion cuts.
- Phone: a bottom sheet at most 50dvh, so the figure stays in view. Wide (1024px and up): a side panel.
- The draft is local state in `LobbyScreen`; your own figure on the stage shows the draft, everyone else's the saved look.
- Done, Escape and tapping outside all close and save: one `lobby:avatar` if `avatarKey(draft) !== avatarKey(saved)`, none otherwise. On a successful save, write `localStorage` (D17).
- `room:join` and `createRoom` send the saved look from `localStorage` only when one has been saved.
- When the view's stage stops being `lobby`, the picker closes and drops the draft.

- [ ] **Step 1: e2e in `e2e/lobby.e2e.ts`**

1. Guest opens "Your look", picks a cloak, presses Done: the host's `useStagePlayers` figure for the guest changes (assert through the tag layer's `data-look` or the scene's exposed seat list; pick whichever the stage already exposes in tests), and a second Done with no change sends nothing (count `lobby:avatar` frames with `page.on("websocket")`).
2. While the picker is open the stage reports the portrait shot (`data-stage-shot="portrait"` on the host element, added for this).
3. A reload keeps the look (from the room) and a new room gets the saved look on join.

```bash
git add -A && git commit -m "feat(lobby): the look picker with a portrait camera"
```

### Task 1c.6: the host-change notice

**Files:**

- Modify: `src/shared/copy.ts`, `src/shared/copy.test.ts` (create if missing), `src/client/room-client.ts`, `src/components/lobby/lobby-screen.tsx` and the room screen's game placeholder

**Interfaces:**

```ts
/** "Sam is now the host" or "You are now the host"; null when the host did not change or there is no earlier view. */
export function hostChangeNotice(
  before: RoomView | null,
  after: RoomView,
): string | null;
```

`RoomClient` keeps the last notice in its snapshot (`notice: string | null`), set from `hostChangeNotice(previous, next)` in `onState`, cleared by `dismissNotice()` and by the next notice. The screen shows it in a `role="status"` toast for 5 seconds, dismissed with a CSS animation end, not a timer. No sticky notice, the seat list's host marker is the lasting signal (D20).

- [ ] **Step 1: Table-driven unit tests**

| Before           | After          | Viewer | Expect                 |
| ---------------- | -------------- | ------ | ---------------------- |
| null             | host Wren      | Sam    | null                   |
| host Wren        | host Wren      | Sam    | null                   |
| host Wren        | host Sam       | Sam    | "You are now the host" |
| host Wren        | host Sam       | Ansel  | "Sam is now the host"  |
| host Wren        | host Sam       | Wren   | "Sam is now the host"  |
| lobby, host Wren | game, host Sam | Ansel  | "Sam is now the host"  |

- [ ] **Step 2: Implement and commit**

```bash
git add -A && git commit -m "feat(lobby): tell the table when the host changes"
```

### Task 1c.7: the five-context e2e and the restart check

**Files:**

- Modify: `e2e/lobby.e2e.ts`, `scripts/restart-check.mjs`

- [ ] **Step 1: Five contexts ready up**

Host creates; four guests join (each a `newPlayer` context, reduced motion on). After four joins Start is disabled and the status lists "Waiting for A, B, C and D to ready up." Each guest presses "I'm ready" in turn; after each, the host's message shrinks; after the last, Start is enabled and the list is empty. One guest un-readies: Start is disabled again. Timeout 120 s.

- [ ] **Step 2: Host-change notice in the browser**

In the same file: the host presses "Leave room" and confirms; the next guest sees "You are now the host" and the others "{name} is now the host" (D22). No test waits the 60 second away hand-over: the `state.ts` tables and `pnpm test:restart` cover it.

- [ ] **Step 3: The restart check gains ready states and looks**

Before the stop: the guest readies and picks a look. After the restart: the guest is still ready (host sees no `not_ready` message for them) and the host's view of the guest has the picked look.

Run: `pnpm build && pnpm test:e2e && pnpm test:restart`
Expected: pass.

```bash
git add -A && git commit -m "test: five players ready up; ready and looks survive a restart"
```

### Task 1c.8: screenshots, docs and the pull request

- [ ] **Step 1: Screenshots**

`e2e/app.shots.ts` adds the lobby (host and guest), the picker open, and the gate notice, at 390px and 1440px. Run `pnpm build && pnpm screenshots` and look at every image: no sideways scroll, touch targets, tokens only.

- [ ] **Step 2: Docs**

`docs/architecture.md`: Phase 1 marked built with the date; App structure (`src/components/lobby`, `src/client/webgl.ts`, `src/client/app-flow.ts`); Routes (`/room/$code` is on the stage); Testing table. `CLAUDE.md` Layout if a folder was added. `GLOSSARY.md` if a term changed.

- [ ] **Step 3: Full gate and the draft pull request**

Run: `pnpm check`
Expected: pass. Evidence: the checks table, the screenshots, a short GIF of the flight from `/` into the lobby (Playwright frames joined with `sharp`), and of the picker opening. Under "Not verified": real-phone performance, heat and sound (the map's Real-phone check was emulator only).
