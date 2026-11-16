---
paths:
  - "src/server/**/*"
  - "src/shared/**/*"
---

# Game Rules

The tables below are implemented in `src/shared/constants.ts`. Keep the two in sync.

## Objective

- **Good wins** by completing 3 quests, if the Assassin then fails to name Merlin.
- **Evil wins** if 3 quests fail, OR 5 team proposals in a row are rejected, OR the
  Assassin correctly names Merlin after Good completes 3 quests.

## Player counts

| Players | Good | Evil |
| ------- | ---- | ---- |
| 5       | 3    | 2    |
| 6       | 4    | 2    |
| 7       | 4    | 3    |
| 8       | 5    | 3    |
| 9       | 6    | 3    |
| 10      | 6    | 4    |

## Quest team sizes

| Quest | 5p  | 6p  | 7p  | 8p  | 9p  | 10p |
| ----- | --- | --- | --- | --- | --- | --- |
| 1st   | 2   | 2   | 2   | 3   | 3   | 3   |
| 2nd   | 3   | 3   | 3   | 4   | 4   | 4   |
| 3rd   | 2   | 4   | 3   | 4   | 4   | 4   |
| 4th   | 3   | 3   | 4   | 5   | 5   | 5   |
| 5th   | 3   | 4   | 4   | 5   | 5   | 5   |

> **Special rule:** the 4th quest in games with 7 or more players needs **at least
> 2 Fail cards** to fail (`failsRequired`).

## Phases

The engine is a typed reducer (`src/server/game/engine.ts`), called by the room's
Durable Object, which saves the result after every action. The phase is a
discriminated union, `Phase`, mirrored for clients as `PhaseView` in
`src/shared/views.ts`.

```
lobby (no game state)
  → role_reveal            every player confirms they have seen their role
  → team_building          the leader drafts and proposes a team
  → team_vote
      → rejected, fewer than 5 in a row → team_building (leader moves clockwise)
      → 5th rejection in a row          → game_over (Evil wins)
      → approved                        → quest
  → quest                  team members play Success or Fail
      → 3 failed quests                 → game_over (Evil wins)
      → 3 successful quests             → assassination
      → otherwise                       → lady (if enabled, after quests 2, 3, 4) → team_building
  → assassination          the Assassin names Merlin → game_over
```

There are no separate "reveal" phases and no server timers. A finished vote is a
`ProposalRecord` in `proposals`; a finished quest is an entry in `quests`. Clients
animate the reveal when those lists grow.

## Team building

1. The leader proposes a team of the required size (they may include themselves).
2. All players vote Approve or Reject at the same time.
3. A strict majority of Approve sends the team on the quest. A tie or a majority of
   Reject fails the proposal.
4. The leader moves one seat clockwise after every vote, approved or not.
5. Track `rejections` (in a row, for the current quest). Reset to 0 on approval.
   The 5th rejection in a row means Evil wins at once.

## Quest

1. Each team member secretly plays Success or Fail.
2. Good players **must** play Success: the server refuses a Fail from a Good player.
   Evil players may play either.
3. When the last card is in, the server counts the Fail cards, keeps only the count
   and discards who played what. Clients are sent the count.
4. The quest fails if `failCount >= failsRequired`.

## Assassination

After Good completes 3 quests, Evil may talk it over out loud. The Assassin names
one player as Merlin. Correct: Evil wins. Wrong: Good wins. The candidates offered
to the Assassin are every player except the Assassin and the allies the Assassin
already knows (do not exclude Oberon, that would reveal him).

## Optional: Lady of the Lake

- Starts with the player to the first leader's right.
- After the 2nd, 3rd and 4th quest, the holder examines one other player's
  alignment (Good or Evil, not the role). Only the holder learns the result.
- The token passes to the examined player. A player who has held it cannot be
  examined. Used exactly 3 times per game. Best with 7 or more players.

## Protocol

Defined and typed in `src/shared/protocol.ts`, validated in
`src/shared/schemas.ts`. See "Protocol" in `docs/architecture.md` for the full
table.

- Creating a room is a server function, `createRoom` (`src/functions/rooms.ts`).
- Everything else is a request on the room's WebSocket (`/api/socket/CODE`):
  `room:join`, `room:resume`, `room:watch`, `room:leave`, `lobby:ready`,
  `lobby:settings`, `lobby:kick`, `lobby:start`, `game:action`, `room:reset`. Each is
  `{ id, event, payload }` and is answered by one `{ type: "ack", id, result }`.
- `game:action` carries a `GameAction`: `confirm_role`, `draft_team`,
  `propose_team`, `vote`, `play_card`, `lady_examine`, `assassinate`.
- The room pushes `{ type: "state", view }` (a full `RoomView` for that one player)
  and `{ type: "closed", reason }`. There are no partial updates and no message sent
  to every socket.
