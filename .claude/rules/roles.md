---
paths:
  - "src/server/**/*"
  - "src/shared/**/*"
---

# Role Definitions

The catalogue is implemented in `src/shared/roles.ts`. What each role learns is
computed on the server by `knowledgeFor` (`src/server/game/knowledge.ts`) and sent
to that player only, as `you.knowledge` in their `GameView`.

Good and Evil are shown with the `good` and `evil` design tokens, always together
with an icon or shape and a text label, never colour alone.

## Good roles

### Merlin (always in the game)

- Knows all Evil players **except Mordred**.
- Wins if Good completes 3 quests AND the Assassin fails to name him.
- Being too obvious hands Evil the win through the assassination.

### Percival (optional)

- Sees which players are Merlin and Morgana but **cannot tell them apart**.
- Must protect the real Merlin while Morgana tries to mislead him.
- Works best together with Morgana.

### Loyal Servant of Arthur (fills the remaining Good seats)

- No knowledge.

## Evil roles

### Assassin (always in the game)

- Knows the other Evil players (except Oberon).
- After Good completes 3 quests, names one player as Merlin. Correct: Evil wins.

### Minion of Mordred (fills the remaining Evil seats)

- Knows the other Evil players (except Oberon). No special power.

### Mordred (optional)

- Knows the other Evil players (except Oberon).
- **Hidden from Merlin.** Server: leave Mordred out of Merlin's `evilIds`.

### Morgana (optional)

- Knows the other Evil players (except Oberon).
- **Appears as Merlin to Percival.** Server: Percival's `merlinCandidateIds` holds
  Merlin and Morgana in seat order, with nothing to tell them apart.

### Oberon (optional)

- **No knowledge at all**, and the other Evil players do not know him.
- Server: leave Oberon out of every Evil player's `allyIds`, and give Oberon
  `{ kind: "none" }`. Merlin does see Oberon.

## Knowledge matrix

| Role              | `you.knowledge`                                | Seen by Merlin |
| ----------------- | ---------------------------------------------- | -------------- |
| Merlin            | `merlin`: Evil ids, without Mordred            | n/a            |
| Percival          | `percival`: Merlin and Morgana, not told apart | no             |
| Loyal Servant     | `none`                                         | no             |
| Assassin          | `evil`: other Evil ids, without Oberon         | yes            |
| Minion of Mordred | `evil`: other Evil ids, without Oberon         | yes            |
| Mordred           | `evil`: other Evil ids, without Oberon         | **no**         |
| Morgana           | `evil`: other Evil ids, without Oberon         | yes            |
| Oberon            | `none`                                         | yes            |

## Choosing roles for a game

- Evil seats: the Assassin plus the chosen Evil optional roles must not exceed the
  Evil count for the player count. If they do, the host cannot start
  (`too_many_evil_roles`). Remaining Evil seats are Minions.
- Good seats: Merlin, Percival if chosen, the rest Loyal Servants.
- The host may save any mix. The check runs against the seats at the time, on
  every view and again at Start, so a seat leaving can turn a valid mix into a
  blocker. With fewer than 5 seats there is no Evil count and no settings
  blocker (`too_few_players` covers it). The rule is `evilRoleCount` and
  `tooManyEvilRoles` in `src/shared/settings.ts`.
- Percival without Morgana (he sees only Merlin) and Morgana without Percival
  are allowed. The host settings show a settings hint, never a blocker.
