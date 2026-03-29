---
paths:
  - "packages/server/src/**/*"
  - "packages/shared/src/**/*"
---

# Game Rules

## Objective
- **Good wins** by successfully completing 3 Quests.
- **Evil wins** if 3 Quests fail, OR 5 consecutive Team proposals are rejected, OR the
  Assassin correctly identifies Merlin after Good wins 3 Quests.

## Player Counts

| Players | Good | Evil |
|---|---|---|
| 5 | 3 | 2 |
| 6 | 4 | 2 |
| 7 | 4 | 3 |
| 8 | 5 | 3 |
| 9 | 6 | 3 |
| 10 | 6 | 4 |

## Quest Team Sizes

| Quest | 5p | 6p | 7p | 8p | 9p | 10p |
|---|---|---|---|---|---|---|
| 1st | 2 | 2 | 2 | 3 | 3 | 3 |
| 2nd | 3 | 3 | 3 | 4 | 4 | 4 |
| 3rd | 2 | 4 | 3 | 4 | 4 | 4 |
| 4th | 3 | 3 | 4 | 5 | 5 | 5 |
| 5th | 3 | 4 | 4 | 5 | 5 | 5 |

> **Special rule:** 4th Quest in 7+ player games requires **at least 2 Fail cards** to fail.

## XState Game Phases

```
LOBBY → ROLE_ASSIGNMENT → NIGHT_PHASE
  → TEAM_BUILDING → TEAM_VOTE
    → (rejected, <5 consecutive) → TEAM_BUILDING (leader advances clockwise)
    → (5 consecutive rejections) → EVIL_WINS
    → (approved)                 → QUEST_PHASE
      → QUEST_RESULT
        → (repeat until 3 wins or 3 fails)
        → (3 good wins) → ASSASSINATION_PHASE → FINAL_RESULT
        → (3 evil wins) → EVIL_WINS
```

## Team Building Phase
1. Leader proposes a team of the required size (may include themselves).
2. All players simultaneously vote Approve or Reject.
3. Majority Approve → Quest Phase. Tie or majority Reject → leader passes clockwise.
4. 5 consecutive rejections in one round → Evil wins immediately.
5. Track `consecutiveRejections` — reset to 0 on any approval.

## Quest Phase
1. Each team member secretly plays Success or Fail.
2. Good players **must** play Success. Evil players may play either.
3. Server shuffles cards before revealing count — individual contributions untraceable.
4. Quest fails if any Fail card played (except 4th Quest in 7+ players: requires `failCount >= 2`).

## Assassination Phase
After Good wins 3 Quests: Evil confers, Assassin names one Good player as Merlin.
Correct → Evil wins. Incorrect → Good wins.

## Optional — Lady of the Lake
- Held by the player to the Leader's right at game start.
- After 2nd, 3rd, and 4th Quest: holder examines one other player's loyalty.
- Token transfers to the examined player. A player who has used it cannot be targeted.
- Track `usedByPlayerIds`. Used exactly 3 times per game. Best for 7+ players.

## WebSocket Events — Client → Server

| Event | Payload | Who sends it |
|---|---|---|
| `join_room` | `{ roomCode, playerName }` | Any player |
| `update_settings` | `{ characters[], ladyOfLake }` | Host only |
| `player_ready` | — | Any player |
| `start_game` | — | Host only |
| `propose_team` | `{ playerIds[] }` | Current leader |
| `vote_team` | `{ vote: 'approve' \| 'reject' }` | All players simultaneously |
| `play_quest_card` | `{ card: 'success' \| 'fail' }` | Quest team members |
| `assassinate` | `{ targetPlayerId }` | Assassin only |
| `lady_examine` | `{ targetPlayerId }` | Lady of the Lake holder |

## WebSocket Events — Server → Client

| Event | Delivery | Purpose |
|---|---|---|
| `room_updated` | Broadcast | Player joined, settings changed |
| `role_assigned` | **Private per socket** | Role + filtered knowledge |
| `phase_changed` | Broadcast | New game phase |
| `team_proposed` | Broadcast | Leader submitted a team |
| `vote_revealed` | Broadcast | All votes shown simultaneously |
| `quest_result` | Broadcast | Success/fail + fail card count |
| `consecutive_rejections` | Broadcast | Vote track updated (1–5) |
| `assassination_phase` | Broadcast | Evil players confer |
| `game_over` | Broadcast | Winner + full role reveal |
