# Starlit: the game at the 3D Star Table

Status: draft for approval. Prototype only (`/design/starlit`), no real rooms.

## Intent

The landing and lobby now share one full-screen 3D Star Table with each
player's customised avatar. The owner wants the game itself to stay in that
scene: the same table, the same avatars, through the role reveal and every
step of a round. The scene acts the game out; the game's information sits on
top in panels that can be collapsed so the table stays visible.

Success: Start in the lobby flows, with no cut, into the role card and then
the table, and each of the five table steps reads at a glance from the scene
plus the tags over heads, at 390px and 1440px.

## Goals

- Role reveal and the five table steps (propose, vote, reveal, quest,
  result) happen on the shared stage, over the 3D table.
- The scene acts it out (owner's choice):
  - the proposed team glows, joined by lines of light;
  - each player's state shows over their head (crown, chosen, voted,
    approve or reject, played, away);
  - the leader picks the team by tapping avatars.
- Quests and Vote history are collapsible panels with a one-line summary when
  closed (same `Disclosure` as the lobby).
- Role reveal is a card over the scene with today's press-and-hold: hidden
  until pressed, closes on release (owner: preserve exactly).

## Non-goals

- Real rooms, the protocol or the server. Mock `GameView`s only.
- New rules, roles or steps. Same five steps, same mock data.
- Changing the landing or lobby (approved).
- Making the Star Table the default landing hero.

## Anti-goals

- The scene revealing secret information. While the role card is held, the
  scene stays neutral: no marks over the heads of players you know (owner:
  card only). Names stay on the card.
- Votes visible before everyone has voted. Tags show only Voted or Waiting
  until the reveal.
- Meaning by colour alone. Every glow, tag state and card has an icon and a
  word.
- A flat page with a 3D wallpaper. If the scene does not carry the step, it
  has failed even if the panels work.

## Constraints

- Project rules: tokens only, icon plus word, 44px targets, reduced motion,
  strict TS, Prettier, Playwright evidence, three.js not in the Worker bundle.
- Privacy rules for the role card come from `useHoldToReveal`
  (`src/client/use-hold-to-reveal.ts`), already used by `role/sky-card.tsx`.
- Without WebGL (or after a stage failure, which is sticky) every screen shows
  today's flat version: `SeatRing`, `RoleScreen` as it is now.
- `tableViews`, `roleViews`, `voteReveal`, `questReveal` in
  `src/design/mock.ts` stay the data.

## Approaches considered

- **A. Extend the shared stage (picked).** Add `role` and `table` modes to the
  stage and the Star Table scene. Camera shot per step, 3D glow, team lines
  and cards; tags over heads stay HTML, so they can be buttons and are read
  by screen readers. One continuous camera move from lobby to role to table.
  Cost: the largest build; `star-table.ts` (726 lines) must be split.
- B. A separate 3D game scene. Simpler to isolate, but a cut between lobby
  and game breaks the continuity the owner asked for, and duplicates seating.
- C. A still 3D backdrop with today's flat `SeatRing` on top. Cheapest; does
  not act anything out, so it misses the owner's choice.

## Design (decided)

### Flow

`/design/starlit/lobby` → Start → `/role/$variant` → Continue →
`/table/propose` → … → `/table/result` → loops to propose. The `Stage` lives
in the Starlit layout, so it stays mounted across these routes; each screen
claims it with `useStageSlot` and sets the players with `useStagePlayers`, as
the lobby does now. Moving between them is a camera move, not a reload.
Direct load of any of these URLs starts settled at that shot, no flight.

### Role reveal

- Camera settles low behind your seat, looking across the table. Everyone
  is seated.
- A face-down card (the existing `SkyCard` cloud curtain) sits over the scene.
  Press and hold opens it; release closes it. Same text, same names, same
  `useHoldToReveal`.
- The scene does not change while held (anti-goal above).
- "Continue to the table" is enabled after the first hold (proposal, see
  below). Continue pulls the camera up to the table shot.

### The table, per step

| Step    | Scene                                                                        | Tags over heads                    | Action bar                                  |
| ------- | ---------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------- |
| propose | high table shot; leader's ring lit; picked figures glow, lines join the team | crown on leader; star + "Chosen"   | "Propose this team" when full               |
| vote    | team keeps glowing                                                           | "Voted" or "Waiting" only          | Approve, Reject; then "Your vote is locked" |
| reveal  | all tags flip at once                                                        | Approve (sun) or Reject, with word | outcome line, Continue                      |
| quest   | camera draws in on the team                                                  | team: "Played" or "Waiting"        | on team: Success, Fail cards; else waiting  |
| result  | cards land face down on the table centre, turn over one at a time            | team stays lit                     | outcome, Continue                           |

- **Picking:** when you lead, each tag is a `button` with `aria-pressed`, at
  least 44 by 44px. Tapping toggles the pick, with the same sounds as now
  (`useTeamDraft`, `pick`, `unpick`, `team-complete`).
- **Picking from a list:** a "Team" list in the action area does the same
  thing, for players whose figure is hidden behind the table.
- **When someone else leads:** the tags are not buttons, and their picks
  appear (mock: the `draftIds` already in the view).

### Panels

- Same overlay layout as the lobby: a bottom sheet on a phone, a 26rem rail on
  wide screens. The header shows "Quest 3 · Team vote", the title and one
  line, as today's `headingFor`.
- **Quests** (`QuestTrack` and `Scoreboard`) is a `Disclosure`. Closed summary
  example: "Good 1, Evil 1 · Quest 3 needs 3 · 1 of 5 rejected".
- **Vote history** (`VoteHistory`) is a `Disclosure`. Closed summary example:
  "Last: rejected 4 to 3".
- **Defaults:** on wide screens Quests opens and Vote history is closed. On a
  phone both are closed. The action bar and step panel are always visible.
- **Role:** a "Your role" hold button sits in the header on every table step.
  It is the same hold-to-reveal and opens the role card over the scene.

### Who sits at the table (owner: fixed seven)

The game is always the fixed seven-player mock. You take Wren's seat with the
name you typed in the lobby (Wren if none) and your avatar from `useAvatar`;
the other six keep their mock names and `avatarFor(id)` looks. If the lobby
held more or fewer than seven, figures rise or sink during the move to the
role card until there are seven. Direct loads start with the seven settled.
Accepted cost: lobby guests may become different people at the table.

## Builder-check calls (mine)

- Tapping the 3D figure picks it (owner asked for "tap avatars"): raycast
  against the figures, a hit area of at least 44px at phone scale, and a drag
  that turns the camera is never a tap. The tag is the same button, and the
  Team list covers figures hidden behind the table.
- Start always goes to your own card (`role/merlin`, seen as you). The
  Assassin variant is reachable only by its direct link, settled; its
  Continue fades to the table rather than flying, since it is another seat.

## Left to the builder (my proposals, change if needed)

- **Camera:**
  - The exact numbers for each shot. They are tuned separately for phone and
    wide screens, the same way the lobby's lens is.
  - Moves take about 1.2s, eased, using the stage's existing timing.
  - With reduced motion, moves cut instead.
- **Split `star-table.ts`:**
  - The clearing and props stay where they are.
  - New `table-play.ts` holds the team glow, the lines, the cards on the table and each shot.
- **Engine API:**
  - `StageSlot.mode` gains `"role" | "table"`.
  - The scene takes a `TableState`: `{ step, leaderId, teamIds, seatMarks, cards }`, set via `useStageTable`. This parallels `useStagePlayers`.
  - The tags get the seat marks from React, not from the engine. The engine only positions them.
- **Tags:**
  - They grow from the lobby `NameTag` into a `SeatTag`, with the same icon and label set as `SeatRing`'s `STATUS`.
  - Tags must not overlap the action area. Clamp them to the focus rect, as now.
- **Fallback:** when `status === "failed"` or there is no WebGL, render today's `TableScreen` and `RoleScreen` unchanged.
- **Continue unlocks after the first hold:** a proposal, so that nobody skips seeing their role.
- **Avatars:** your avatar comes from `useAvatar`, everyone else's from `avatarFor(id)`, as in the lobby.
- **Tests:**
  - e2e for:
    - picking by tag;
    - votes hidden until the reveal;
    - opening and closing the panels;
    - the role card hidden until held and closing on release;
    - reduced motion;
    - the no-WebGL fallback.
  - Screenshots for every step at 390px and 1440px.
  - A GPU video of the lobby, role, propose and vote run.
